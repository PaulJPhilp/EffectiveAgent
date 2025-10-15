import { Duration, Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { EffectiveError } from "@/errors.js";
import { ResilienceService } from "../service.js";
import {
    type CircuitBreakerConfig,
    CircuitBreakerError,
    type FallbackStrategy,
    RetryExhaustedError,
    type RetryPolicy
} from "../types.js";

// Test error types
class NetworkError extends EffectiveError {
    readonly _tag = "NetworkError";
    constructor(message: string) {
        super({
            description: message,
            module: "TestNetwork",
            method: "connect"
        });
    }
}

class ValidationError extends EffectiveError {
    readonly _tag = "ValidationError";
    constructor(message: string) {
        super({
            description: message,
            module: "TestValidation",
            method: "validate"
        });
    }
}

describe("ResilienceService", () => {
    // Create explicit dependency layer following centralized pattern
    const resilienceServiceTestLayer = ResilienceService.Default;

    describe("Circuit Breaker Pattern", () => {
        it("should allow operations when circuit is closed", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const config: CircuitBreakerConfig = {
                    name: "test-circuit",
                    failureThreshold: 3,
                    resetTimeout: Duration.seconds(5),
                    halfOpenMaxAttempts: 2
                };

                const successOperation = Effect.succeed("success");

                const result = yield* service.withCircuitBreaker(successOperation, config);
                expect(result).toBe("success");

                // Check circuit breaker metrics
                const metrics = yield* service.getCircuitBreakerMetrics("test-circuit");
                expect(metrics?.state).toBe("CLOSED");
                expect(metrics?.successCount).toBe(1);
                expect(metrics?.totalRequests).toBe(1);
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            ));

        it("should open circuit after failure threshold", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const config: CircuitBreakerConfig = {
                    name: "test-circuit-failure",
                    failureThreshold: 2,
                    resetTimeout: Duration.seconds(5),
                    halfOpenMaxAttempts: 2
                };

                const failingOperation = Effect.fail(new NetworkError("Connection failed"));

                // First failure
                const result1 = yield* Effect.either(
                    service.withCircuitBreaker(failingOperation, config)
                );
                expect(Either.isLeft(result1)).toBe(true);

                // Second failure - should open circuit
                const result2 = yield* Effect.either(
                    service.withCircuitBreaker(failingOperation, config)
                );
                expect(Either.isLeft(result2)).toBe(true);

                // Third attempt - should fail with CircuitBreakerError
                const result3 = yield* Effect.either(
                    service.withCircuitBreaker(Effect.succeed("test"), config)
                );
                expect(Either.isLeft(result3)).toBe(true);
                if (Either.isLeft(result3)) {
                    expect(result3.left).toBeInstanceOf(CircuitBreakerError);
                }

                // Check metrics
                const metrics = yield* service.getCircuitBreakerMetrics("test-circuit-failure");
                expect(metrics?.state).toBe("OPEN");
                expect(metrics?.totalFailures).toBe(2);
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            ));

        it("should reset circuit breaker", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const config: CircuitBreakerConfig = {
                    name: "test-circuit-reset",
                    failureThreshold: 1,
                    resetTimeout: Duration.seconds(1),
                    halfOpenMaxAttempts: 2
                };

                // Cause failure to open circuit
                yield* Effect.either(
                    service.withCircuitBreaker(
                        Effect.fail(new NetworkError("Failure")),
                        config
                    )
                );

                let metrics = yield* service.getCircuitBreakerMetrics("test-circuit-reset");
                expect(metrics?.state).toBe("OPEN");

                // Reset circuit breaker
                yield* service.resetCircuitBreaker("test-circuit-reset");

                metrics = yield* service.getCircuitBreakerMetrics("test-circuit-reset");
                expect(metrics?.state).toBe("CLOSED");
                expect(metrics?.failureCount).toBe(0);
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            ));
    });

    describe("Retry Mechanisms", () => {
        it("should retry retryable operations", () => {
            let attemptCount = 0;

            const retryableOperation = Effect.gen(function* () {
                attemptCount++;
                if (attemptCount < 3) {
                    return yield* Effect.fail(new NetworkError("Temporary failure"));
                }
                return "success after retries";
            });

            const policy: RetryPolicy = {
                maxAttempts: 5,
                baseDelay: Duration.millis(10),
                maxDelay: Duration.millis(100),
                backoffMultiplier: 2,
                jitter: false,
                retryableErrors: ["NetworkError"],
                nonRetryableErrors: []
            };

            return Effect.gen(function* () {
                const service = yield* ResilienceService;
                const result = yield* service.withRetry(retryableOperation, policy);

                expect(result).toBe("success after retries");
                expect(attemptCount).toBe(3);
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            );
        });

        it("should not retry non-retryable operations", () => {
            let attemptCount = 0;

            const nonRetryableOperation = Effect.gen(function* () {
                attemptCount++;
                return yield* Effect.fail(new ValidationError("Invalid input"));
            });

            const policy: RetryPolicy = {
                maxAttempts: 5,
                baseDelay: Duration.millis(10),
                maxDelay: Duration.millis(100),
                backoffMultiplier: 2,
                jitter: false,
                retryableErrors: ["NetworkError"],
                nonRetryableErrors: ["ValidationError"]
            };

            return Effect.gen(function* () {
                const service = yield* ResilienceService;
                const result = yield* Effect.either(
                    service.withRetry(nonRetryableOperation, policy)
                );

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(RetryExhaustedError);
                }
                expect(attemptCount).toBe(1);
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            );
        });

        it("should exhaust retries and return RetryExhaustedError", () => {
            let attemptCount = 0;

            const alwaysFailingOperation = Effect.gen(function* () {
                attemptCount++;
                return yield* Effect.fail(new NetworkError("Persistent failure"));
            });

            const policy: RetryPolicy = {
                maxAttempts: 3,
                baseDelay: Duration.millis(10),
                maxDelay: Duration.millis(100),
                backoffMultiplier: 2,
                jitter: false,
                retryableErrors: ["NetworkError"],
                nonRetryableErrors: []
            };

            return Effect.gen(function* () {
                const service = yield* ResilienceService;
                const result = yield* Effect.either(
                    service.withRetry(alwaysFailingOperation, policy)
                );

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(RetryExhaustedError);
                }
                expect(attemptCount).toBe(3);
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            );
        });
    });

    describe("Fallback Strategies", () => {
        it("should use fallback when primary operation fails", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const primaryOperation = Effect.fail(new NetworkError("Primary failed"));

                const fallbackStrategies: ReadonlyArray<FallbackStrategy<string>> = [
                    {
                        name: "cache-fallback",
                        priority: 1,
                        condition: (error) => error instanceof NetworkError,
                        handler: Effect.succeed("cached-result")
                    }
                ];

                const result = yield* service.withFallback(primaryOperation, fallbackStrategies);
                expect(result).toBe("cached-result");

                // Check that fallback was used
                const metrics = yield* service.getResilienceMetrics("fallback-operation");
                expect(metrics?.fallbackUsed).toBe(true);
                expect(metrics?.successes).toBe(1);
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            ));

        it("should try multiple fallback strategies in priority order", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const primaryOperation = Effect.fail(new NetworkError("Primary failed"));

                const fallbackStrategies: ReadonlyArray<FallbackStrategy<string>> = [
                    {
                        name: "first-fallback",
                        priority: 1,
                        condition: (error) => error instanceof NetworkError,
                        handler: Effect.fail(new NetworkError("First fallback also failed"))
                    },
                    {
                        name: "second-fallback",
                        priority: 2,
                        condition: (error) => error instanceof NetworkError,
                        handler: Effect.succeed("second-fallback-result")
                    }
                ];

                const result = yield* service.withFallback(primaryOperation, fallbackStrategies);
                expect(result).toBe("second-fallback-result");
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            ));

        it("should respect fallback strategy conditions", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const primaryOperation = Effect.fail(new ValidationError("Validation failed"));

                const fallbackStrategies: ReadonlyArray<FallbackStrategy<string>> = [
                    {
                        name: "network-only-fallback",
                        priority: 1,
                        condition: (error) => error instanceof NetworkError,
                        handler: Effect.succeed("should-not-be-used")
                    }
                ];

                const result = yield* Effect.either(
                    service.withFallback(primaryOperation, fallbackStrategies)
                );

                // Should fail because ValidationError doesn't match NetworkError condition
                expect(Either.isLeft(result)).toBe(true);
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            ));
    });

    describe("Error Classification", () => {
        it("should classify network errors as retryable", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const networkError = new NetworkError("Connection timeout");
                const classification = service.classifyError(networkError);

                expect(classification.isRetryable).toBe(true);
                expect(classification.category).toBe("NETWORK");
                expect(classification.severity).toBe("MEDIUM");
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            ));

        it("should classify validation errors as non-retryable", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const validationError = new ValidationError("Invalid input format");
                const classification = service.classifyError(validationError);

                expect(classification.isRetryable).toBe(false);
                expect(classification.category).toBe("VALIDATION");
                expect(classification.severity).toBe("LOW");
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            ));

        it("should classify rate limit errors with suggested delay", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const rateLimitError = new EffectiveError({
                    description: "Rate limit exceeded",
                    module: "API",
                    method: "call"
                });

                const classification = service.classifyError(rateLimitError);

                expect(classification.isRetryable).toBe(true);
                expect(classification.category).toBe("RATE_LIMIT");
                expect(classification.suggestedDelay).toBeDefined();
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            ));
    });

    describe("Recovery Metrics", () => {
        it("should track recovery metrics", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const config: CircuitBreakerConfig = {
                    name: "metrics-test",
                    failureThreshold: 5,
                    resetTimeout: Duration.seconds(5),
                    halfOpenMaxAttempts: 2
                };

                // Successful operation
                yield* service.withCircuitBreaker(Effect.succeed("success"), config);

                // Failed operation
                yield* Effect.either(
                    service.withCircuitBreaker(
                        Effect.fail(new NetworkError("failure")),
                        config
                    )
                );

                const metrics = yield* service.getCircuitBreakerMetrics("metrics-test");
                expect(metrics).toBeDefined();
                expect(metrics!.totalRequests).toBe(2);
                expect(metrics!.totalFailures).toBe(1);
                expect(metrics!.successCount).toBe(1);
                expect(metrics!.failureCount).toBe(1);
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            ));

        it("should track retry metrics", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const policy: RetryPolicy = {
                    maxAttempts: 3,
                    baseDelay: Duration.millis(1),
                    maxDelay: Duration.millis(10),
                    backoffMultiplier: 2,
                    jitter: false,
                    retryableErrors: [],
                    nonRetryableErrors: []
                };

                yield* service.withRetry(Effect.succeed("success"), policy);

                const metrics = yield* service.getResilienceMetrics("retry-operation");
                expect(metrics).toBeDefined();
                expect(metrics!.successes).toBeGreaterThan(0);
                expect(metrics!.attempts).toBeGreaterThan(0);
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            ));
    });

    describe("Integration Scenarios", () => {
        it("should combine circuit breaker with retry and fallback", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                let callCount = 0;
                const unreliableOperation = Effect.gen(function* () {
                    callCount++;
                    if (callCount < 4) {
                        return yield* Effect.fail(new NetworkError("Service unavailable"));
                    }
                    return "finally succeeded";
                });

                const circuitConfig: CircuitBreakerConfig = {
                    name: "integration-test",
                    failureThreshold: 2,
                    resetTimeout: Duration.millis(50),
                    halfOpenMaxAttempts: 1
                };

                const retryPolicy: RetryPolicy = {
                    maxAttempts: 3,
                    baseDelay: Duration.millis(1),
                    maxDelay: Duration.millis(10),
                    backoffMultiplier: 2,
                    jitter: false,
                    retryableErrors: ["NetworkError"],
                    nonRetryableErrors: []
                };

                const fallbackStrategies: ReadonlyArray<FallbackStrategy<string>> = [
                    {
                        name: "cached-response",
                        priority: 1,
                        condition: (error) => error instanceof CircuitBreakerError,
                        handler: Effect.succeed("cached-data")
                    }
                ];

                // First, let's make the circuit breaker open
                yield* Effect.either(
                    service.withCircuitBreaker(
                        service.withRetry(unreliableOperation, retryPolicy),
                        circuitConfig
                    )
                );

                // Now try with fallback - should use cached data due to open circuit
                const result = yield* service.withFallback(
                    service.withCircuitBreaker(Effect.succeed("test"), circuitConfig),
                    fallbackStrategies
                );

                expect(result).toBe("cached-data");
            }).pipe(
                Effect.provide(resilienceServiceTestLayer)
            ));
    });
}); 