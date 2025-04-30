/**
 * @file Implementation of the LoggingService using Effect's built-in logger.
 */

import type { JsonObject } from "@/types.js";
import type { LoggingServiceApi } from "@core/logging/types.js";
import { Cause, Effect, Layer, LogLevel, Logger, Option } from "effect";

/**
 * LoggingService implementation using Effect.Service pattern.
 * This service provides logging functionality using Effect's built-in logger.
 */
export class LoggingService extends Effect.Service<LoggingServiceApi>()(
  "LoggingService",
  {
    // Define service implementation
    effect: Effect.succeed({
      /**
       * Log a message with a specific level
       */
      log: (
        level: LogLevel.LogLevel,
        message: string,
        data?: JsonObject,
      ): Effect.Effect<void> => {
        const options = { logLevel: Option.some(level) };
        if (data) {
          return Effect.log(options, message, data);
        } else {
          return Effect.log(options, message);
        }
      },

      /**
       * Log a debug message
       */
      debug: (
        message: string,
        data?: JsonObject,
      ): Effect.Effect<void> => {
        if (data) {
          return Effect.logDebug(message, data);
        } else {
          return Effect.logDebug(message);
        }
      },

      /**
       * Log an info message
       */
      info: (message: string, data?: JsonObject): Effect.Effect<void> => {
        if (data) {
          return Effect.logInfo(message, data);
        } else {
          return Effect.logInfo(message);
        }
      },

      /**
       * Log a warning message
       */
      warn: (message: string, data?: JsonObject): Effect.Effect<void> => {
        if (data) {
          return Effect.logWarning(message, data);
        } else {
          return Effect.logWarning(message);
        }
      },

      /**
       * Log an error message
       */
      error: (
        message: string,
        data?: JsonObject | Error,
      ): Effect.Effect<void> => {
        if (data instanceof Error) {
          return Effect.logError(message, Cause.die(data));
        } else if (data) {
          return Effect.logError(message, data);
        } else {
          return Effect.logError(message);
        }
      },

      /**
       * Log a trace message
       */
      trace: (
        message: string,
        data?: JsonObject,
      ): Effect.Effect<void> => {
        if (data) {
          return Effect.logTrace(message, data);
        } else {
          return Effect.logTrace(message);
        }
      },

      /**
       * Log a cause with a specific level
       */
      logCause: (
        level: LogLevel.LogLevel,
        cause: Cause.Cause<unknown>,
      ): Effect.Effect<void> => {
        const options = { logLevel: Option.some(level), cause: Option.some(cause) };
        return Effect.log(options, "Logging Cause");
      },

      /**
       * Log an error cause
       */
      logErrorCause: (
        cause: Cause.Cause<unknown>,
      ): Effect.Effect<void> => {
        return Effect.logError("Logging Error Cause:", cause);
      }
    }),
    dependencies: []
  }
) {}

/**
 * Live Layer for the LoggingService.
 * Provides the default logging implementation.
 */
export const LoggingServiceLive = Layer.succeed(LoggingService);

/**
 * Layer that sets the minimum log level for the default logger.
 * Can be composed with other layers using Layer.merge or Layer.provide.
 * @param level The minimum LogLevel to output.
 */
export const LoggingLevelLayer = (
  level: LogLevel.LogLevel,
): Layer.Layer<never, never, never> => Logger.minimumLogLevel(level);

/**
 * Default export for the LoggingService.
 */
export default LoggingService;
