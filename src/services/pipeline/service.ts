import { Duration, Effect, Schedule } from "effect";

/**
 * Parameters for configuring execution
 */
export interface ExecutiveParameters {
  readonly operationName?: string;
  readonly maxRetries?: number;
  readonly timeoutMs?: number;
  readonly rateLimit?: boolean;
}

/**
 * The ExecutiveService orchestrates calls to AI models, applying policies,
 * handling retries, and managing overall execution flow based on provided
 * configuration.
 */
export interface ExecutiveServiceApi {
  readonly _tag: "ExecutiveService";
  readonly execute: <R, E, A>(effect: Effect.Effect<A, E, R>, parameters?: ExecutiveParameters) => Effect.Effect<A, E | ExecutiveServiceError, R>;
}

export class ExecutiveServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutiveServiceError";
  }
}

/**
 * Implementation of the ExecutiveService following the Effect.Service pattern.
 */
export class ExecutiveService extends Effect.Service<ExecutiveServiceApi>()(
  "ExecutiveService",
  {
    effect: Effect.succeed({
      _tag: "ExecutiveService" as const,
      execute: <R, E, A>(
        effect: Effect.Effect<A, E, R>,
        parameters?: ExecutiveParameters
      ): Effect.Effect<A, E | ExecutiveServiceError, R> => {
        // Apply retries and timeout if configured
        const effectWithRetries = parameters?.maxRetries
          ? Effect.retry(
            effect,
            {
              times: parameters.maxRetries,
              schedule: Schedule.exponential(Duration.seconds(1)),
            }
          )
          : effect;

        const effectWithTimeout = parameters?.timeoutMs
          ? Effect.timeout(
            effectWithRetries,
            Duration.millis(parameters.timeoutMs)
          )
          : effectWithRetries;

        // Execute the effect
        return effectWithTimeout;
      },
    }),
    dependencies: [],
  },
) { }
