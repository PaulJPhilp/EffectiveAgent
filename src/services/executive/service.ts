/**
 * @file ExecutiveService Implementation
 * @description Executes Effects from producers with policy enforcement and auditing
 */

import { Effect, HashMap, Layer, Option, pipe, Ref, Schedule, Metric, Duration } from "effect";
import { AuthError, RateLimitError } from "./errors.js";
import { v4 as uuid } from "uuid";
import { ExecutiveMetrics, trackTokenUsage } from "./metrics.js";
import { PolicyService } from "@/services/ai/policy/service.js";
import { ExecutiveServiceApi, BaseExecuteOptions, DEFAULT_EXECUTE_OPTIONS, DEFAULT_RETRY_CONFIG, RetryConfig } from "./api.js";
import { ConstraintError, ExecutiveServiceError } from "./errors.js";
import type { AiResponse } from "@effect/ai/AiResponse";
/**
 * Represents the state of an execution
 */
interface ExecutionState {
  status: "pending" | "completed" | "failed";
  startTime: number;
  error?: Error;
}

export class ExecutiveService extends Effect.Service<ExecutiveServiceApi>()(
  "ExecutiveService",
  {
    effect: Effect.gen(function* () {
      // Create state store
      const stateStore = yield* Ref.make<HashMap.HashMap<string, ExecutionState>>(
        HashMap.empty()
      );

      // Get dependencies
      const policyService = yield* PolicyService;

      // Helper for state management
      const setState = (executionId: string, state: ExecutionState) =>
        pipe(
          stateStore,
          Ref.update(store => HashMap.set(store, executionId, state))
        );

      return {
        execute: <R, E, A>(
          effect: Effect.Effect<A, E, R>,
          options: BaseExecuteOptions = DEFAULT_EXECUTE_OPTIONS
        ): Effect.Effect<A, E | ExecutiveServiceError, R> => {
          const DEFAULT_RETRY_CONFIG: RetryConfig = {
            maxAttempts: 1,
            baseDelayMs: 100,
            maxDelayMs: 5000,
            jitterFactor: 0.1,
            useExponentialBackoff: true
          };
          return Effect.gen(function* () {
            const executionId = uuid();
            const startTime = Date.now();

            // Increment total executions counter
            yield* Metric.increment(ExecutiveMetrics.totalExecutions);
            // Track token usage if available
            if (options?.policy?.tokenUsage) {
              yield* trackTokenUsage(
                options.policy.modelId ?? "unknown",
                options.policy.tokenUsage
              );
            }

            const retryConfig = options?.retry ?? DEFAULT_RETRY_CONFIG;
            const policyConfig = options?.policy ?? {};
            const auditLogger = options?.auditLogger;
            const authContext = options?.auth;
            const authValidator = options?.authValidator;
            const rateLimiter = options?.rateLimiter;
            const rateLimitConfig = options?.rateLimit;

            // Check rate limits if configured
            if (rateLimiter && rateLimitConfig) {
              const rateKey = authContext?.userId ?? "anonymous";
              const limitResult = yield* rateLimiter.checkLimit(rateKey);

              if (!limitResult.allowed) {
                return yield* Effect.fail(new RateLimitError({
                  description: `Rate limit exceeded. Try again in ${limitResult.retryAfterMs}ms`,
                  retryAfterMs: limitResult.retryAfterMs
                }));
              }

              // Record the request
              yield* rateLimiter.recordRequest(rateKey);

              // Log rate limit check
              if (auditLogger) {
                yield* auditLogger.logEvent({
                  executionId,
                  eventType: "policy_checked",
                  timestamp: Date.now(),
                  details: {
                    type: "rate_limit",
                    key: rateKey,
                    currentCount: limitResult.currentCount,
                    maxRequests: rateLimitConfig.maxRequests,
                    windowMs: rateLimitConfig.windowMs
                  }
                });
              }
            }

            // Validate auth if validator is provided
            if (authValidator) {
              if (!authContext) {
                return yield* Effect.fail(new AuthError({
                  description: "Auth context is required when auth validator is provided",
                  errorType: "unauthorized"
                }));
              }

              const authResult = yield* authValidator.validate(authContext);
              if (!authResult.valid) {
                return yield* Effect.fail(new AuthError({
                  description: authResult.errorMessage ?? "Auth validation failed",
                  errorType: authResult.errorType ?? "unauthorized"
                }));
              }

              // Log auth validation
              if (auditLogger) {
                yield* auditLogger.logEvent({
                  executionId,
                  eventType: "policy_checked",
                  timestamp: Date.now(),
                  details: {
                    type: "auth",
                    userId: authContext.userId,
                    roles: authContext.roles,
                    permissions: authContext.permissions
                  }
                });
              }
            }

            // Log execution start
            if (auditLogger) {
              yield* auditLogger.logEvent({
                executionId,
                eventType: "execution_started",
                timestamp: Date.now(),
                details: {
                  retryConfig,
                  policyConfig
                }
              });
            }

            // Initialize execution state
            yield* setState(executionId, {
              status: "pending",
              startTime: Date.now()
            });

            // Check policy constraints if needed
            if (policyConfig.modelId || policyConfig.operationType) {
              const policyCheck = yield* policyService.checkPolicy({
                auth: { userId: "system" },
                requestedModel: policyConfig.modelId ?? "",
                operationType: policyConfig.operationType ?? "execute",
                pipelineId: policyConfig.pipelineId,
                tags: policyConfig.tags
              });

              // Log policy check
              if (auditLogger) {
                yield* auditLogger.logEvent({
                  executionId,
                  eventType: "policy_checked",
                  timestamp: Date.now(),
                  details: {
                    allowed: policyCheck.allowed,
                    reason: policyCheck.reason
                  }
                });
              }

              if (!policyCheck.allowed) {
                return yield* Effect.fail(new ConstraintError({
                  description: policyCheck.reason || "Operation not allowed by policy",
                  module: "ExecutiveService",
                  method: "execute",
                  constraint: "maxAttempts",
                  limit: retryConfig.maxAttempts,
                  actual: 1
                }));
              }
            }

            return yield* pipe(
              Effect.gen(function* () {
                // Execute the effect with retries
                const result = yield* pipe(
                  Effect.map(effect, (producer) => {
                    // Add signal to producer if provided
                    return options.signal
                      ? { ...producer, signal: options.signal }
                      : producer;
                  }),
                  Effect.retry({
                    times: retryConfig.maxAttempts - 1,
                    schedule: Schedule.addDelay(
                      Schedule.recurs(retryConfig.maxAttempts - 1),
                      (attempt) => {
                        // Log retry attempt
                        if (auditLogger) {
                          Effect.runSync(auditLogger.logEvent({
                            executionId,
                            eventType: "retry_attempted",
                            timestamp: Date.now(),
                            details: {
                              attempt: attempt + 1,
                              maxAttempts: retryConfig.maxAttempts
                            }
                          }));
                        }
                        // Calculate base delay with optional exponential backoff
                        const baseDelay = retryConfig.useExponentialBackoff
                          ? retryConfig.baseDelayMs * Math.pow(2, attempt)
                          : retryConfig.baseDelayMs;

                        // Cap the delay at maxDelayMs
                        const cappedDelay = Math.min(baseDelay, retryConfig.maxDelayMs);

                        // Add jitter
                        const jitter = retryConfig.jitterFactor ?? 0.1;
                        const variance = cappedDelay * jitter;
                        const jitterMs = Math.random() * variance;

                        return cappedDelay + jitterMs;
                      }
                    )
                  })
                );

                // Update state to completed
                yield* setState(executionId, {
                  status: "completed",
                  startTime: Date.now()
                });

                // Log completion
                if (auditLogger) {
                  yield* auditLogger.logEvent({
                    executionId,
                    eventType: "execution_completed",
                    timestamp: Date.now(),
                    details: {
                      result
                    }
                  });
                }

                // Record execution duration
                yield* Metric.update(
                  ExecutiveMetrics.executionDuration,
                  Duration.millis(Date.now() - startTime)
                );

                return result;
              }),
              Effect.catchAll((error: Error | unknown) =>
                Effect.gen(function* () {
                  // Update state to failed
                  yield* setState(executionId, {
                    status: "failed",
                    startTime: Date.now(),
                    error: error instanceof Error ? error : new Error(String(error))
                  });

                  // Log failure
                  if (auditLogger) {
                    yield* auditLogger.logEvent({
                      executionId,
                      eventType: "execution_failed",
                      timestamp: Date.now(),
                      details: {
                        error: error instanceof Error ? error.message : String(error)
                      }
                    });
                  }

                  // Increment failed executions counter
                  yield* Metric.increment(ExecutiveMetrics.failedExecutions);

                  // Record execution duration even for failures
                  yield* Metric.update(
                    ExecutiveMetrics.executionDuration,
                    Duration.millis(Date.now() - startTime)
                  );

                  return yield* Effect.fail(new ExecutiveServiceError({
                    description: error instanceof Error ? error.message : String(error),
                    module: "ExecutiveService",
                    method: "execute",
                    cause: error
                  }));
                })
              ),
              Effect.interruptible,
              Effect.onInterrupt(() => 
                Effect.gen(function* () {
                  yield* setState(executionId, {
                    status: "failed",
                    startTime: Date.now(),
                    error: new Error("Operation interrupted")
                  });

                  // Log interruption
                  if (auditLogger) {
                    yield* auditLogger.logEvent({
                      executionId,
                      eventType: "execution_failed",
                      timestamp: Date.now(),
                      details: {
                        error: "Operation interrupted"
                      }
                    });
                  }

                  return yield* Effect.succeed(void 0);
                })
              )
            );
          });
        }
      };
    }),
  }
) { }
