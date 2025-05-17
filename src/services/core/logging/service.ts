/**
 * @file Implementation of the LoggingService using Effect's built-in logger
 * with file-based logging support.
 */

import { Cause, Effect, LogLevel, Option } from "effect";
import type { LoggingServiceApi } from "./api.js";
import { FileLogger } from "./file-logger.js";

/** Type representing a JSON-serializable object */
export interface JsonObject {
  [key: string]: string | number | boolean | null | JsonObject | JsonObject[];
}

// Default configuration for file logging
const DEFAULT_FILE_LOGGER_CONFIG = {
  logDir: "logs",
  logFileBaseName: "app",
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxBackups: 5,
  minLogLevel: LogLevel.Info
} as const;

/**
 * LoggingService implementation using Effect.Service pattern.
 * This service provides logging functionality with both console and file output.
 */
export class LoggingService extends Effect.Service<LoggingServiceApi>()(
  "LoggingService",
  {
    effect: Effect.gen(function* () {
      // Create file logger instance
      const fileLogger = new FileLogger(DEFAULT_FILE_LOGGER_CONFIG);
      
      // Initialize file logger
      yield* fileLogger.initialize();
      
      // Create the logging service implementation
      const fileLoggerApi = fileLogger.createLoggingService();
      
      // Helper function to create a logger with context
      const createLogger = (context: JsonObject = {}): LoggingServiceApi => ({
        log: (
          level: LogLevel.LogLevel,
          message: string,
          data?: JsonObject
        ): Effect.Effect<void> => {
          const consoleEffect = Effect.log(level, message, { ...context, ...data });
          const fileEffect = fileLoggerApi.log(level, message, { ...context, ...data });
          return Effect.all([consoleEffect, fileEffect], { concurrency: "unbounded" });
        },

        debug: (message: string, data?: JsonObject): Effect.Effect<void> => {
          const consoleEffect = Effect.log(LogLevel.Debug, message, { ...context, ...data });
          const fileEffect = fileLoggerApi.debug(message, { ...context, ...data });
          return Effect.all([consoleEffect, fileEffect], { concurrency: "unbounded" });
        },

        info: (message: string, data?: JsonObject): Effect.Effect<void> => {
          const consoleEffect = Effect.log(LogLevel.Info, message, { ...context, ...data });
          const fileEffect = fileLoggerApi.info(message, { ...context, ...data });
          return Effect.all([consoleEffect, fileEffect], { concurrency: "unbounded" });
        },

        warn: (message: string, data?: JsonObject): Effect.Effect<void> => {
          const consoleEffect = Effect.log(LogLevel.Warning, message, { ...context, ...data });
          const fileEffect = fileLoggerApi.warn(message, { ...context, ...data });
          return Effect.all([consoleEffect, fileEffect], { concurrency: "unbounded" });
        },

        error: (message: string, data?: JsonObject | Error): Effect.Effect<void> => {
          const errorData = data instanceof Error 
            ? { 
                error: data.message, 
                ...(data.stack ? { stack: data.stack } : {}) 
              } 
            : data || {};
          const logData = { ...context, ...errorData };
          const consoleEffect = Effect.log(LogLevel.Error, message, logData);
          const fileEffect = fileLoggerApi.error(message, logData);
          return Effect.all([consoleEffect, fileEffect], { concurrency: "unbounded" });
        },

        trace: (message: string, data?: JsonObject): Effect.Effect<void> => {
          const consoleEffect = Effect.log(LogLevel.Trace, message, { ...context, ...data });
          const fileEffect = fileLoggerApi.trace(message, { ...context, ...data });
          return Effect.all([consoleEffect, fileEffect], { concurrency: "unbounded" });
        },

        logCause: (
          level: LogLevel.LogLevel,
          cause: Cause.Cause<unknown>,
          data?: JsonObject
        ): Effect.Effect<void> => {
          const message = Cause.pretty(cause);
          const consoleEffect = Effect.log(level, message, { ...context, ...data });
          const fileEffect = fileLoggerApi.log(level, message, { ...context, ...data });
          return Effect.all([consoleEffect, fileEffect], { concurrency: "unbounded" });
        },

        logErrorCause: (
          cause: Cause.Cause<unknown>,
          data?: JsonObject
        ): Effect.Effect<void> => {
          const message = Cause.pretty(cause);
          const consoleEffect = Effect.log(LogLevel.Error, message, { ...context, ...data });
          const fileEffect = fileLoggerApi.error(message, { ...context, ...data });
          return Effect.all([consoleEffect, fileEffect], { concurrency: "unbounded" });
        },

        withContext: <T extends JsonObject>(additionalContext: T): LoggingServiceApi => {
          return createLogger({ ...context, ...additionalContext });
        }
      });

      // Return the root logger
      return createLogger();
    })
  }
) { }
