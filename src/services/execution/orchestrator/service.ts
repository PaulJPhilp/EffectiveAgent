/**
 * @file Orchestrator Service implementation for execution orchestration and tracking
 * @module services/execution/orchestrator/service
 */
import { Duration, Effect, Option, Ref, Schedule } from "effect";
import { OrchestratorParameters, OrchestratorServiceApi } from "./api.js";
import { OrchestratorServiceError } from "./errors.js";
import { EffectiveError } from "@/errors.js";
import {
  ResilienceService,
  ResilienceServiceApi,
  CircuitBreakerConfig,
  RetryPolicy,
} from "../resilience/index.js";

/**
 * Orchestrator agent state for tracking execution activity
 */
export interface OrchestratorAgentState {
  readonly executionCount: number;
  readonly lastExecution: Option.Option<{
    readonly timestamp: number;
    readonly success: boolean;
    readonly parameters?: OrchestratorParameters;
    readonly durationMs: number;
  }>;
  readonly executionHistory: ReadonlyArray<{
    readonly timestamp: number;
    readonly success: boolean;
    readonly parameters?: OrchestratorParameters;
    readonly durationMs: number;
    readonly operationName?: string;
  }>;
}

/**
 * Implementation of the OrchestratorService following the Effect.Service pattern with simplified state management.
 */
export class OrchestratorService extends Effect.Service<OrchestratorServiceApi>()(
  "OrchestratorService",
  {
    dependencies: [ResilienceService.Default],
    effect: Effect.gen(function* () {
      // Get ResilienceService dependency
      const resilienceService = yield* ResilienceService;

      const initialState: OrchestratorAgentState = {
        executionCount: 0,
        lastExecution: Option.none(),
        executionHistory: [],
      };

      // Create internal state management
      const internalStateRef = yield* Ref.make<OrchestratorAgentState>(
        initialState
      );

      yield* Effect.log(
        "OrchestratorService initialized with ResilienceService"
      );

      // Helper function to update internal state
      const updateState = (execution: {
        readonly timestamp: number;
        readonly success: boolean;
        readonly parameters?: OrchestratorParameters;
        readonly durationMs: number;
        readonly operationName?: string;
      }) =>
        Effect.gen(function* () {
          const currentState = yield* Ref.get(internalStateRef);

          const executionRecord = {
            timestamp: execution.timestamp,
            success: execution.success,
            parameters: execution.parameters,
            durationMs: execution.durationMs,
            operationName: execution.operationName,
          };

          const updatedHistory = [
            ...currentState.executionHistory,
            executionRecord,
          ].slice(-20); // Keep last 20 executions

          const newState: OrchestratorAgentState = {
            executionCount: currentState.executionCount + 1,
            lastExecution: Option.some(executionRecord),
            executionHistory: updatedHistory,
          };

          yield* Ref.set(internalStateRef, newState);

          yield* Effect.log("Updated orchestrator state", {
            oldCount: currentState.executionCount,
            newCount: newState.executionCount,
            operationName: execution.operationName,
          });
        });

      return {
        _tag: "OrchestratorService" as const,
        execute: <R, E extends EffectiveError, A>(
          effect: Effect.Effect<A, E, R>,
          parameters?: OrchestratorParameters
        ): Effect.Effect<A, E | OrchestratorServiceError, R> => {
          return Effect.gen(function* () {
            const startTime = Date.now();
            const operationName =
              parameters?.operationName || "unknown-operation";

            yield* Effect.logInfo(
              "OrchestratorService: execution started",
              parameters
                ? {
                    parameters: JSON.stringify(parameters),
                    operationName,
                  }
                : { operationName }
            );

            // Create resilience configuration based on parameters
            const resilienceConfig = parameters?.resilience;
            const circuitBreakerConfig: CircuitBreakerConfig = {
              name: `orchestrator-${operationName}`,
              failureThreshold: resilienceConfig?.failureThreshold || 5,
              resetTimeout: Duration.millis(
                resilienceConfig?.resetTimeoutMs || 30000
              ),
              halfOpenMaxAttempts: 2,
            };

            const retryPolicy: RetryPolicy = {
              maxAttempts: parameters?.maxRetries || 3,
              baseDelay: Duration.seconds(1),
              maxDelay: Duration.seconds(10),
              backoffMultiplier: resilienceConfig?.retryBackoffMultiplier || 2,
              jitter: resilienceConfig?.retryJitter ?? true,
              retryableErrors: [],
              nonRetryableErrors: [],
            };

            // Apply timeout if specified and map timeout errors to EffectiveError
            const baseEffect = parameters?.timeoutMs
              ? Effect.timeout(
                  effect,
                  Duration.millis(parameters.timeoutMs)
                ).pipe(
                  Effect.mapError((error): E | OrchestratorServiceError => {
                    // Check if it's a timeout error by checking the error structure
                    if (
                      typeof error === "object" &&
                      error !== null &&
                      "_tag" in error &&
                      error._tag === "TimeoutException"
                    ) {
                      return new OrchestratorServiceError(
                        `Operation timed out after ${parameters.timeoutMs}ms`
                      );
                    }
                    return error as E;
                  })
                )
              : effect;

            // Wrap with resilience patterns
            const retryEffect = resilienceService.withRetry(
              baseEffect,
              retryPolicy
            );
            const resilientEffect =
              resilienceConfig?.circuitBreakerEnabled === false
                ? retryEffect
                : resilienceService.withCircuitBreaker(
                    retryEffect,
                    circuitBreakerConfig
                  );

            return yield* resilientEffect.pipe(
              Effect.tap(() =>
                Effect.logInfo("OrchestratorService: execution succeeded")
              ),
              Effect.tap(() =>
                Effect.gen(function* () {
                  const durationMs = Date.now() - startTime;

                  // Update state with successful execution
                  yield* updateState({
                    timestamp: startTime,
                    success: true,
                    parameters,
                    durationMs,
                    operationName,
                  });
                })
              ),
              Effect.catchAll((error) =>
                Effect.gen(function* () {
                  const durationMs = Date.now() - startTime;

                  yield* Effect.logError(
                    "OrchestratorService: execution failed",
                    {
                      error:
                        error instanceof Error ? error.message : String(error),
                      operationName,
                      durationMs,
                    }
                  );

                  // Update state with failed execution
                  yield* updateState({
                    timestamp: startTime,
                    success: false,
                    parameters,
                    durationMs,
                    operationName,
                  });

                  return yield* Effect.fail(
                    new OrchestratorServiceError("Execution failed")
                  );
                })
              )
            );
          });
        },

        /**
         * Get the current agent state for monitoring/debugging
         */
        getAgentState: () => Ref.get(internalStateRef),

        /**
         * Get the runtime for direct access in tests
         */
        getRuntime: () =>
          Effect.succeed({
            state: internalStateRef,
          }),

        /**
         * Terminate the service (no-op since we don't have external runtime)
         */
        terminate: () => Effect.succeed(undefined),
      };
    }),
  }
) {} // Empty class body
