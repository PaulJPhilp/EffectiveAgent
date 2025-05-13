import { Duration, Effect, Schedule } from "effect";
import { PipelineApi, PipelineConfig } from "./api.js";
import { PipelineError, PipelineExecutionError, PipelineValidationError } from "./errors.js";

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

/**
 * @file Service implementation for Pipeline.
 */

const DEFAULT_CONFIG: Required<PipelineConfig> = {
  maxRetries: 3,
  retryDelay: Duration.seconds(1),
  timeout: Duration.seconds(30)
};

/**
 * Validates pipeline configuration
 */
const validateConfig = (
  config: PipelineConfig
): Effect.Effect<void, PipelineValidationError, never> =>
  Effect.gen(function* () {
    const errors: string[] = [];

    if (config.maxRetries !== undefined && (config.maxRetries < 0 || !Number.isInteger(config.maxRetries))) {
      errors.push("maxRetries must be a non-negative integer");
    }

    if (config.retryDelay !== undefined && Duration.toMillis(config.retryDelay) <= 0) {
      errors.push("retryDelay must be a positive duration");
    }

    if (config.timeout !== undefined && Duration.toMillis(config.timeout) <= 0) {
      errors.push("timeout must be a positive duration");
    }

    if (errors.length > 0) {
      return yield* Effect.fail(new PipelineValidationError({
        description: "Invalid pipeline configuration",
        module: "services/pipeline",
        method: "validateConfig",
        validationErrors: errors
      }));
    }

    return yield* Effect.succeed(void 0);
  });

/**
 * Implementation of the Pipeline service using Effect.Service pattern.
 */
export class Pipeline extends Effect.Service<PipelineApi>()(
  "Pipeline",
  {
    effect: Effect.succeed({
      _tag: "Pipeline" as const,
      execute: <A, E, R>(
        effect: Effect.Effect<A, E, R>,
        config?: PipelineConfig
      ): Effect.Effect<A, PipelineError, R> => {
        const finalConfig = { ...DEFAULT_CONFIG, ...config };

        return Effect.gen(function* () {
          yield* validateConfig(finalConfig);

          const withRetries = finalConfig.maxRetries > 0
            ? Effect.retry(
              effect,
              {
                times: finalConfig.maxRetries,
                schedule: Schedule.spaced(finalConfig.retryDelay)
              }
            )
            : effect;

          const result = yield* Effect.timeout(withRetries, finalConfig.timeout).pipe(
            Effect.catchAll(error =>
              Effect.fail(new PipelineExecutionError({
                description: "Pipeline execution timed out",
                module: "services/pipeline",
                method: "execute",
                cause: error
              }))
            )
          );

          return result;
        });
      },
      validateConfig
    }),
    dependencies: []
  }
) { }