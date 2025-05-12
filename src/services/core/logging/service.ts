/**
 * @file Implementation of the LoggingService using Effect's built-in logger.
 */

import { Cause, Effect, LogLevel, Option } from "effect";
import type { LoggingServiceApi } from "./api.js";

/** Type representing a JSON-serializable object */
export interface JsonObject {
  [key: string]: string | number | boolean | null | JsonObject | JsonObject[];
}

/**
 * LoggingService implementation using Effect.Service pattern.
 * This service provides logging functionality using Effect's built-in logger.
 */
export class LoggingService extends Effect.Service<LoggingServiceApi>()(
  "LoggingService",
  {
    effect: Effect.succeed({
      log: (
        level: LogLevel.LogLevel,
        message: string,
        data?: JsonObject
      ): Effect.Effect<void> => {
        const options = { logLevel: Option.some(level) };
        if (data) {
          return Effect.log(options, message, data);
        }
        return Effect.log(options, message);
      },

      debug: (message: string, data?: JsonObject): Effect.Effect<void> => {
        const options = { logLevel: Option.some(LogLevel.Debug) };
        if (data) {
          return Effect.log(options, message, data);
        }
        return Effect.log(options, message);
      },

      info: (message: string, data?: JsonObject): Effect.Effect<void> => {
        const options = { logLevel: Option.some(LogLevel.Info) };
        if (data) {
          return Effect.log(options, message, data);
        }
        return Effect.log(options, message);
      },

      warn: (message: string, data?: JsonObject): Effect.Effect<void> => {
        const options = { logLevel: Option.some(LogLevel.Warning) };
        if (data) {
          return Effect.log(options, message, data);
        }
        return Effect.log(options, message);
      },

      error: (message: string, data?: JsonObject | Error): Effect.Effect<void> => {
        const options = { logLevel: Option.some(LogLevel.Error) };
        if (data) {
          if (data instanceof Error) {
            return Effect.log(options, message, {
              errorMessage: data.message,
              stack: data.stack,
            });
          }
          return Effect.log(options, message, data);
        }
        return Effect.log(options, message);
      },

      trace: (message: string, data?: JsonObject): Effect.Effect<void> => {
        const options = { logLevel: Option.some(LogLevel.Trace) };
        if (data) {
          return Effect.log(options, message, data);
        }
        return Effect.log(options, message);
      },

      logCause: (level: LogLevel.LogLevel, cause: Cause.Cause<unknown>): Effect.Effect<void> =>
        Effect.sync(() => Cause.pretty(cause)).pipe(
          Effect.flatMap(prettyPrinted => Effect.log({ logLevel: Option.some(level) }, prettyPrinted))
        ),

      logErrorCause: (cause: Cause.Cause<unknown>): Effect.Effect<void> =>
        Effect.sync(() => Cause.pretty(cause)).pipe(
          Effect.flatMap(prettyPrinted => Effect.log({ logLevel: Option.some(LogLevel.Error) }, prettyPrinted))
        )
    })
  }
) { }
