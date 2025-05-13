import { Duration, Effect, Schedule } from "effect";

/**
 * Interface for the Pipeline Service
 */
export interface PipelineServiceInterface {
    readonly _tag: "PipelineService"
    readonly execute: <A, E, R>(
        effect: Effect.Effect<A, E, R>,
        parameters?: ExecutiveParameters
    ) => Effect.Effect<A, E | ExecutiveServiceError, R>
}

/**
 * Implementation of the Pipeline Service using Effect.Service pattern
 */
export class PipelineService extends Effect.Service<PipelineServiceInterface>()("PipelineService", {
    effect: Effect.succeed({
        _tag: "PipelineService" as const,
        execute: <A, E, R>(
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
        }
    }),
    dependencies: []
}) { } 