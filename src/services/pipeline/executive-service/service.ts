/**
 * @file Executive Service implementation for execution orchestration and tracking
 * @module services/pipeline/executive-service/service
 */
import { Duration, Effect, Option, Ref, Schedule } from "effect";
import { ExecutiveParameters, ExecutiveServiceApi } from "./api.js";
import { ExecutiveServiceError } from "./errors.js";

/**
 * Executive agent state for tracking execution activity
 */
export interface ExecutiveAgentState {
  readonly executionCount: number
  readonly lastExecution: Option.Option<{
    readonly timestamp: number
    readonly success: boolean
    readonly parameters?: ExecutiveParameters
    readonly durationMs: number
  }>
  readonly executionHistory: ReadonlyArray<{
    readonly timestamp: number
    readonly success: boolean
    readonly parameters?: ExecutiveParameters
    readonly durationMs: number
    readonly operationName?: string
  }>
}



/**
 * Implementation of the ExecutiveService following the Effect.Service pattern with simplified state management.
 */
export class ExecutiveService extends Effect.Service<ExecutiveServiceApi>()(
  "ExecutiveService",
  {
    effect: Effect.gen(function* () {
      const initialState: ExecutiveAgentState = {
        executionCount: 0,
        lastExecution: Option.none(),
        executionHistory: []
      };

      // Create internal state management
      const internalStateRef = yield* Ref.make<ExecutiveAgentState>(initialState);

      yield* Effect.log("ExecutiveService initialized");

      // Helper function to update internal state
      const updateState = (execution: {
        readonly timestamp: number
        readonly success: boolean
        readonly parameters?: ExecutiveParameters
        readonly durationMs: number
        readonly operationName?: string
      }) => Effect.gen(function* () {
        const currentState = yield* Ref.get(internalStateRef);

        const executionRecord = {
          timestamp: execution.timestamp,
          success: execution.success,
          parameters: execution.parameters,
          durationMs: execution.durationMs,
          operationName: execution.operationName
        };

        const updatedHistory = [
          ...currentState.executionHistory,
          executionRecord
        ].slice(-20); // Keep last 20 executions

        const newState: ExecutiveAgentState = {
          executionCount: currentState.executionCount + 1,
          lastExecution: Option.some(executionRecord),
          executionHistory: updatedHistory
        };

        yield* Ref.set(internalStateRef, newState);

        yield* Effect.log("Updated executive state", {
          oldCount: currentState.executionCount,
          newCount: newState.executionCount,
          operationName: execution.operationName
        });
      });

      return {
        _tag: "ExecutiveService" as const,
        execute: <R, E, A>(
          effect: Effect.Effect<A, E, R>,
          parameters?: ExecutiveParameters
        ): Effect.Effect<A, E | ExecutiveServiceError, R> => {
          return Effect.gen(function* () {
            const startTime = Date.now();
            const operationName = parameters?.operationName || "unknown-operation";

            yield* Effect.logInfo(
              "ExecutiveService: execution started",
              parameters ? {
                parameters: JSON.stringify(parameters),
                operationName
              } : { operationName }
            );



            const effectWithRetries = parameters?.maxRetries
              ? Effect.retry(effect, {
                times: parameters.maxRetries,
                schedule: Schedule.exponential(Duration.seconds(1)),
              })
              : effect;

            const effectWithTimeout = parameters?.timeoutMs
              ? Effect.timeout(
                effectWithRetries,
                Duration.millis(parameters.timeoutMs)
              )
              : effectWithRetries;

            return yield* effectWithTimeout.pipe(
              Effect.tap(() =>
                Effect.logInfo("ExecutiveService: execution succeeded")
              ),
              Effect.tap(() => Effect.gen(function* () {
                const durationMs = Date.now() - startTime;

                // Update state with successful execution
                yield* updateState({
                  timestamp: startTime,
                  success: true,
                  parameters,
                  durationMs,
                  operationName
                });
              })),
              Effect.catchAll((error) =>
                Effect.gen(function* () {
                  const durationMs = Date.now() - startTime;

                  yield* Effect.logError(
                    "ExecutiveService: execution failed",
                    {
                      error: error instanceof Error ? error.message : String(error),
                      operationName,
                      durationMs
                    }
                  );

                  // Update state with failed execution
                  yield* updateState({
                    timestamp: startTime,
                    success: false,
                    parameters,
                    durationMs,
                    operationName
                  });

                  return yield* Effect.fail(
                    new ExecutiveServiceError("Execution failed")
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
        getRuntime: () => Effect.succeed({
          state: internalStateRef
        }),

        /**
         * Terminate the service (no-op since we don't have external runtime)
         */
        terminate: () => Effect.succeed(void 0)
      };
    }),
    dependencies: []
  }
) { } // Empty class body
