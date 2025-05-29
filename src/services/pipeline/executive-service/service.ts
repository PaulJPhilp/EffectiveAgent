import { Duration, Effect, Schedule } from "effect";
import { ExecutiveParameters, ExecutiveServiceApi } from "./api.js";
import { ExecutiveServiceError } from "./errors.js";

/**
 * Implementation of the ExecutiveService following the Effect.Service pattern.
 */
export class ExecutiveService extends Effect.Service<ExecutiveServiceApi>()(
  "ExecutiveService",
  {
    effect: Effect.gen(function* () {
      return {
        _tag: "ExecutiveService" as const,
        execute: <R, E, A>(
          effect: Effect.Effect<A, E, R>,
          parameters?: ExecutiveParameters
        ): Effect.Effect<A, E | ExecutiveServiceError, R> => {
          return Effect.gen(function* () {
            yield* Effect.logInfo(
              "ExecutiveService: execution started",
              parameters ? { parameters: JSON.stringify(parameters) } : {}
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
              Effect.catchAll((error) =>
                Effect.gen(function* () {
                  yield* Effect.logError(
                    "ExecutiveService: execution failed",
                    {
                      error:
                        error instanceof Error
                          ? error.message
                          : String(error),
                    }
                  );
                  return yield* Effect.fail(
                    new ExecutiveServiceError("Execution failed")
                  );
                })
              )
            );
          });
        },
      };
    })
  }
) { } // Empty class body
