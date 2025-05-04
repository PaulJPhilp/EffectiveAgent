/**
 * @file Service implementation for Pipeline.
 */

import { Duration, Effect, Schedule, pipe } from "effect";
import type { PipelineApi, PipelineConfig } from "./api.js";
import { PipelineConfigError, PipelineExecutionError, PipelineValidationError } from "./errors.js";

const DEFAULT_CONFIG: Required<PipelineConfig> = {
    maxRetries: 3,
    retryDelay: Duration.seconds(1),
    timeout: Duration.seconds(30)
};

// Move validateConfig to a standalone function
const validateConfig = (
    config: PipelineConfig
): Effect.Effect<void, PipelineValidationError> => {
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
        return Effect.fail(new PipelineValidationError({
            description: "Invalid pipeline configuration",
            module: "services/pipeline",
            method: "validateConfig",
            validationErrors: errors
        }));
    }

    return Effect.succeed(undefined);
};

/**
 * Implementation of the Pipeline service using Effect.Service pattern.
 */
export class Pipeline extends Effect.Service<PipelineApi>()(
    "Pipeline",
    {
        effect: Effect.succeed({
            execute: <A, E, R>(
                effect: Effect.Effect<A, E, R>,
                config: PipelineConfig = {}
            ): Effect.Effect<A, PipelineConfigError | PipelineExecutionError | PipelineValidationError, R> =>
                pipe(
                    Effect.gen(function* () {
                        // Merge with defaults
                        const finalConfig = { ...DEFAULT_CONFIG, ...config };

                        // Validate config directly
                        yield* validateConfig(finalConfig);

                        // Execute with retry and timeout
                        return yield* pipe(
                            effect,
                            Effect.retry(Schedule.recurs(finalConfig.maxRetries).pipe(
                                Schedule.addDelay(() => finalConfig.retryDelay)
                            )),
                            Effect.timeout(finalConfig.timeout),
                            Effect.mapError(error =>
                                new PipelineExecutionError({
                                    description: "Pipeline execution failed",
                                    module: "services/pipeline",
                                    method: "execute",
                                    cause: error
                                })
                            )
                        );
                    })
                ),
            validateConfig  // Export validateConfig as part of the service API
        }),
        dependencies: []
    }
) { }