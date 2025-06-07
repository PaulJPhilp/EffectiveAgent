import { EffectiveError } from "@/errors.js";
import { Duration, Effect, HashMap, Ref, Schedule } from "effect";
import {
    CircuitBreakerConfig,
    CircuitBreakerError,
    CircuitBreakerState,
    ErrorClassification,
    ErrorRecoveryServiceApi,
    FallbackStrategy,
    RetryExhaustedError,
    RetryPolicy
} from "./types.js";

interface CircuitBreakerInternalState {
    readonly state: CircuitBreakerState;
    readonly failureCount: number;
    readonly successCount: number;
    readonly lastFailureTime: number;
    readonly lastStateChange: number;
    readonly totalRequests: number;
    readonly totalFailures: number;
}

interface RecoveryInternalMetrics {
    readonly attempts: number;
    readonly successes: number;
    readonly failures: number;
    readonly fallbackUsed: boolean;
    readonly totalLatency: number;
    readonly lastRecoveryTime: number;
}

/**
 * Enhanced error recovery service implementation
 */
export class ErrorRecoveryService extends Effect.Service<ErrorRecoveryServiceApi>()("ErrorRecoveryService", {
    effect: Effect.gen(function* () {
        // Circuit breaker state management
        const circuitBreakers = yield* Ref.make(
            HashMap.empty<string, Ref.Ref<CircuitBreakerInternalState>>()
        );

        // Recovery metrics tracking
        const recoveryMetrics = yield* Ref.make(
            HashMap.empty<string, Ref.Ref<RecoveryInternalMetrics>>()
        );

        // Helper function to get or create circuit breaker state
        const getCircuitBreakerState = (name: string, config: CircuitBreakerConfig) =>
            Effect.gen(function* () {
                const breakers = yield* Ref.get(circuitBreakers);
                const existing = HashMap.get(breakers, name);

                if (existing) {
                    return existing;
                }

                const newState = yield* Ref.make<CircuitBreakerInternalState>({
                    state: "CLOSED",
                    failureCount: 0,
                    successCount: 0,
                    lastFailureTime: 0,
                    lastStateChange: Date.now(),
                    totalRequests: 0,
                    totalFailures: 0
                });

                yield* Ref.update(circuitBreakers, HashMap.set(name, newState));
                return newState;
            });

        // Helper function to get or create recovery metrics
        const getRecoveryMetricsState = (operationName: string) =>
            Effect.gen(function* () {
                const metrics = yield* Ref.get(recoveryMetrics);
                const existing = HashMap.get(metrics, operationName);

                if (existing) {
                    return existing;
                }

                const newMetrics = yield* Ref.make<RecoveryInternalMetrics>({
                    attempts: 0,
                    successes: 0,
                    failures: 0,
                    fallbackUsed: false,
                    totalLatency: 0,
                    lastRecoveryTime: 0
                });

                yield* Ref.update(recoveryMetrics, HashMap.set(operationName, newMetrics));
                return newMetrics;
            });

        // Circuit breaker state transition logic
        const updateCircuitBreakerState = (
            stateRef: Ref.Ref<CircuitBreakerInternalState>,
            config: CircuitBreakerConfig,
            success: boolean
        ) =>
            Effect.gen(function* () {
                const now = Date.now();

                yield* Ref.update(stateRef, state => ({
                    ...state,
                    totalRequests: state.totalRequests + 1,
                    ...(success
                        ? {
                            successCount: state.successCount + 1,
                            failureCount: state.state === "HALF_OPEN" ? 0 : state.failureCount,
                            state: state.state === "HALF_OPEN" ? "CLOSED" : state.state,
                            lastStateChange: state.state === "HALF_OPEN" ? now : state.lastStateChange
                        }
                        : {
                            failureCount: state.failureCount + 1,
                            totalFailures: state.totalFailures + 1,
                            lastFailureTime: now,
                            state: state.failureCount + 1 >= config.failureThreshold ? "OPEN" : state.state,
                            lastStateChange: state.failureCount + 1 >= config.failureThreshold ? now : state.lastStateChange
                        })
                }));
            });

        // Check if circuit breaker should transition from OPEN to HALF_OPEN
        const checkCircuitBreakerReset = (
            stateRef: Ref.Ref<CircuitBreakerInternalState>,
            config: CircuitBreakerConfig
        ) =>
            Effect.gen(function* () {
                const state = yield* Ref.get(stateRef);
                const now = Date.now();

                if (
                    state.state === "OPEN" &&
                    now - state.lastStateChange >= Duration.toMillis(config.resetTimeout)
                ) {
                    yield* Ref.update(stateRef, s => ({
                        ...s,
                        state: "HALF_OPEN",
                        lastStateChange: now
                    }));
                    return true;
                }

                return false;
            });

        // Error classification logic
        const classifyError = (error: EffectiveError): ErrorClassification => {
            // Network-related errors
            if (error.description.toLowerCase().includes("network") ||
                error.description.toLowerCase().includes("connection") ||
                error.description.toLowerCase().includes("timeout")) {
                return {
                    isRetryable: true,
                    severity: "MEDIUM",
                    category: "NETWORK",
                    suggestedDelay: Duration.seconds(2)
                };
            }

            // Authentication errors
            if (error.description.toLowerCase().includes("auth") ||
                error.description.toLowerCase().includes("unauthorized") ||
                error.description.toLowerCase().includes("forbidden")) {
                return {
                    isRetryable: false,
                    severity: "HIGH",
                    category: "AUTHENTICATION"
                };
            }

            // Rate limit errors
            if (error.description.toLowerCase().includes("rate limit") ||
                error.description.toLowerCase().includes("too many requests")) {
                return {
                    isRetryable: true,
                    severity: "MEDIUM",
                    category: "RATE_LIMIT",
                    suggestedDelay: Duration.seconds(10)
                };
            }

            // Validation errors
            if (error.description.toLowerCase().includes("validation") ||
                error.description.toLowerCase().includes("invalid")) {
                return {
                    isRetryable: false,
                    severity: "LOW",
                    category: "VALIDATION"
                };
            }

            // System errors
            if (error.description.toLowerCase().includes("system") ||
                error.description.toLowerCase().includes("internal")) {
                return {
                    isRetryable: true,
                    severity: "HIGH",
                    category: "SYSTEM",
                    suggestedDelay: Duration.seconds(5)
                };
            }

            // Default classification
            return {
                isRetryable: false,
                severity: "MEDIUM",
                category: "UNKNOWN"
            };
        };

        // Create retry schedule based on policy
        const createRetrySchedule = (policy: RetryPolicy) => {
            let schedule = Schedule.exponential(policy.baseDelay, policy.backoffMultiplier).pipe(
                Schedule.upTo(policy.maxDelay),
                Schedule.compose(Schedule.recurs(policy.maxAttempts - 1))
            );

            if (policy.jitter) {
                schedule = schedule.pipe(Schedule.jittered);
            }

            return schedule;
        };

        // Check if error should be retried
        const shouldRetryError = (error: EffectiveError, policy: RetryPolicy): boolean => {
            const errorName = error.constructor.name;

            // Check non-retryable errors first
            if (policy.nonRetryableErrors.includes(errorName)) {
                return false;
            }

            // Check retryable errors
            if (policy.retryableErrors.length > 0) {
                return policy.retryableErrors.includes(errorName);
            }

            // Use classification if no specific rules
            const classification = classifyError(error);
            return classification.isRetryable;
        };

        return {
            withCircuitBreaker: <A, E extends EffectiveError, R>(
                operation: Effect.Effect<A, E, R>,
                config: CircuitBreakerConfig
            ) =>
                Effect.gen(function* () {
                    const stateRef = yield* getCircuitBreakerState(config.name, config);
                    const state = yield* Ref.get(stateRef);

                    // Check if we should reset from OPEN to HALF_OPEN
                    yield* checkCircuitBreakerReset(stateRef, config);
                    const currentState = yield* Ref.get(stateRef);

                    // If circuit is OPEN, fail immediately
                    if (currentState.state === "OPEN") {
                        return yield* Effect.fail(
                            new CircuitBreakerError({
                                circuitBreakerName: config.name,
                                state: "OPEN"
                            }) as E | CircuitBreakerError
                        );
                    }

                    // If HALF_OPEN, limit concurrent requests
                    if (currentState.state === "HALF_OPEN" &&
                        currentState.totalRequests - currentState.totalFailures >= config.halfOpenMaxAttempts) {
                        return yield* Effect.fail(
                            new CircuitBreakerError({
                                circuitBreakerName: config.name,
                                state: "HALF_OPEN"
                            }) as E | CircuitBreakerError
                        );
                    }

                    // Execute operation and handle result
                    const result = yield* Effect.either(operation);

                    if (result._tag === "Right") {
                        yield* updateCircuitBreakerState(stateRef, config, true);
                        return result.right;
                    } else {
                        yield* updateCircuitBreakerState(stateRef, config, false);
                        return yield* Effect.fail(result.left);
                    }
                }),

            withRetry: <A, E extends EffectiveError, R>(
                operation: Effect.Effect<A, E, R>,
                policy: RetryPolicy
            ) =>
                Effect.gen(function* () {
                    const metricsRef = yield* getRecoveryMetricsState("retry-operation");
                    const startTime = Date.now();
                    let attempts = 0;
                    let lastError: E | undefined;

                    const retrySchedule = createRetrySchedule(policy);

                    const retryableOperation = Effect.gen(function* () {
                        attempts++;
                        yield* Ref.update(metricsRef, m => ({ ...m, attempts: m.attempts + 1 }));

                        const result = yield* Effect.either(operation);

                        if (result._tag === "Right") {
                            const endTime = Date.now();
                            yield* Ref.update(metricsRef, m => ({
                                ...m,
                                successes: m.successes + 1,
                                totalLatency: m.totalLatency + (endTime - startTime),
                                lastRecoveryTime: endTime
                            }));
                            return result.right;
                        } else {
                            lastError = result.left;
                            yield* Ref.update(metricsRef, m => ({ ...m, failures: m.failures + 1 }));

                            if (shouldRetryError(result.left, policy)) {
                                return yield* Effect.fail(result.left);
                            } else {
                                return yield* Effect.fail(new RetryExhaustedError({
                                    operationName: "retry-operation",
                                    attempts,
                                    lastError: result.left
                                }) as E);
                            }
                        }
                    });

                    const finalResult = yield* Effect.either(
                        retryableOperation.pipe(
                            Effect.retry(
                                retrySchedule.pipe(
                                    Schedule.whileInput((error: E) => shouldRetryError(error, policy))
                                )
                            )
                        )
                    );

                    if (finalResult._tag === "Left") {
                        if (attempts >= policy.maxAttempts && lastError) {
                            return yield* Effect.fail(new RetryExhaustedError({
                                operationName: "retry-operation",
                                attempts,
                                lastError
                            }) as E);
                        }
                        return yield* Effect.fail(finalResult.left);
                    }

                    return finalResult.right;
                }),

            withFallback: <A, E extends EffectiveError, R>(
                operation: Effect.Effect<A, E, R>,
                strategies: ReadonlyArray<FallbackStrategy<A>>
            ) =>
                Effect.gen(function* () {
                    const metricsRef = yield* getRecoveryMetricsState("fallback-operation");
                    const startTime = Date.now();

                    // Try primary operation first
                    const primaryResult = yield* Effect.either(operation);

                    if (primaryResult._tag === "Right") {
                        const endTime = Date.now();
                        yield* Ref.update(metricsRef, m => ({
                            ...m,
                            successes: m.successes + 1,
                            totalLatency: m.totalLatency + (endTime - startTime),
                            lastRecoveryTime: endTime
                        }));
                        return primaryResult.right;
                    }

                    // Sort strategies by priority and try each one
                    const sortedStrategies = [...strategies].sort((a, b) => a.priority - b.priority);
                    let lastError = primaryResult.left;
                    let strategiesAttempted = 0;

                    for (const strategy of sortedStrategies) {
                        if (strategy.condition(lastError)) {
                            strategiesAttempted++;

                            const strategyEffect = strategy.timeout
                                ? strategy.handler.pipe(Effect.timeout(strategy.timeout))
                                : strategy.handler;

                            const strategyResult = yield* Effect.either(strategyEffect);

                            if (strategyResult._tag === "Right") {
                                const endTime = Date.now();
                                yield* Ref.update(metricsRef, m => ({
                                    ...m,
                                    successes: m.successes + 1,
                                    fallbackUsed: true,
                                    totalLatency: m.totalLatency + (endTime - startTime),
                                    lastRecoveryTime: endTime
                                }));
                                return strategyResult.right;
                            } else {
                                lastError = strategyResult.left;
                                yield* Ref.update(metricsRef, m => ({ ...m, failures: m.failures + 1 }));
                            }
                        }
                    }

                    // All strategies failed
                    return yield* Effect.succeed(lastError as never); // This will never execute due to return type
                }),

            classifyError,

            getCircuitBreakerMetrics: (name: string) =>
                Effect.gen(function* () {
                    const breakers = yield* Ref.get(circuitBreakers);
                    const stateRefOpt = HashMap.get(breakers, name);

                    if (stateRefOpt._tag === "None") {
                        return undefined;
                    }

                    const state = yield* Ref.get(stateRefOpt.value);
                    return {
                        state: state.state,
                        failureCount: state.failureCount,
                        successCount: state.successCount,
                        lastFailureTime: state.lastFailureTime,
                        lastStateChange: state.lastStateChange,
                        totalRequests: state.totalRequests,
                        totalFailures: state.totalFailures
                    };
                }),

            getRecoveryMetrics: (operationName: string) =>
                Effect.gen(function* () {
                    const metrics = yield* Ref.get(recoveryMetrics);
                    const metricsRefOpt = HashMap.get(metrics, operationName);

                    if (metricsRefOpt._tag === "None") {
                        return undefined;
                    }

                    const state = yield* Ref.get(metricsRefOpt.value);
                    return {
                        operationName,
                        attempts: state.attempts,
                        successes: state.successes,
                        failures: state.failures,
                        fallbackUsed: state.fallbackUsed,
                        averageLatency: state.successes > 0 ? state.totalLatency / state.successes : 0,
                        lastRecoveryTime: state.lastRecoveryTime
                    };
                }),

            resetCircuitBreaker: (name: string) =>
                Effect.gen(function* () {
                    const breakers = yield* Ref.get(circuitBreakers);
                    const stateRefOpt = HashMap.get(breakers, name);

                    if (stateRefOpt._tag === "Some") {
                        yield* Ref.update(stateRefOpt.value, state => ({
                            ...state,
                            state: "CLOSED",
                            failureCount: 0,
                            lastStateChange: Date.now()
                        }));
                    }
                })
        };
    })
}) { } 