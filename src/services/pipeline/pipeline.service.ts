/**
 * @file Service implementation for Pipeline.
 */

import { Duration, Effect, pipe } from "effect";
import type { PipelineApi, PipelineConfig } from "./api.js";
import { PipelineConfigError, PipelineExecutionError, PipelineValidationError } from "./errors.js";

const DEFAULT_CONFIG: Required<PipelineConfig> = {
    timeout: Duration.seconds(30)
};

// Move validateConfig to a standalone function
const validateConfig = (
    config: PipelineConfig
): Effect.Effect<void, PipelineValidationError> => {
    const errors: string[] = [];

    if (config.timeout !== undefined && Duration.toMillis(config.timeout) <= 0) {
        errors.push("timeout must be a positive duration");
    }

    if (errors.length > 0) {
        return Effect.fail(new PipelineValidationError({
            description: "Pipeline configuration validation failed",
            module: "PipelineService",
            method: "validateConfig",
            validationErrors: errors
        }));
    }

    return Effect.succeed(void 0);
};

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
            ): Effect.Effect<A, PipelineConfigError | PipelineExecutionError | PipelineValidationError, R> => {
                const finalConfig = { ...DEFAULT_CONFIG, ...config };

                return pipe(
                    validateConfig(finalConfig),
                    Effect.flatMap(() => effect),
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
            },

            validateConfig: (config: PipelineConfig) => validateConfig(config)
        }),
        dependencies: []
    }
) { }