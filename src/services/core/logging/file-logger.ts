/**
 * @file Simple FileLogger implementation
 * @module ea/services/core/logging/file-logger
 */

import { JsonObject } from "@/types.js";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Cause, Effect, LogLevel } from "effect";
import { LoggingServiceApi } from "./api.js";
import { LoggingServiceError } from "./errors.js";

export interface FileLoggerConfig {
  readonly logDir: string;
  readonly logFileBase: string;
}

/**
 * FileLogger service implementation using Effect.Service pattern
 */
export class FileLogger extends Effect.Service<LoggingServiceApi>()(
  "FileLogger",
  {
    effect: Effect.gen(function* (_) {
      // Get dependencies
      const fs = yield* FileSystem.FileSystem;

      // Default config
      const config = yield* Effect.succeed({
        logDir: "logs",
        logFileBase: "app"
      });

      // Create base log function
      const writeLog = (
        entry: JsonObject,
        config: FileLoggerConfig
      ): Effect.Effect<void, LoggingServiceError, never> =>
        fs.writeFile(
          `${config.logDir}/${config.logFileBase}.log`,
          Buffer.from(JSON.stringify(entry) + "\n"),
          { flag: "a" }
        ).pipe(
          Effect.catchAll((error) =>
            Effect.fail(new LoggingServiceError({
              description: `Failed to write to log file: ${error}`,
              module: "FileLogger",
              method: "writeFile",
              cause: error
            }))
          )
        );

      const setConfig = (newConfig: FileLoggerConfig): Effect.Effect<void, LoggingServiceError> =>
        Effect.gen(function* (_) {
          yield* fs.makeDirectory(newConfig.logDir, { recursive: true });
          config.logDir = newConfig.logDir;
          config.logFileBase = newConfig.logFileBase;
          return yield* Effect.succeed(undefined);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(new LoggingServiceError({
              description: `Failed to set config: ${error}`,
              module: "FileLogger",
              method: "setConfig",
              cause: error
            }))
          )
        );

      const log = (
        level: LogLevel.LogLevel,
        message: string,
        data?: JsonObject
      ): Effect.Effect<void, Error> => {
        const entry = {
          timestamp: new Date().toISOString(),
          level: level.toString(),
          message,
          ...(data || {})
        };
        return writeLog(entry, config);
      };

      const debug = (message: string, data?: JsonObject) =>
        log(LogLevel.Debug, message, data);

      const info = (message: string, data?: JsonObject) =>
        log(LogLevel.Info, message, data);

      const warn = (message: string, data?: JsonObject) =>
        log(LogLevel.Warning, message, data);

      const error = (message: string, data?: JsonObject | Error) =>
        log(LogLevel.Error, message,
          data instanceof Error ? { error: data.message } : data
        );

      const trace = (message: string, data?: JsonObject) =>
        log(LogLevel.Trace, message, data);

      const logCause = (
        level: LogLevel.LogLevel,
        cause: Cause.Cause<unknown>,
        data?: JsonObject
      ): Effect.Effect<void, Error> =>
        log(level, "Effect failure", {
          cause: Cause.pretty(cause),
          ...data
        });

      const logErrorCause = (
        cause: Cause.Cause<unknown>,
        data?: JsonObject
      ): Effect.Effect<void, Error> =>
        logCause(LogLevel.Error, cause, data);

      const withContext = <T extends JsonObject>(
        additionalContext: T
      ): LoggingServiceApi =>
      // Create new logger with merged context
      ({
        setConfig,
        log: (level, message, data) =>
          log(level, message, { ...additionalContext, ...data }),
        debug: (message, data) =>
          debug(message, { ...additionalContext, ...data }),
        info: (message, data) =>
          info(message, { ...additionalContext, ...data }),
        warn: (message, data) =>
          warn(message, { ...additionalContext, ...data }),
        error: (message, data) =>
          error(message,
            data instanceof Error
              ? { ...additionalContext, error: data.message }
              : { ...additionalContext, ...data }
          ),
        trace: (message, data) =>
          trace(message, { ...additionalContext, ...data }),
        logCause,
        logErrorCause,
        withContext: (moreContext) =>
          withContext({ ...additionalContext, ...moreContext })
      });

      return {
        setConfig,
        log,
        debug,
        info,
        warn,
        error,
        trace,
        logCause,
        logErrorCause,
        withContext
      };
    }),
    dependencies: [NodeFileSystem.layer]
  }
) { }
