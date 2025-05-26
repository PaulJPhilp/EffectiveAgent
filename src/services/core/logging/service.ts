/**
 * @file Implementation of the LoggingService using Effect's platform logger
 * with file-based logging support.
 */

import { JsonObject } from "@/types.js";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Cause, Effect, LogLevel, Ref } from "effect";
import type { LoggingServiceApi } from "./api.js";
import { LoggingServiceError } from "./errors.js";

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

      // Create mutable config state
      const configRef = yield* Ref.make(getConfig());

      // Helper to get current config
      const getCurrentConfig = Ref.get(configRef);

      // Helper to ensure log directory exists
      const ensureLogDir = (config: LoggingConfig) => Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
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

      // Initial directory setup
      const initialConfig = yield* getCurrentConfig;
      yield* ensureLogDir(initialConfig);

      // Helper to log to file using Effect Platform FileSystem
      const logToFile = (
        level: LogLevel.LogLevel,
        message: string,
        data?: LogData
      ): LogEffect => Effect.gen(function* () {
        const config = yield* getCurrentConfig;
        const fs = yield* FileSystem.FileSystem;
        const timestamp: string = new Date().toISOString();
        const logEntry: string = JSON.stringify({
          timestamp,
          level,
          message,
          data
        });
        const logPath: string = `${config.logDir}/${config.logFileBaseName}.log`;
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
      }).pipe(
        Effect.provide(NodeFileSystem.layer),
        Effect.as(void 0)
      );

      // Helper to log messages
      const logMessage = (level: LogLevel.LogLevel, message: string, data?: LogData): LogEffect =>
        Effect.all([
          logToFile(level, message, data),
          Effect.log(message, level)
        ]).pipe(
          Effect.map(() => void 0)
        );

      // Helper to update logging configuration
      const updateConfig = (newConfig: { logDir: string; logFileBase: string }): Effect.Effect<void, LoggingServiceError, never> =>
        Effect.gen(function* () {
          const currentConfig = yield* getCurrentConfig;
          const updatedConfig: LoggingConfig = {
            ...currentConfig,
            logDir: newConfig.logDir,
            logFileBaseName: newConfig.logFileBase
          };
          yield* Ref.set(configRef, updatedConfig);

          // Create the directory ensuring Effect
          const fs = yield* FileSystem.FileSystem;
          const exists = yield* fs.exists(updatedConfig.logDir);
          if (!exists) {
            yield* fs.makeDirectory(updatedConfig.logDir, { recursive: true });
          }
        }).pipe(
          Effect.provide(NodeFileSystem.layer),
          Effect.mapError((error): LoggingServiceError =>
            new LoggingServiceError({
              description: "Failed to update logging configuration",
              module: "LoggingService",
              method: "setConfig",
              cause: error
            })
          ),
          Effect.as(void 0)
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
        setConfig: updateConfig,
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
            setConfig: updateConfig,
            withContext: <U extends JsonObject>(moreContext: U) =>
              logger.withContext({ ...newContext, ...moreContext })
          };
        }
      };

      return logger;
    })
  }
) { }