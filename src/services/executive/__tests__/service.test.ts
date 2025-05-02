import { describe, it, expect } from "vitest";
import { Effect, Either } from "effect";
import { ExecutiveService } from "../index.js";
import { createMockAiResponse, mockSuccess } from "@/services/test-harness/utils/typed-mocks.js";

describe("ExecutiveService Test Suite", () => {
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
        expect(result.left.message).toBe("Attempt 2 failed");
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
        expect(result.left.message).toBe("Operation aborted");
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
        expect(result.left.description).toContain("Token limit exceeded");
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
        expect(result2.left.description).toContain("Token limit exceeded");
      }
    }).pipe(Effect.provide(ExecutiveService.Default))
  );
});

