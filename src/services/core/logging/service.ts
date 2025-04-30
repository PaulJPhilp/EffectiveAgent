/**
 * @file Implementation of the LoggingService using Effect's built-in logger.
 */

import type { JsonObject } from "@/types.js";
import type { LoggingServiceApi } from "@core/logging/api.js";
import { Cause, Effect, Layer, LogLevel, Option } from "effect";

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
       * Log at debug level
       */
      debug: (message: string, data?: JsonObject): Effect.Effect<void> => {
        const options = { logLevel: Option.some(LogLevel.Debug) };
        if (data) {
          return Effect.log(options, message, data);
        } else {
          return Effect.log(options, message);
        }
      },

      /**
       * Log at info level
       */
      info: (message: string, data?: JsonObject): Effect.Effect<void> => {
        const options = { logLevel: Option.some(LogLevel.Info) };
        if (data) {
          return Effect.log(options, message, data);
        } else {
          return Effect.log(options, message);
        }
      },

      /**
       * Log at warning level
       */
      warn: (message: string, data?: JsonObject): Effect.Effect<void> => {
        const options = { logLevel: Option.some(LogLevel.Warning) };
        if (data) {
          return Effect.log(options, message, data);
        } else {
          return Effect.log(options, message);
        }
      },

      /**
       * Log at error level
       */
      error: (
        message: string,
        data?: JsonObject | Error,
      ): Effect.Effect<void> => {
        const options = { logLevel: Option.some(LogLevel.Error) };
        if (data) {
          if (data instanceof Error) {
            // Handle Error objects specially - extract message and stack
            return Effect.log(options, message, {
              errorMessage: data.message,
              stack: data.stack,
            });
          } else {
            // Handle normal JSON data
            return Effect.log(options, message, data);
          }
        } else {
          return Effect.log(options, message);
        }
      },

      /**
       * Log at trace level
       */
      trace: (message: string, data?: JsonObject): Effect.Effect<void> => {
        const options = { logLevel: Option.some(LogLevel.Trace) };
        if (data) {
          return Effect.log(options, message, data);
        } else {
          return Effect.log(options, message);
        }
      },

      /**
       * Log a cause object at the specified level
       */
      logCause: (
        level: LogLevel.LogLevel,
        cause: Cause.Cause<unknown>,
      ): Effect.Effect<void> => {
        return Effect.sync(() => {
          const prettyPrinted = Cause.pretty(cause);
          const options = { logLevel: Option.some(level) };
          return Effect.log(options, prettyPrinted);
        }).pipe(Effect.flatten) as Effect.Effect<void>;
      },

      /**
       * Log a cause object at error level
       */
      logErrorCause: (cause: Cause.Cause<unknown>): Effect.Effect<void> => {
        return Effect.sync(() => {
          const prettyPrinted = Cause.pretty(cause);
          const options = { logLevel: Option.some(LogLevel.Error) };
          return Effect.log(options, prettyPrinted);
        }).pipe(Effect.flatten) as Effect.Effect<void>;
      },
    }),
    dependencies: [] // No explicit dependencies
  }
) {}

/**
 * Live implementation of the LoggingService
 */
export const LoggingServiceLive = Layer.succeed(LoggingService);

/**
 * Default export for more idiomatic imports
 */
export default LoggingService;
