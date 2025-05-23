/**
 * @file Implementation of the LoggingService using Effect's platform logger
 * with file-based logging support.
 */

import { JsonObject } from "@/types.js";
import { Cause, Effect, LogLevel } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { EffectiveError } from "@/errors.js";
import type { LoggingServiceApi } from "./api.js";

type LogEffect = Effect.Effect<void, Error | LoggingServiceError, never>;
type LogData = JsonObject & { message?: string; cause?: string; };

const logToConsole = (message: string): LogEffect => 
  Effect.sync(() => console.log(message)).pipe(Effect.mapError(e => new Error(String(e))));

const logErrorToConsole = (message: string): LogEffect => 
  Effect.sync(() => console.error(message)).pipe(Effect.mapError(e => new Error(String(e))));

const logDebugToConsole = (message: string): LogEffect => 
  Effect.sync(() => console.debug(message)).pipe(Effect.mapError(e => new Error(String(e))));

const logInfoToConsole = (message: string): LogEffect => 
  Effect.sync(() => console.info(message)).pipe(Effect.mapError(e => new Error(String(e))));

const logWarnToConsole = (message: string): LogEffect => 
  Effect.sync(() => console.warn(message)).pipe(Effect.mapError(e => new Error(String(e))));


/**
 * Error thrown by the LoggingService.
 */
export class LoggingServiceError extends EffectiveError {
  constructor(params: {
    description: string;
    module: string;
    method: string;
    cause?: unknown;
  }) {
    super(params);
  }
}

/**
 * Configuration for the LoggingService.
 */
export interface LoggingConfig {
  readonly logDir: string;
  readonly logFileBaseName: string;
  readonly minLogLevel: LogLevel.LogLevel;
}

const DEFAULT_CONFIG: LoggingConfig = {
  logDir: process.env.LOG_DIR ?? "logs",
  logFileBaseName: process.env.LOG_FILE_BASE ?? "app",
  minLogLevel: LogLevel.Info
};

/**
 * A service that provides logging capabilities using Effect's platform logger.
 */
export class LoggingService extends Effect.Service<LoggingServiceApi>()(
  "LoggingService",
  {
    effect: Effect.gen(function* () {
      // Get the FileSystem dependency
      const fs = yield* FileSystem.FileSystem;

      // Ensure log directory exists
      yield* fs.makeDirectory(DEFAULT_CONFIG.logDir, { recursive: true }).pipe(
        Effect.catchAll(error => 
          Effect.fail(new LoggingServiceError({
            description: "Failed to create log directory",
            module: "LoggingService",
            method: "makeDirectory",
            cause: error
          }))
        )
      );

      // Helper to log to file
      const logToFile = (level: LogLevel.LogLevel, message: string, data?: LogData): LogEffect =>
        Effect.gen(function* () {
          const timestamp = new Date().toISOString();
          const logEntry = JSON.stringify({
            timestamp,
            level,
            message,
            data
          });
          const levelStr = level === LogLevel.Error ? "error" :
                          level === LogLevel.Warning ? "warn" :
                          level === LogLevel.Info ? "info" :
                          level === LogLevel.Debug ? "debug" :
                          "trace";
          const logPath = `${DEFAULT_CONFIG.logDir}/${levelStr}.log`;
          const content = new TextEncoder().encode(logEntry + '\n');
          
          // Ensure directory exists and write to file
          yield* fs.makeDirectory(DEFAULT_CONFIG.logDir, { recursive: true }).pipe(
            Effect.flatMap(() => fs.writeFile(logPath, content, { flag: "a" })),
            Effect.catchAll((error) => Effect.fail(new LoggingServiceError({
              description: `Failed to write to log file: ${logPath}`,
              module: "LoggingService",
              method: "logToFile",
              cause: error
            })))
          );
        });

      // Helper to log messages
      const logMessage = (level: LogLevel.LogLevel, message: string, data?: LogData): LogEffect =>
        Effect.all([
          logToFile(level, message, data),
          level === LogLevel.Error ? logErrorToConsole(message) :
          level === LogLevel.Warning ? logWarnToConsole(message) :
          level === LogLevel.Info ? logInfoToConsole(message) :
          level === LogLevel.Debug ? logDebugToConsole(message) :
          logToConsole(message)
        ]).pipe(Effect.map(() => undefined));

      // Create the service implementation
      const implementation: LoggingServiceApi = {
        debug: (message: string, data?: LogData) => logMessage(LogLevel.Debug, message, data),
        info: (message: string, data?: LogData) => logMessage(LogLevel.Info, message, data),
        warn: (message: string, data?: LogData) => logMessage(LogLevel.Warning, message, data),
        error: (message: string, error: unknown) => {
          const errorData = error instanceof Error 
            ? { message: error.message } 
            : { message: String(error) };
          return logMessage(LogLevel.Error, message, errorData);
        },
        trace: (message: string, data?: LogData) => logMessage(LogLevel.Trace, message, data),
        log: (level: LogLevel.LogLevel, message: string, data?: LogData) => logMessage(level, message, data),
        logCause: (level: LogLevel.LogLevel, cause: Cause.Cause<unknown>, data?: LogData) => {
          const causeData = { cause: Cause.pretty(cause), ...data };
          return logMessage(level, "Error cause", causeData);
        },
        logErrorCause: (cause: Cause.Cause<unknown>, data?: LogData) => {
          const causeData = { cause: Cause.pretty(cause), ...data };
          return logMessage(LogLevel.Error, "Error cause", causeData);
        },
        withContext: <T extends JsonObject>(additionalContext: T): LoggingServiceApi => {
          const newContext = { ...additionalContext };
          let contextLogger: LoggingServiceApi;
          const withContextImpl = <U extends JsonObject>(moreContext: U): LoggingServiceApi => {
            return {
              ...contextLogger,
              withContext: <V extends JsonObject>(evenMoreContext: V) => 
                withContextImpl({ ...moreContext, ...evenMoreContext })
            };
          };
          contextLogger = {
            debug: (message: string, data?: LogData) => logMessage(LogLevel.Debug, message, { ...data, ...newContext }),
            info: (message: string, data?: LogData) => logMessage(LogLevel.Info, message, { ...data, ...newContext }),
            warn: (message: string, data?: LogData) => logMessage(LogLevel.Warning, message, { ...data, ...newContext }),
            error: (message: string, error: unknown) => {
              const errorData = error instanceof Error 
                ? { message: error.message } 
                : { message: String(error) };
              return logMessage(LogLevel.Error, message, { ...errorData, ...newContext });
            },
            trace: (message: string, data?: LogData) => logMessage(LogLevel.Trace, message, { ...data, ...newContext }),
            log: (level: LogLevel.LogLevel, message: string, data?: LogData) => logMessage(level, message, { ...data, ...newContext }),
            logCause: (level: LogLevel.LogLevel, cause: Cause.Cause<unknown>, data?: LogData) => {
              const causeData = { cause: Cause.pretty(cause), ...data };
              return logMessage(level, "Error cause", { ...causeData, ...newContext });
            },
            logErrorCause: (cause: Cause.Cause<unknown>, data?: LogData) => {
              const causeData = { cause: Cause.pretty(cause), ...data };
              return logMessage(LogLevel.Error, "Error cause", { ...causeData, ...newContext });
            },
            withContext: withContextImpl
          };
          return contextLogger;
        }
      };

      return implementation;
    }),
    dependencies: [NodeFileSystem.layer]
  }
) { }