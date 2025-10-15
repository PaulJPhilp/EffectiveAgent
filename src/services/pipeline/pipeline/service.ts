import { Effect, Option, Ref } from "effect";
import type { EffectiveError } from "@/errors.js";
import type { PipelineServiceInterface } from "./api.js";

/**
 * Pipeline execution agent state
 */
export interface PipelineAgentState {
  readonly executionCount: number;
  readonly lastExecution: Option.Option<{
    readonly timestamp: number;
    readonly success: boolean;
  }>;
  readonly lastUpdate: Option.Option<number>;
  readonly executionHistory: ReadonlyArray<{
    readonly timestamp: number;
    readonly success: boolean;
    readonly durationMs?: number;
  }>;
  readonly isTerminated: boolean;
}

/**
 * Implementation of the Pipeline Service using Effect.Service pattern with simplified state management
 * Executes effects directly without orchestration to avoid stacking with provider client orchestration.
 */
export class PipelineService extends Effect.Service<PipelineServiceInterface>()(
  "PipelineService",
  {
    effect: Effect.gen(function* () {
      const initialState: PipelineAgentState = {
        executionCount: 0,
        lastExecution: Option.none(),
        lastUpdate: Option.none(),
        executionHistory: [],
        isTerminated: false,
      };

      // Create internal state management
      const internalStateRef = yield* Ref.make<PipelineAgentState>(
        initialState
      );

      yield* Effect.log(
        "PipelineService initialized without orchestration to prevent stacking"
      );

      // Helper function to update internal state
      const updateState = (execution: {
        readonly timestamp: number;
        readonly success: boolean;
        readonly durationMs?: number;
      }) =>
        Effect.gen(function* () {
          const currentState = yield* Ref.get(internalStateRef);

          const updatedHistory = [
            ...currentState.executionHistory,
            execution,
          ].slice(-20); // Keep last 20 executions

          const newState: PipelineAgentState = {
            executionCount: currentState.executionCount + 1,
            lastExecution: Option.some({
              timestamp: execution.timestamp,
              success: execution.success,
            }),
            lastUpdate: Option.some(Date.now()),
            executionHistory: updatedHistory,
            isTerminated: currentState.isTerminated,
          };

          yield* Ref.set(internalStateRef, newState);

          yield* Effect.log("Updated pipeline state", {
            oldCount: currentState.executionCount,
            newCount: newState.executionCount,
          });
        });

      const service: PipelineServiceInterface = {
        _tag: "PipelineService" as const,
        execute: <A, E extends EffectiveError, R>(
          effectToRun: Effect.Effect<A, E, R>
        ): Effect.Effect<A, E, R> =>
          Effect.gen(function* () {
            const startTime = Date.now();

            // Log execution start
            yield* Effect.log(
              "Starting pipeline execution (direct execution, no orchestration)"
            );

            // Execute the effect directly without orchestration to avoid stacking
            const result = yield* effectToRun.pipe(
              Effect.tap((result) =>
                Effect.gen(function* () {
                  yield* Effect.log(
                    "Pipeline execution completed successfully"
                  );

                  const endTime = Date.now();
                  const durationMs = endTime - startTime;

                  // Update agent state with successful execution results
                  yield* updateState({
                    timestamp: startTime,
                    success: true,
                    durationMs,
                  });

                  return result;
                })
              ),
              Effect.catchAll((error: E) =>
                Effect.gen(function* () {
                  yield* Effect.logError("Pipeline execution failed", {
                    error,
                  });

                  const endTime = Date.now();
                  const durationMs = endTime - startTime;

                  // Update agent state with failed execution
                  yield* updateState({
                    timestamp: startTime,
                    success: false,
                    durationMs,
                  });

                  return yield* Effect.fail(error);
                })
              )
            );

            return result;
          }).pipe(Effect.withSpan("PipelineService.execute")),

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
        terminate: () =>
          Effect.gen(function* () {
            yield* Ref.update(internalStateRef, (state) => ({
              ...state,
              isTerminated: true,
            }));
          }),
      };

      return service;
    }),
  }
) {}
