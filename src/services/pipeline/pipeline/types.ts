import type { Effect } from "effect";
import type { Duration } from "effect/Duration";
import { EffectiveError } from "@/errors.js";
import type {
  InputValidationError,
  OutputValidationError,
  PipelineConfigurationError,
  PipelineError,
  PipelineValidationError,
} from "./errors.js";

/**
 * Represents the configuration for a pipeline execution.
 * These settings were originally part of a shared Pipeline service
 * intended for generic retry/timeout logic.
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

  readonly timeoutMs?: number;
  readonly retryAttempts?: number;
  readonly enableLogging?: boolean;
}

/**
 * Error thrown when pipeline execution times out
 * This is a local error type specific to timeout handling in this module
 */
export class PipelineTimeoutError extends EffectiveError {
  constructor(timeoutMs: number) {
    super({
      description: `Pipeline execution timed out after ${timeoutMs}ms`,
      module: "PipelineService",
      method: "execute",
    });
  }
}

/**
 * Service API for executing Effects with configurable timeout behavior.
 * This API was originally part of a shared Pipeline service.
 *
 * @remarks
 * This service provides a way to wrap Effects with standardized timeout
 * policies. It ensures consistent error handling and resource cleanup across
 * pipeline executions.
 */
export interface PipelineApi {
  /**
   * Executes an Effect with configured timeout and retry behavior.
   */
  readonly execute: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    config?: PipelineConfig
  ) => Effect.Effect<A, E | PipelineError, R>; // Uses PipelineError from ./errors.js (moved from shared)

  /**
   * Validates pipeline configuration for the retry/timeout service.
   */
  readonly validateConfig: (
    config: PipelineConfig
  ) => Effect.Effect<void, PipelineValidationError, never>; // Uses PipelineValidationError from ./errors.js (moved from shared)
}

/** Union of all possible errors the base AiPipelineService run method can produce. */
export type AiPipelineError<CustomError extends EffectiveError> =
  | CustomError // Errors from configureChatHistory/configureExecutiveCall
  | InputValidationError
  | OutputValidationError
  | PipelineConfigurationError; // AiPipelineService's own configuration error

/** Parameters for configuring the execution within AiPipelineService */
export interface ExecutiveCallConfig<A, E, R> {
  /** The Effect to execute */
  effect: Effect.Effect<A, E, R>;
}
