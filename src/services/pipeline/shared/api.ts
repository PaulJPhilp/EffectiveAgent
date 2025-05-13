/**
 * @file Defines the Pipeline service API for executing effects with configurable timeout.
 */

import { Effect } from "effect";
import { PipelineError, PipelineValidationError } from "./errors.js";
import { Duration } from "effect/Duration";

/**
 * Represents the configuration for a pipeline execution.
 */
export interface PipelineConfig {
    /**
     * Maximum duration to wait for the effect to complete
     * @default Duration.seconds(30)
     */
    readonly timeout?: Duration;

    /**
     * Number of times to retry the effect on failure
     * @default 3
     */
    readonly maxRetries?: number;

    /**
     * Duration to wait between retries
     * @default Duration.seconds(1)
     */
    readonly retryDelay?: Duration;
}

/**
 * Service for executing Effects with configurable timeout behavior.
 * 
 * @remarks
 * This service provides a way to wrap Effects with standardized timeout
 * policies. It ensures consistent error handling and resource cleanup across
 * pipeline executions.
 * 
 * @example
 * ```typescript
 * const effect = Effect.succeed("result");
 * const result = yield* Pipeline.execute(effect, {
 *   timeout: Duration.seconds(30),
 *   maxRetries: 3,
 *   retryDelay: Duration.seconds(1)
 * });
 * ```
 */
export interface PipelineApi {
    readonly _tag: "Pipeline";

    /**
     * Executes an Effect with configured timeout behavior.
     * 
     * @param effect - The Effect to execute
     * @param config - Optional configuration for timeout behavior
     * @returns An Effect that will run with the specified configuration
     * @template A - The success type of the Effect
     * @template E - The error type of the Effect
     * @template R - The environment type of the Effect
     * 
     * @remarks
     * The execution will:
     * - Validate the configuration
     * - Apply retries based on configuration
     * - Timeout after the specified duration
     * - Transform errors into PipelineError types
     * 
     * @throws {PipelineValidationError} If the configuration is invalid
     * @throws {PipelineExecutionError} If the execution fails or times out
     */
    readonly execute: <A, E, R>(
        effect: Effect.Effect<A, E, R>,
        config?: PipelineConfig
    ) => Effect.Effect<A, PipelineError, R>;

    /**
     * Validates pipeline configuration.
     * 
     * @param config - The configuration to validate
     * @returns An Effect that succeeds if the config is valid
     * @throws {PipelineValidationError} If the configuration is invalid
     */
    readonly validateConfig: (
        config: PipelineConfig
    ) => Effect.Effect<void, PipelineValidationError, never>;
}