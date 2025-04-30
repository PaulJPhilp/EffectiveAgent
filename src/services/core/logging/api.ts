/**
 * @file Defines the interface for the Logging service API.
 */

import type { JsonObject } from "@/types.js";
import { Cause, Effect, LogLevel } from "effect";

/**
 * Service interface for logging messages and structured data.
 */
export interface LoggingServiceApi {
  /**
   * Log a message with the specified log level.
   */
  readonly log: (
    level: LogLevel.LogLevel,
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void>;

  /**
   * Log a debug message.
   */
  readonly debug: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void>;

  /**
   * Log an info message.
   */
  readonly info: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void>;

  /**
   * Log a warning message.
   */
  readonly warn: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void>;

  /**
   * Log an error message.
   */
  readonly error: (
    message: string,
    data?: JsonObject | Error
  ) => Effect.Effect<void>;

  /**
   * Log a trace message.
   */
  readonly trace: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void>;

  /**
   * Log a cause with the specified log level.
   */
  readonly logCause: (
    level: LogLevel.LogLevel,
    cause: Cause.Cause<unknown>
  ) => Effect.Effect<void>;

  /**
   * Log an error cause.
   */
  readonly logErrorCause: (
    cause: Cause.Cause<unknown>
  ) => Effect.Effect<void>;
}

// Re-export LogLevel for convenience
export type { LogLevel } from "effect";
