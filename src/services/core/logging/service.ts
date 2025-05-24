/**
 * @file Implementation of the LoggingService using Effect's platform logger
 * with file-based logging support.
 */

import { JsonObject } from "@/types.js";
import { Cause, Effect, LogLevel } from "effect";
import { FileSystem } from "@effect/platform";
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

const getConfig = (): LoggingConfig => ({
  logDir: process.env.LOG_DIR ?? "logs",
  logFileBaseName: process.env.LOG_FILE_BASE ?? "app",
  minLogLevel: LogLevel.Info
});

/**
 * A service that provides logging capabilities using Effect's platform logger.
 */
export class LoggingService extends Effect.Service<LoggingServiceApi>()(
  "LoggingService",
  {
    effect: Effect.gen(function* () {
      yield* Effect.logDebug('Initializing LoggingService...');
      const config = getConfig();
      yield* Effect.logDebug(`Got config: ${JSON.stringify(config)}`);

      // Ensure log directory exists using Effect Platform FileSystem
      const fs = yield* FileSystem.FileSystem;
      const ensureLogDir = Effect.gen(function* () {
        const exists = yield* fs.exists(config.logDir);
        if (!exists) {
          yield* fs.makeDirectory(config.logDir, { recursive: true }).pipe(
            Effect.mapError((error: unknown) => new LoggingServiceError({
              description: `Failed to create log directory: ${config.logDir}`,
              module: "LoggingService",
              method: "ensureLogDir",
              cause: error
            }))
          );
        }
        yield* Effect.logDebug('Log directory created');
      });
      yield* ensureLogDir;

      // Helper to log to file using Effect Platform FileSystem
      const logToFile = (
        level: LogLevel.LogLevel,
        message: string,
        data?: LogData
      ): LogEffect => Effect.gen(function* () {
        const timestamp: string = new Date().toISOString();
        const logEntry: string = JSON.stringify({
          timestamp,
          level,
          message,
          data
        });
        const levelStr: string =
          level === LogLevel.Error ? "error" :
          level === LogLevel.Warning ? "warn" :
          level === LogLevel.Info ? "info" :
          level === LogLevel.Debug ? "debug" :
          "trace";
        const logPath: string = `${config.logDir}/${levelStr}.log`;
        yield* Effect.logDebug(`Writing to log file: ${logPath}`);
        // Platform FileSystem has no appendFileString; emulate append
        const exists = yield* fs.exists(logPath).pipe(
          Effect.mapError((error: unknown) => new LoggingServiceError({
            description: `Failed to check log file existence: ${logPath}`,
            module: "LoggingService",
            method: "logToFile",
            cause: error
          }))
        );
        let newContent: string;
        if (exists) {
          const prev = yield* fs.readFileString(logPath).pipe(
            Effect.mapError((error: unknown) => new LoggingServiceError({
              description: `Failed to read log file for append: ${logPath}`,
              module: "LoggingService",
              method: "logToFile",
              cause: error
            }))
          );
          newContent = prev + logEntry + "\n";
        } else {
          newContent = logEntry + "\n";
        }
        yield* fs.writeFileString(logPath, newContent).pipe(
          Effect.mapError((error: unknown) => new LoggingServiceError({
            description: `Failed to write to log file: ${logPath}`,
            module: "LoggingService",
            method: "logToFile",
            cause: error
          }))
        );
        return Effect.void;
      });

      // Helper to log messages
      const logMessage = (level: LogLevel.LogLevel, message: string, data?: LogData): LogEffect =>
        Effect.all([
          logToFile(level, message, data),
          Effect.log(message, level)
        ]).pipe(
          Effect.map(() => void 0)
        );

      // Create logger implementation
      const logger: LoggingServiceApi = {
        debug: (message: string, data?: LogData) =>
          logMessage(LogLevel.Debug, message, data),
        info: (message: string, data?: LogData) =>
          logMessage(LogLevel.Info, message, data),
        warn: (message: string, data?: LogData) =>
          logMessage(LogLevel.Warning, message, data),
        error: (message: string, error: unknown) => {
          const errorData = error instanceof Error 
            ? { message: error.message } 
            : { message: String(error) };
          return logMessage(LogLevel.Error, message, errorData);
        },
        trace: (message: string, data?: LogData) =>
          logMessage(LogLevel.Trace, message, data),
        log: (level: LogLevel.LogLevel, message: string, data?: LogData) =>
          logMessage(level, message, data),
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
          return {
            debug: (message: string, data?: LogData) =>
              logMessage(LogLevel.Debug, message, { ...data, ...newContext }),
            info: (message: string, data?: LogData) =>
              logMessage(LogLevel.Info, message, { ...data, ...newContext }),
            warn: (message: string, data?: LogData) =>
              logMessage(LogLevel.Warning, message, { ...data, ...newContext }),
            error: (message: string, error: unknown) => {
              const errorData = error instanceof Error 
                ? { message: error.message } 
                : { message: String(error) };
              return logMessage(LogLevel.Error, message, { ...errorData, ...newContext });
            },
            trace: (message: string, data?: LogData) =>
              logMessage(LogLevel.Trace, message, { ...data, ...newContext }),
            log: (level: LogLevel.LogLevel, message: string, data?: LogData) =>
              logMessage(level, message, { ...data, ...newContext }),
            logCause: (level: LogLevel.LogLevel, cause: Cause.Cause<unknown>, data?: LogData) => {
              const causeData = { cause: Cause.pretty(cause), ...data };
              return logMessage(level, "Error cause", { ...causeData, ...newContext });
            },
            logErrorCause: (cause: Cause.Cause<unknown>, data?: LogData) => {
              const causeData = { cause: Cause.pretty(cause), ...data };
              return logMessage(LogLevel.Error, "Error cause", { ...causeData, ...newContext });
            },
            withContext: <U extends JsonObject>(moreContext: U): LoggingServiceApi => {
              const combinedContext = { ...newContext, ...moreContext };
              return logger.withContext(combinedContext);
            }
          };
        }
      };

      return logger;
    })
  }
) { }