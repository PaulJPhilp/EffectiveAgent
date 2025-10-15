import { Duration, Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { EffectiveError } from "@/errors.js";
import { ResilienceService } from "../service.js";
import {
    type CircuitBreakerConfig,
    CircuitBreakerError,
    type FallbackStrategy,
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

class TimeoutError extends EffectiveError {
    readonly _tag = "TimeoutError";
    constructor(message: string) {
        super({
            description: message,
            module: "TestTimeout",
            method: "execute"
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

describe("Error Recovery Integration Tests", () => {
    const resilienceServiceTestLayer = ResilienceService.Default;

    describe("Circuit Breaker State Transitions", () => {
        it("should handle complete circuit breaker lifecycle", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const config: CircuitBreakerConfig = {
                    name: "lifecycle-test",
                    failureThreshold: 2,
                    resetTimeout: Duration.millis(100),
                    halfOpenMaxAttempts: 1
                };

                // Initial state should be CLOSED
                let metrics = yield* service.getCircuitBreakerMetrics("lifecycle-test");
                expect(metrics?.state).toBe("CLOSED");

                // Cause failures to open circuit
                const failingOperation = Effect.fail(new NetworkError("Service unavailable"));

                yield* Effect.either(
                    service.withCircuitBreaker(failingOperation, config)
                );
                yield* Effect.either(
                    service.withCircuitBreaker(failingOperation, config)
                );

                // Verify OPEN state
                metrics = yield* service.getCircuitBreakerMetrics("lifecycle-test");
                expect(metrics?.state).toBe("OPEN");
                expect(metrics?.failureCount).toBe(2);

                // Wait for reset timeout
                yield* Effect.sleep(Duration.millis(150));

                // First attempt after timeout should transition to HALF_OPEN
                const successOperation = Effect.succeed("success");
                yield* service.withCircuitBreaker(successOperation, config);

                metrics = yield* service.getCircuitBreakerMetrics("lifecycle-test");
                expect(metrics?.state).toBe("CLOSED");
                expect(metrics?.failureCount).toBe(0);

                // Verify metrics are tracking properly
                expect(metrics?.totalRequests).toBe(3);
                expect(metrics?.totalFailures).toBe(2);
                expect(metrics?.successCount).toBe(1);
            }).pipe(Effect.provide(resilienceServiceTestLayer))
        );

        it("should enforce maximum attempts in HALF_OPEN state", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const config: CircuitBreakerConfig = {
                    name: "half-open-test",
                    failureThreshold: 2,
                    resetTimeout: Duration.millis(50),
                    halfOpenMaxAttempts: 1
                };

                // Open the circuit
                const failingOperation = Effect.fail(new NetworkError("Service unavailable"));
                yield* Effect.either(service.withCircuitBreaker(failingOperation, config));
                yield* Effect.either(service.withCircuitBreaker(failingOperation, config));

                // Wait for reset timeout
                yield* Effect.sleep(Duration.millis(100));

                // First attempt should be allowed in HALF_OPEN
                const result1 = yield* Effect.either(
                    service.withCircuitBreaker(Effect.succeed("test1"), config)
                );
                expect(Either.isRight(result1)).toBe(true);

                // Second attempt should be rejected due to halfOpenMaxAttempts
                const result2 = yield* Effect.either(
                    service.withCircuitBreaker(Effect.succeed("test2"), config)
                );
                expect(Either.isLeft(result2)).toBe(true);
                if (Either.isLeft(result2)) {
                    expect(result2.left).toBeInstanceOf(CircuitBreakerError);
                }
            }).pipe(Effect.provide(resilienceServiceTestLayer))
        );
    });

    describe("Retry with Exponential Backoff", () => {
        it("should respect backoff delays", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;
                const startTime = Date.now();

                const policy: RetryPolicy = {
                    maxAttempts: 3,
                    baseDelay: Duration.millis(50),
                    maxDelay: Duration.millis(200),
                    backoffMultiplier: 2,
                    jitter: false,
                    retryableErrors: ["NetworkError"],
                    nonRetryableErrors: []
                };

                // Operation that always fails
                const operation = Effect.fail(new NetworkError("Temporary failure"));

                yield* Effect.either(service.withRetry(operation, policy));

                const totalTime = Date.now() - startTime;
                // Should be at least baseDelay + (baseDelay * backoffMultiplier)
                expect(totalTime).toBeGreaterThanOrEqual(150);

                const metrics = yield* service.getResilienceMetrics("retry-operation");
                expect(metrics?.attempts).toBe(3);
                expect(metrics?.failures).toBe(3);
            }).pipe(Effect.provide(resilienceServiceTestLayer))
        );

        it("should handle mixed error types correctly", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;
                let attemptCount = 0;

                const mixedErrorOperation = Effect.gen(function* () {
                    attemptCount++;
                    if (attemptCount === 1) return yield* Effect.fail(new NetworkError("Network error"));
                    if (attemptCount === 2) return yield* Effect.fail(new TimeoutError("Timeout error"));
                    if (attemptCount === 3) return yield* Effect.fail(new ValidationError("Validation error"));
                    return "success";
                });

                const policy: RetryPolicy = {
                    maxAttempts: 4,
                    baseDelay: Duration.millis(10),
                    maxDelay: Duration.millis(100),
                    backoffMultiplier: 2,
                    jitter: false,
                    retryableErrors: ["NetworkError", "TimeoutError"],
                    nonRetryableErrors: ["ValidationError"]
                };

                const result = yield* Effect.either(
                    service.withRetry(mixedErrorOperation, policy)
                );

                expect(Either.isLeft(result)).toBe(true);
                expect(attemptCount).toBe(3); // Should stop at ValidationError

                const metrics = yield* service.getResilienceMetrics("retry-operation");
                expect(metrics?.attempts).toBe(3);
                expect(metrics?.failures).toBe(3);
            }).pipe(Effect.provide(resilienceServiceTestLayer))
        );
    });

    describe("Advanced Fallback Scenarios", () => {
        it("should chain multiple fallback strategies with timeouts", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const fallbackStrategies: ReadonlyArray<FallbackStrategy<string>> = [
                    {
                        name: "primary-cache",
                        priority: 1,
                        condition: (error) => error instanceof NetworkError,
                        handler: Effect.fail(new TimeoutError("Cache timeout")),
                        timeout: Duration.millis(50)
                    },
                    {
                        name: "secondary-cache",
                        priority: 2,
                        condition: (error) => error instanceof TimeoutError,
                        handler: Effect.succeed("backup-data"),
                        timeout: Duration.millis(100)
                    }
                ];

                const failingOperation = Effect.fail(new NetworkError("Primary failed"));
                const result = yield* service.withFallback(failingOperation, fallbackStrategies);
                expect(result).toBe("backup-data");

                const metrics = yield* service.getResilienceMetrics("fallback-operation");
                expect(metrics?.fallbackUsed).toBe(true);
                expect(metrics?.attempts).toBeGreaterThan(0);
                expect(metrics?.successes).toBe(1);
                expect(metrics?.failures).toBe(1); // From primary cache failure
            }).pipe(Effect.provide(resilienceServiceTestLayer))
        );
    });

    describe("Complex Recovery Chains", () => {
        it("should handle nested recovery patterns", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const circuitConfig: CircuitBreakerConfig = {
                    name: "complex-chain",
                    failureThreshold: 2,
                    resetTimeout: Duration.millis(50),
                    halfOpenMaxAttempts: 1
                };

                const retryPolicy: RetryPolicy = {
                    maxAttempts: 2,
                    baseDelay: Duration.millis(10),
                    maxDelay: Duration.millis(50),
                    backoffMultiplier: 2,
                    jitter: true,
                    retryableErrors: ["NetworkError"],
                    nonRetryableErrors: []
                };

                const fallbackStrategies: ReadonlyArray<FallbackStrategy<string>> = [
                    {
                        name: "degraded-mode",
                        priority: 1,
                        condition: (error) => error instanceof CircuitBreakerError,
                        handler: Effect.succeed("degraded-response")
                    }
                ];

                let attempts = 0;
                const unreliableOperation = Effect.gen(function* () {
                    attempts++;
                    return yield* Effect.fail(new NetworkError("Service unstable"));
                });

                // Chain: Circuit Breaker -> Retry -> Fallback
                const result = yield* service.withFallback(
                    service.withCircuitBreaker(
                        service.withRetry(unreliableOperation, retryPolicy),
                        circuitConfig
                    ),
                    fallbackStrategies
                );

                expect(result).toBe("degraded-response");
                expect(attempts).toBe(4); // 2 attempts * 2 failures to open circuit

                // Verify circuit breaker metrics
                const cbMetrics = yield* service.getCircuitBreakerMetrics("complex-chain");
                expect(cbMetrics?.state).toBe("OPEN");
                expect(cbMetrics?.totalFailures).toBe(2);

                // Verify retry metrics
                const retryMetrics = yield* service.getResilienceMetrics("retry-operation");
                expect(retryMetrics?.attempts).toBeGreaterThan(0);
                expect(retryMetrics?.failures).toBeGreaterThan(0);

                // Verify fallback metrics
                const fallbackMetrics = yield* service.getResilienceMetrics("fallback-operation");
                expect(fallbackMetrics?.fallbackUsed).toBe(true);
                expect(fallbackMetrics?.successes).toBe(1);
            }).pipe(Effect.provide(resilienceServiceTestLayer))
        );
    });

    describe("Circuit Breaker Race Conditions", () => {
        it("should maintain state consistency during concurrent operations", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const config: CircuitBreakerConfig = {
                    name: "race-test",
                    failureThreshold: 3,
                    resetTimeout: Duration.millis(100),
                    halfOpenMaxAttempts: 2
                };

                // Create array of concurrent operations
                const failingOp = Effect.fail(new NetworkError("Service unavailable"));
                const successOp = Effect.succeed("success");

                // Run multiple operations concurrently near the failure threshold
                const concurrentOps = Effect.all([
                    service.withCircuitBreaker(failingOp, config),
                    service.withCircuitBreaker(failingOp, config),
                    service.withCircuitBreaker(successOp, config),
                    service.withCircuitBreaker(failingOp, config)
                ], { concurrency: "unbounded" });

                yield* Effect.either(concurrentOps);

                // Verify state consistency
                const metrics = yield* service.getCircuitBreakerMetrics("race-test");
                expect(metrics?.failureCount).toBeLessThanOrEqual(config.failureThreshold);
                expect([metrics?.state === "OPEN", metrics?.state === "CLOSED"]).toContain(true);
            }).pipe(Effect.provide(resilienceServiceTestLayer))
        );

        it("should handle concurrent requests during HALF_OPEN state", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const config: CircuitBreakerConfig = {
                    name: "half-open-race",
                    failureThreshold: 2,
                    resetTimeout: Duration.millis(50),
                    halfOpenMaxAttempts: 3
                };

                // Open the circuit
                const failingOp = Effect.fail(new NetworkError("Service unavailable"));
                yield* Effect.either(service.withCircuitBreaker(failingOp, config));
                yield* Effect.either(service.withCircuitBreaker(failingOp, config));

                // Wait for reset timeout to enter HALF_OPEN state
                yield* Effect.sleep(Duration.millis(100));

                // Run concurrent requests during HALF_OPEN state
                const successOp = Effect.succeed("success");
                const concurrentOps = Effect.all(
                    Array.from({ length: 5 }, () =>
                        service.withCircuitBreaker(successOp, config)
                    ),
                    { concurrency: "unbounded" }
                );

                const results = yield* Effect.either(concurrentOps);

                // Verify that only halfOpenMaxAttempts succeeded
                const metrics = yield* service.getCircuitBreakerMetrics("half-open-race");
                expect(metrics?.successCount).toBeLessThanOrEqual(config.halfOpenMaxAttempts);

                if (Either.isRight(results)) {
                    const successfulResults = results.right.filter(result => result === "success");
                    expect(successfulResults.length).toBeLessThanOrEqual(config.halfOpenMaxAttempts);
                }
            }).pipe(Effect.provide(resilienceServiceTestLayer))
        );

        it("should handle concurrent reset timeouts", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const config: CircuitBreakerConfig = {
                    name: "reset-race",
                    failureThreshold: 2,
                    resetTimeout: Duration.millis(50),
                    halfOpenMaxAttempts: 1
                };

                // Open the circuit
                const failingOp = Effect.fail(new NetworkError("Service unavailable"));
                yield* Effect.either(service.withCircuitBreaker(failingOp, config));
                yield* Effect.either(service.withCircuitBreaker(failingOp, config));

                // Wait just before reset timeout
                yield* Effect.sleep(Duration.millis(45));

                // Run concurrent operations right around reset timeout
                const operations = Effect.all([
                    Effect.sleep(Duration.millis(10)).pipe(
                        Effect.zipRight(service.withCircuitBreaker(Effect.succeed("late"), config))
                    ),
                    service.withCircuitBreaker(Effect.succeed("early"), config),
                    Effect.sleep(Duration.millis(5)).pipe(
                        Effect.zipRight(service.withCircuitBreaker(Effect.succeed("mid"), config))
                    )
                ], { concurrency: "unbounded" });

                yield* Effect.either(operations);

                // Verify state consistency
                const metrics = yield* service.getCircuitBreakerMetrics("reset-race");
                expect(metrics?.state === "CLOSED" || metrics?.state === "HALF_OPEN").toBe(true);
                expect(metrics?.successCount).toBeLessThanOrEqual(config.halfOpenMaxAttempts);
            }).pipe(Effect.provide(resilienceServiceTestLayer))
        );

        it("should maintain accurate metrics during high concurrency", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;

                const config: CircuitBreakerConfig = {
                    name: "metrics-race",
                    failureThreshold: 5,
                    resetTimeout: Duration.millis(100),
                    halfOpenMaxAttempts: 2
                };

                // Generate mix of failing and successful operations
                const operations = Array.from({ length: 20 }, (_, i) => {
                    return i % 3 === 0
                        ? service.withCircuitBreaker(Effect.fail(new NetworkError("fail")), config)
                        : service.withCircuitBreaker(Effect.succeed("success"), config);
                });

                // Run them all concurrently
                yield* Effect.either(Effect.all(operations, { concurrency: "unbounded" }));

                // Verify metrics consistency
                const metrics = yield* service.getCircuitBreakerMetrics("metrics-race");
                expect(metrics?.totalRequests).toBe(20);
                expect(metrics?.totalRequests).toBe(
                    (metrics?.successCount ?? 0) + (metrics?.totalFailures ?? 0)
                );

                // Verify state is consistent with metrics
                if (metrics && metrics.failureCount >= config.failureThreshold) {
                    expect(metrics.state).toBe("OPEN");
                } else if (metrics) {
                    expect(metrics.state).toBe("CLOSED");
                }
            }).pipe(Effect.provide(resilienceServiceTestLayer))
        );
    });

    describe("Concurrent Access Patterns", () => {
        it("should handle concurrent recovery chains with shared resources", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;
                let sharedResourceCount = 0;

                const config: CircuitBreakerConfig = {
                    name: "shared-resource",
                    failureThreshold: 3,
                    resetTimeout: Duration.millis(50),
                    halfOpenMaxAttempts: 2
                };

                const retryPolicy: RetryPolicy = {
                    maxAttempts: 2,
                    baseDelay: Duration.millis(10),
                    maxDelay: Duration.millis(50),
                    backoffMultiplier: 2,
                    jitter: true,
                    retryableErrors: ["NetworkError"],
                    nonRetryableErrors: []
                };

                // Simulate operation that updates shared resource
                const sharedOperation = Effect.gen(function* () {
                    if (Math.random() > 0.5) {
                        return yield* Effect.fail(new NetworkError("Resource busy"));
                    }
                    sharedResourceCount++;
                    return sharedResourceCount;
                });

                // Create multiple concurrent recovery chains
                const concurrentOperations = Effect.all(
                    Array.from({ length: 10 }, () =>
                        service.withCircuitBreaker(
                            service.withRetry(sharedOperation, retryPolicy),
                            config
                        )
                    ),
                    { concurrency: "unbounded" }
                );

                const results = yield* Effect.either(concurrentOperations);

                // Verify shared resource consistency
                expect(sharedResourceCount).toBeLessThanOrEqual(10);
                expect(sharedResourceCount).toBeGreaterThan(0);

                // Verify circuit breaker handled the load
                const metrics = yield* service.getCircuitBreakerMetrics("shared-resource");
                expect(metrics?.totalRequests).toBe(10);
                expect(metrics?.state === "OPEN" || metrics?.state === "CLOSED").toBe(true);
            }).pipe(Effect.provide(resilienceServiceTestLayer))
        );

        it("should maintain fallback chain ordering under concurrent load", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;
                const executionOrder: string[] = [];

                const fallbackStrategies: ReadonlyArray<FallbackStrategy<string>> = [
                    {
                        name: "primary",
                        priority: 1,
                        condition: (error) => error instanceof NetworkError,
                        handler: Effect.gen(function* () {
                            executionOrder.push("primary");
                            return yield* Effect.fail(new TimeoutError("Primary timeout"));
                        }),
                        timeout: Duration.millis(50)
                    },
                    {
                        name: "secondary",
                        priority: 2,
                        condition: (error) => error instanceof TimeoutError,
                        handler: Effect.gen(function* () {
                            executionOrder.push("secondary");
                            return yield* Effect.succeed("secondary-result");
                        }),
                        timeout: Duration.millis(100)
                    }
                ];

                // Run multiple fallback chains concurrently
                const concurrentFallbacks = Effect.all(
                    Array.from({ length: 5 }, () =>
                        service.withFallback(
                            Effect.fail(new NetworkError("Initial failure")),
                            fallbackStrategies
                        )
                    ),
                    { concurrency: "unbounded" }
                );

                const results = yield* concurrentFallbacks;

                // Verify all operations completed with secondary fallback
                expect(results).toHaveLength(5);
                expect(results.every(r => r === "secondary-result")).toBe(true);

                // Verify execution order maintained priority
                const pairs = [];
                for (let i = 0; i < executionOrder.length; i += 2) {
                    if (executionOrder[i] && executionOrder[i + 1]) {
                        pairs.push([executionOrder[i], executionOrder[i + 1]]);
                    }
                }
                expect(pairs.every(([first, second]) =>
                    first === "primary" && second === "secondary"
                )).toBe(true);

                // Verify metrics
                const metrics = yield* service.getResilienceMetrics("fallback-operation");
                expect(metrics?.fallbackUsed).toBe(true);
                expect(metrics?.attempts).toBeGreaterThan(0);
            }).pipe(Effect.provide(resilienceServiceTestLayer))
        );

        it("should handle interleaved retry and circuit breaker operations", () =>
            Effect.gen(function* () {
                const service = yield* ResilienceService;
                const operationLog: Array<{ type: string, timestamp: number }> = [];

                const config: CircuitBreakerConfig = {
                    name: "interleaved-test",
                    failureThreshold: 3,
                    resetTimeout: Duration.millis(50),
                    halfOpenMaxAttempts: 2
                };

                const retryPolicy: RetryPolicy = {
                    maxAttempts: 3,
                    baseDelay: Duration.millis(20),
                    maxDelay: Duration.millis(100),
                    backoffMultiplier: 2,
                    jitter: false,
                    retryableErrors: ["NetworkError", "TimeoutError"],
                    nonRetryableErrors: []
                };

                // Create two types of operations that will interleave
                const retryOperation = Effect.gen(function* () {
                    operationLog.push({ type: "retry", timestamp: Date.now() });
                    return yield* Effect.fail(new NetworkError("Retry needed"));
                });

                const circuitOperation = Effect.gen(function* () {
                    operationLog.push({ type: "circuit", timestamp: Date.now() });
                    return yield* Effect.fail(new TimeoutError("Circuit test"));
                });

                // Run both types of operations concurrently
                const mixedOperations = Effect.all([
                    service.withRetry(retryOperation, retryPolicy),
                    service.withCircuitBreaker(circuitOperation, config),
                    service.withRetry(retryOperation, retryPolicy),
                    service.withCircuitBreaker(circuitOperation, config),
                    service.withRetry(retryOperation, retryPolicy)
                ], { concurrency: "unbounded" });

                yield* Effect.either(mixedOperations);

                // Verify operations were truly interleaved
                const timestamps = operationLog.map(log => log.timestamp);
                const timeDiffs = timestamps.slice(1).map((time, i) => time - timestamps[i]);

                // Check that some operations happened very close together (interleaved)
                expect(timeDiffs.some(diff => diff < 10)).toBe(true);

                // Verify both types of operations were executed
                expect(operationLog.filter(log => log.type === "retry").length).toBeGreaterThan(0);
                expect(operationLog.filter(log => log.type === "circuit").length).toBeGreaterThan(0);

                // Check metrics for both systems
                const retryMetrics = yield* service.getResilienceMetrics("retry-operation");
                const circuitMetrics = yield* service.getCircuitBreakerMetrics("interleaved-test");

                expect(retryMetrics?.attempts).toBeGreaterThan(0);
                expect(circuitMetrics?.totalRequests).toBeGreaterThan(0);
            }).pipe(Effect.provide(resilienceServiceTestLayer))
        );
    });
});
