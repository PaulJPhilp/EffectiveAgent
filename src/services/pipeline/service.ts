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

/**
 * @file Service implementation for Pipeline.
 */

import { pipe } from "effect";
import type { PipelineApi, PipelineConfig } from "./api.js";
import { PipelineConfigError, PipelineExecutionError, PipelineValidationError } from "./errors.js";

const DEFAULT_CONFIG: Required<PipelineConfig> = {
  maxRetries: 3,
  retryDelay: Duration.seconds(1),
  timeout: Duration.seconds(30)
};

// validateConfig function moved to the top
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
  });

/**
 * Implementation of the Pipeline service using Effect.Service pattern.
 */
export class Pipeline extends Effect.Service<PipelineApi>()(
  "Pipeline",
  {
    effect: Effect.succeed({
      _tag: "Pipeline" as const,
      execute: () => Effect.succeed({}),
    }),
    dependencies: []
  }
) { }