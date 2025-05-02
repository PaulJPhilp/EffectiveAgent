import { describe, it, expect } from "vitest";
import { Effect, Either } from "effect";
import { ExecutiveService } from "../index.js";
import { ExecutiveServiceError, AuthError, RateLimitError } from "../errors.js";
import type { AiResponse } from "@effect/ai/AiResponse";
import { createMockAiResponse, mockSuccess } from "@/services/test-harness/utils/typed-mocks.js";
import type { AuditEvent, AuditLogger, AuthContext, AuthValidator, AuthValidationResult } from "../api.js";
import { InMemoryRateLimiter } from "../rate-limiter.js";

function isExecutiveServiceError(error: unknown): error is ExecutiveServiceError {
  return error instanceof ExecutiveServiceError;
}

describe("ExecutiveService Test Suite", () => {
  class TestAuthValidator implements AuthValidator {
    constructor(
      private readonly shouldValidate: boolean = true,
      private readonly errorType?: "unauthorized" | "forbidden" | "invalid_token"
    ) {}

    validate(auth: AuthContext): Effect.Effect<AuthValidationResult, never, never> {
      return Effect.succeed({
        valid: this.shouldValidate,
        errorType: this.shouldValidate ? undefined : this.errorType ?? "unauthorized",
        errorMessage: this.shouldValidate ? undefined : "Auth validation failed"
      });
    }
  }
  class TestAuditLogger implements AuditLogger {
    events: AuditEvent[] = [];
    logEvent(event: AuditEvent) {
      this.events.push(event);
      return Effect.succeed(void 0);
    }
  }
  it("should return the result of the provided Effect", () =>
    Effect.gen(function* (_) {
      const testValue = 42;
      const testEffect = Effect.succeed(testValue);
      const service = yield* ExecutiveService;
      const result = yield* service.execute(testEffect);
      if (result !== testValue) {
        throw new Error(`Expected ${testValue}, got ${result}`);
      }
    }).pipe(Effect.provide(ExecutiveService.Default))
  );

  it("should retry failed effects up to maxAttempts", () =>
    Effect.gen(function* (_) {
      let attempts = 0;
      const failingEffect = Effect.gen(function* () {
        attempts++;
        if (attempts < 3) {
          throw new Error("Temporary failure");
        }
        return "success";
      });

      const service = yield* ExecutiveService;
      const result = yield* service.execute(failingEffect, {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 100
      });

      expect(attempts).toBe(3);
      expect(result).toBe("success");
    }).pipe(Effect.provide(ExecutiveService.Default))
  );

  it("should fail after exhausting all retries", () =>
    Effect.gen(function* (_) {
      let attempts = 0;
      const failingEffect = Effect.gen(function* () {
        attempts++;
        throw new Error(`Attempt ${attempts} failed`);
      });

      const service = yield* ExecutiveService;

      const result = yield* Effect.either(service.execute(failingEffect, {
        maxAttempts: 2,
        baseDelayMs: 10,
        maxDelayMs: 100
      }));

      expect(attempts).toBe(2);
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left;
        expect(isExecutiveServiceError(error)).toBe(true);
        if (isExecutiveServiceError(error)) {
          expect(error.description).toBe("Attempt 2 failed");
        }
      }
    }).pipe(Effect.provide(ExecutiveService.Default))
  );

  it("should abort operation when signal is triggered", () =>
    Effect.gen(function* (_) {
      let attempts = 0;
      const slowEffect = Effect.gen(function* () {
        attempts++;
        yield* Effect.sleep("100 millis");
        return "success";
      });

      const service = yield* ExecutiveService;
      const controller = new AbortController();

      // Schedule abort after 50ms
      setTimeout(() => controller.abort(), 50);

      const result = yield* Effect.either(service.execute(slowEffect, {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
        signal: controller.signal
      }));

      expect(attempts).toBe(1);
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left;
        expect(isExecutiveServiceError(error)).toBe(true);
        if (isExecutiveServiceError(error)) {
          expect(error.description).toBe("Operation interrupted");
        }
      }
    }).pipe(Effect.provide(ExecutiveService.Default))
  );

  it("should enforce token limits across retries", () =>
    Effect.gen(function* (_) {
      let attempts = 0;

      const mockResponse = createMockAiResponse("test response");
      const tokenEffect = mockSuccess(mockResponse);

      const service = yield* ExecutiveService;
      const result = yield* Effect.either(service.execute(tokenEffect, {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
        maxCumulativeTokens: 40
      }));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left;
        expect(isExecutiveServiceError(error)).toBe(true);
        if (isExecutiveServiceError(error)) {
          expect(error.description).toContain("Token limit exceeded");
        }
      }
    }).pipe(Effect.provide(ExecutiveService.Default))
  );

  it("should enforce token limits across multiple executions", () =>
    Effect.gen(function* (_) {
      const service = yield* ExecutiveService;

      // First execution
      const mockResponse1 = createMockAiResponse("first response");
      const result1 = yield* service.execute(mockSuccess(mockResponse1), {
        maxAttempts: 1,
        baseDelayMs: 10,
        maxDelayMs: 100,
        maxCumulativeTokens: 50
      });

      expect(result1.text).toBe("first response");

      // Second execution should fail due to token limit
      const mockResponse2 = createMockAiResponse("second response");
      const result2 = yield* Effect.either(service.execute(mockSuccess(mockResponse2), {
        maxAttempts: 1,
        baseDelayMs: 10,
        maxDelayMs: 100,
        maxCumulativeTokens: 50
      }));

      expect(Either.isLeft(result2)).toBe(true);
      if (Either.isLeft(result2)) {
        const error = result2.left;
        expect(isExecutiveServiceError(error)).toBe(true);
        if (isExecutiveServiceError(error)) {
          expect(error.description).toContain("Token limit exceeded");
        }
      }
    }).pipe(Effect.provide(ExecutiveService.Default))
  );

  it("should log audit events for execution lifecycle", () =>
    Effect.gen(function* () {
      const testValue = 42;
      const testEffect = Effect.succeed(testValue);
      const service = yield* ExecutiveService;
      const auditLogger = new TestAuditLogger();

      const result = yield* service.execute(testEffect, {
        auditLogger,
        retry: {
          maxAttempts: 1,
          baseDelayMs: 10,
          maxDelayMs: 100,
          jitterFactor: 0.1,
          useExponentialBackoff: true
        }
      });

      expect(result).toBe(testValue);
      expect(auditLogger.events).toHaveLength(2);

      // Check execution_started event
      const startEvent = auditLogger.events[0];
      expect(startEvent.eventType).toBe("execution_started");
      expect(startEvent.details).toMatchObject({
        retryConfig: {
          maxAttempts: 1,
          baseDelayMs: 10,
          maxDelayMs: 100,
          jitterFactor: 0.1,
          useExponentialBackoff: true
        }
      });

      // Check execution_completed event
      const completeEvent = auditLogger.events[1];
      expect(completeEvent.eventType).toBe("execution_completed");
      expect(completeEvent.details).toMatchObject({
        result: testValue
      });
    }).pipe(Effect.provide(ExecutiveService.Default))
  );

  it("should validate auth when validator is provided", () =>
    Effect.gen(function* () {
      const testValue = 42;
      const testEffect = Effect.succeed(testValue);
      const service = yield* ExecutiveService;
      const auditLogger = new TestAuditLogger();
      const authValidator = new TestAuthValidator(true);

      const result = yield* service.execute(testEffect, {
        auditLogger,
        authValidator,
        auth: {
          userId: "test-user",
          roles: ["user"],
          permissions: ["read"]
        }
      });

      expect(result).toBe(testValue);
      expect(auditLogger.events).toHaveLength(3); // start, auth, complete

      // Check auth validation event
      const authEvent = auditLogger.events[1];
      expect(authEvent.eventType).toBe("policy_checked");
      expect(authEvent.details).toMatchObject({
        type: "auth",
        userId: "test-user",
        roles: ["user"],
        permissions: ["read"]
      });
    }).pipe(Effect.provide(ExecutiveService.Default))
  );

  it("should fail when auth validation fails", () =>
    Effect.gen(function* () {
      const testValue = 42;
      const testEffect = Effect.succeed(testValue);
      const service = yield* ExecutiveService;
      const authValidator = new TestAuthValidator(false, "forbidden");

      const result = yield* Effect.either(service.execute(testEffect, {
        authValidator,
        auth: {
          userId: "test-user",
          roles: ["user"],
          permissions: ["read"]
        }
      }));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left;
        expect(error).toBeInstanceOf(AuthError);
        if (error instanceof AuthError) {
          expect(error.errorType).toBe("forbidden");
          expect(error.description).toBe("Auth validation failed");
        }
      }
    }).pipe(Effect.provide(ExecutiveService.Default))
  );

  it("should fail when auth validator is provided but auth context is missing", () =>
    Effect.gen(function* () {
      const testValue = 42;
      const testEffect = Effect.succeed(testValue);
      const service = yield* ExecutiveService;
      const authValidator = new TestAuthValidator(true);

      const result = yield* Effect.either(service.execute(testEffect, {
        authValidator
        // No auth context provided
      }));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left;
        expect(error).toBeInstanceOf(AuthError);
        if (error instanceof AuthError) {
          expect(error.errorType).toBe("unauthorized");
          expect(error.description).toBe("Auth context is required when auth validator is provided");
        }
      }
    }).pipe(Effect.provide(ExecutiveService.Default))
  );

  it("should enforce rate limits", () =>
    Effect.gen(function* () {
      const testValue = 42;
      const testEffect = Effect.succeed(testValue);
      const service = yield* ExecutiveService;
      const auditLogger = new TestAuditLogger();
      const rateLimiter = new InMemoryRateLimiter(2, 1000, 100); // 2 requests per second, min 100ms between requests

      // First request should succeed
      const result1 = yield* service.execute(testEffect, {
        auditLogger,
        rateLimiter,
        rateLimit: {
          maxRequests: 2,
          windowMs: 1000,
          minInterval: 100
        },
        auth: { userId: "test-user" }
      });
      expect(result1).toBe(testValue);

      // Second request should succeed
      const result2 = yield* service.execute(testEffect, {
        auditLogger,
        rateLimiter,
        rateLimit: {
          maxRequests: 2,
          windowMs: 1000,
          minInterval: 100
        },
        auth: { userId: "test-user" }
      });
      expect(result2).toBe(testValue);

      // Third request should fail
      const result3 = yield* Effect.either(service.execute(testEffect, {
        auditLogger,
        rateLimiter,
        rateLimit: {
          maxRequests: 2,
          windowMs: 1000,
          minInterval: 100
        },
        auth: { userId: "test-user" }
      }));

      expect(Either.isLeft(result3)).toBe(true);
      if (Either.isLeft(result3)) {
        const error = result3.left;
        expect(error).toBeInstanceOf(RateLimitError);
      }

      // Check audit logs
      const rateLimitEvents = auditLogger.events.filter(
        e => e.details?.['type'] === "rate_limit"
      );
      expect(rateLimitEvents).toHaveLength(3);
      expect(rateLimitEvents[2].details).toMatchObject({
        key: "test-user",
        currentCount: 2,
        maxRequests: 2,
        windowMs: 1000
      });
    }).pipe(Effect.provide(ExecutiveService.Default))
  );

  it("should apply exponential backoff with jitter", () =>
    Effect.gen(function* (_) {
      const retryTimes: number[] = [];
      let lastAttemptTime = Date.now();
      let attempts = 0;

      const failingEffect = Effect.gen(function* () {
        const now = Date.now();
        if (attempts > 0) {
          retryTimes.push(now - lastAttemptTime);
        }
        lastAttemptTime = now;
        attempts++;
        throw new Error(`Attempt ${attempts} failed`);
      });

      const service = yield* ExecutiveService;
      const result = yield* Effect.either(service.execute(failingEffect, {
        retry: {
          maxAttempts: 4,
          baseDelayMs: 100,
          maxDelayMs: 1000,
          jitterFactor: 0.1,
          useExponentialBackoff: true
        }
      }));

      // Should have attempted 4 times
      expect(attempts).toBe(4);
      
      // Should have 3 retry delays recorded
      expect(retryTimes.length).toBe(3);

      // Verify exponential growth with jitter
      for (let i = 0; i < retryTimes.length; i++) {
        const expectedBase = 100 * Math.pow(2, i);
        const minDelay = expectedBase;
        const maxDelay = expectedBase * 1.1; // 10% jitter

        expect(retryTimes[i]).toBeGreaterThanOrEqual(minDelay);
        expect(retryTimes[i]).toBeLessThanOrEqual(maxDelay);
      }

      // Verify it failed after all retries
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left;
        expect(isExecutiveServiceError(error)).toBe(true);
        if (isExecutiveServiceError(error)) {
          expect(error.description).toBe("Attempt 4 failed");
        }
      }
    }).pipe(Effect.provide(ExecutiveService.Default))
  );
});
