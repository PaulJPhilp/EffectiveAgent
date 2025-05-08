/**
 * @file Defines the Pipeline service API for executing effects with configurable timeout.
 */

import { Effect } from "effect";
import type { Duration } from "effect/Duration";
import type { PipelineError, PipelineValidationError } from "./errors.js";

/**
 * Represents the configuration for a pipeline execution.
 */
export interface PipelineConfig {
    readonly timeout?: Duration;
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
 *   timeout: Duration.seconds(30)
 * });
 * ```
 */
export interface PipelineApi {
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
     * - Timeout after the specified duration
     * - Transform errors into PipelineError types
     */
    readonly execute: <A, E, R>(
        effect: Effect.Effect<A, E, R>,
        config?: PipelineConfig
    ) => Effect.Effect<A, PipelineError, R>;

    /**
     * Validates pipeline configuration.
     * 
     * @param config - The configuration to validate
     * @returns An Effect that succeeds if the config is valid, fails with PipelineValidationError otherwise
     */
    readonly validateConfig: (
        config: PipelineConfig
    ) => Effect.Effect<void, PipelineValidationError, never>;
}