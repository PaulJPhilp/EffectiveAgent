/**
 * @file Defines the interface for the Logging service API.
 *
 * The Logging service provides a unified interface for logging messages,
 * structured data, and error causes throughout the application. It supports
 * multiple log levels and structured logging with metadata.
 *
 * Key features:
 * - Standard log levels (trace, debug, info, warn, error)
 * - Structured logging with JSON metadata
 * - Error cause tracking and logging
 * - Effect-based logging operations
 *
 * The service is built on top of Effect's logging capabilities but provides
 * a more convenient and standardized interface for the application.
 */

import type { JsonObject } from "@/types.js";
import { Cause, Effect, LogLevel } from "effect";


/**
 * Service interface for logging messages and structured data.
 *
 * @remarks
 * All logging methods return Effects to ensure proper sequencing in Effect
 * workflows. The Effects are lazy and will only execute when run.
 *
 * The service provides both generic logging methods (log, logCause) and
 * convenience methods for specific log levels (debug, info, etc.).
 *
 * @example
 * ```typescript
 * // Basic logging
 * yield* LoggingService.info("User logged in", { userId: "123" });
 *
 * // Error logging
 * try {
 *   // ... some operation
 * } catch (error) {
 *   yield* LoggingService.error("Operation failed", { error });
 * }
 * ```
 */
/**
 * Logger interface for pluggable loggers (file, console, remote, etc).
 * Each logger implementation should handle its own log level filtering.
 */
import type { LoggingServiceError } from "./errors.js";

/**
 * API for file-based logging with support for all log levels and structured data.
 */
export interface FileLoggerApi {
  /** Log a message at a specific log level. */
  readonly log: (
    level: LogLevel.LogLevel,
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, LoggingServiceError>;

  /** Log a debug-level message. */
  readonly debug: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, LoggingServiceError>;

  /** Log an info-level message. */
  readonly info: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, LoggingServiceError>;

  /** Log a warning-level message. */
  readonly warn: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, LoggingServiceError>;

  /** Log an error-level message with optional error details. */
  readonly error: (
    message: string,
    error?: unknown
  ) => Effect.Effect<void, LoggingServiceError>;

  /** Log a trace-level message. */
  readonly trace: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, LoggingServiceError>;

  /** Log a message with a Cause at a given level. */
  readonly logCause: (
    level: LogLevel.LogLevel,
    cause: Cause.Cause<unknown>,
    data?: JsonObject
  ) => Effect.Effect<void, LoggingServiceError>;

  /** Log an error-level message with a Cause. */
  readonly logErrorCause: (
    cause: Cause.Cause<unknown>,
    data?: JsonObject
  ) => Effect.Effect<void, LoggingServiceError>;

  /** Return a logger with additional context (no-op for stateless logger). */
  readonly withContext: (additionalContext: JsonObject) => FileLoggerApi;
}

/**
 * API for the ConsoleLogger service.
 */
export interface ConsoleLoggerApi {
  /** Log a message at a specific log level. */
  readonly log: (
    level: LogLevel.LogLevel,
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, never>;

  /** Log a debug-level message. */
  readonly debug: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, never>;

  /** Log an info-level message. */
  readonly info: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, never>;

  /** Log a warning-level message. */
  readonly warn: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, never>;

  /** Log an error-level message with optional error details. */
  readonly error: (
    message: string,
    error?: unknown
  ) => Effect.Effect<void, never>;
}

/**
 * API for the FileLogger service.
 */
export interface FileLoggerApi {}

export interface LoggingServiceApi {
  /**
   * Log a message with the specified log level.
   *
   * @param level - The log level to use (from Effect's LogLevel)
   * @param message - The message to log
   * @param data - Optional structured data to include with the log
   * @returns Effect resolving to void
   *
   * @example
   * ```typescript
   * yield* LoggingService.log(
   *   LogLevel.Info,
   *   "Processing started",
   *   { jobId: "123", items: 5 }
   * );
   * ```
   */
  readonly log: (
    level: LogLevel.LogLevel,
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, Error>;

  /**
   * Log a debug message.
   *
   * @param message - The debug message to log
   * @param data - Optional structured data to include
   * @returns Effect resolving to void
   *
   * @remarks
   * Use debug level for detailed information useful during development
   * and troubleshooting. These logs may be filtered out in production.
   */
  readonly debug: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, Error>;

  /**
   * Log an info message.
   *
   * @param message - The info message to log
   * @param data - Optional structured data to include
   * @returns Effect resolving to void
   *
   * @remarks
   * Use info level for general operational messages about system behavior.
   * These should be useful but not too verbose.
   */
  readonly info: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, Error>;

  /**
   * Log a warning message.
   *
   * @param message - The warning message to log
   * @param data - Optional structured data to include
   * @returns Effect resolving to void
   *
   * @remarks
   * Use warn level for potentially harmful situations or deprecated
   * feature usage that require attention but aren't errors.
   */
  readonly warn: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, Error>;

  /**
   * Log an error message.
   *
   * @param message - The error message to log
   * @param data - Optional structured data or Error object to include
   * @returns Effect resolving to void
   *
   * @remarks
   * Use error level for error events that might still allow the
   * application to continue running. For fatal errors, consider
   * using logErrorCause with the full error cause chain.
   */
  readonly error: (
    message: string,
    data?: JsonObject | Error
  ) => Effect.Effect<void, Error>;

  /**
   * Log a trace message.
   *
   * @param message - The trace message to log
   * @param data - Optional structured data to include
   * @returns Effect resolving to void
   *
   * @remarks
   * Use trace level for very detailed debugging information.
   * This is the most verbose logging level and should be used
   * sparingly in production.
   */
  readonly trace: (
    message: string,
    data?: JsonObject
  ) => Effect.Effect<void, Error>;

  /**
   * Log a cause with the specified log level.
   *
   * @param level - The log level to use
   * @param cause - The Effect Cause to log
   * @returns Effect resolving to void
   *
   * @remarks
   * This method is particularly useful for logging Effect failures
   * with their full cause chain. It will properly format and output
   * the cause structure.
   *
   * @example
   * ```typescript
   * const result = yield* someEffect.pipe(
   *   Effect.catchAll(cause =>
   *     LoggingService.logCause(LogLevel.Error, cause)
   *   )
   * );
   * ```
   */
  readonly logCause: (
    level: LogLevel.LogLevel,
    cause: Cause.Cause<unknown>,
    data?: JsonObject
  ) => Effect.Effect<void, Error>;

  /**
   * Log an error cause.
   *
   * @param cause - The Effect Cause to log as an error
   * @returns Effect resolving to void
   *
   * @remarks
   * Convenience method that logs a cause at error level.
   * Equivalent to calling logCause with LogLevel.Error.
   *
   * @example
   * ```typescript
   * const result = yield* someEffect.pipe(
   *   Effect.catchAll(cause =>
   *     LoggingService.logErrorCause(cause)
   *   )
   * );
   * ```
   */
  readonly logErrorCause: (
    cause: Cause.Cause<unknown>,
    data?: JsonObject
  ) => Effect.Effect<void, Error>;

  /**
   * Create a new logger instance with additional context.
   *
   * @param additionalContext - Additional context to add to all log messages
   * @returns A new LoggingServiceApi instance with the combined context
   *
   * @example
   * ```typescript
   * const requestLogger = LoggingService.withContext({ requestId: '123' });
   * yield* requestLogger.info('Request started');
   * ```
   */
  readonly withContext: <T extends JsonObject>(
    additionalContext: T
  ) => LoggingServiceApi;
}

// Re-export LogLevel for convenience
export type { LogLevel } from "effect";

