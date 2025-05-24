/**
 * @file Implementation of file-based logging for the LoggingService.
 * This module provides a FileLogger that writes logs to a file with rotation support.
 */

import type { JsonObject } from "@/types.js";
import { Cause, Effect, LogLevel, Ref, Layer } from 'effect';
import * as NodeFs from 'node:fs/promises';
import * as NodePath from 'node:path';
import type { FileLoggerApi } from "./api.js";
import  { LoggingServiceError } from "./errors.js";

type FileHandle = Awaited<ReturnType<typeof NodeFs.open>>;

interface FileLoggerConfig {
  /** Directory where log files will be stored */
  readonly logDir: string;

  /** Base name for the log file (without extension) */
  readonly logFileBaseName: string;

  /** Maximum size of a log file before rotation (in bytes) */
  readonly maxFileSize: number;

  /** Maximum number of backup files to keep */
  readonly maxBackups: number;

  /** Minimum log level to record */
  readonly minLogLevel: LogLevel.LogLevel;
}

const DEFAULT_FILE_LOGGER_CONFIG: FileLoggerConfig = {
  logDir: "logs",
  logFileBaseName: "app",
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxBackups: 5,
  minLogLevel: LogLevel.Info
};

interface FileLoggerConfig {
  readonly logDir: string;
  readonly logFileBaseName: string;
  readonly maxFileSize: number;
  readonly maxBackups: number;
  readonly minLogLevel: LogLevel.LogLevel;
}

function logLevelToString(level: LogLevel.LogLevel): string {
  switch (level) {
    case LogLevel.All: return "All";
    case LogLevel.Fatal: return "Fatal";
    case LogLevel.Error: return "Error";
    case LogLevel.Warning: return "Warning";
    case LogLevel.Info: return "Info";
    case LogLevel.Debug: return "Debug";
    case LogLevel.Trace: return "Trace";
    case LogLevel.None: return "None";
    default: return "Unknown";
  }
}

function FileLoggerImpl(config: FileLoggerConfig): Effect.Effect<FileLoggerApi, never> {
  return Effect.gen(function* () {
    let fileHandle: FileHandle | null = null;
    let isInitialized = false;
    const logFilePath = NodePath.join(config.logDir, `${config.logFileBaseName}.log`);
    const writeLock = Ref.unsafeMake(false);

    const initialize = Effect.gen(function* () {
      if (isInitialized) return;
      yield* Effect.tryPromise({
        try: () => NodeFs.mkdir(config.logDir, { recursive: true }),
        catch: (error) => new LoggingServiceError({
          description: `Failed to create log directory: ${error}`,
          module: "FileLogger",
          method: "initialize",
          cause: error
        })
      });
      yield* Effect.tryPromise({
        try: () => NodeFs.access(config.logDir, NodeFs.constants.W_OK),
        catch: (error) => new LoggingServiceError({
          description: `Log directory is not writable: ${error}`,
          module: "FileLogger",
          method: "initialize",
          cause: error
        })
      });
      fileHandle = yield* Effect.tryPromise({
        try: () => NodeFs.open(logFilePath, "a+"),
        catch: (error) => new LoggingServiceError({
          description: `Failed to open log file: ${error}`,
          module: "FileLogger",
          method: "initialize",
          cause: error
        })
      });
      isInitialized = true;
    });

    const writeToFile = (
      level: LogLevel.LogLevel,
      message: string,
      data?: JsonObject
    ): Effect.Effect<void, LoggingServiceError, never> =>
      Effect.gen(function* () {
        yield* initialize;
        if (!fileHandle) {
          yield* Effect.fail(
            new LoggingServiceError({
              description: "Log file not open",
              module: "FileLogger",
              method: "writeToFile"
            })
          );
          return;
        }
        const timestamp = new Date().toISOString();
        const logEntry = JSON.stringify({
          timestamp,
          level: logLevelToString(level),
          message,
          ...data
        }) + "\n";
        while (yield* Ref.get(writeLock)) {
          yield* Effect.sleep("10 millis");
        }
        yield* Ref.set(writeLock, true);
        try {
          yield* Effect.tryPromise({
            try: () => fileHandle!.write(logEntry),
            catch: (error) => new LoggingServiceError({
              description: `Failed to write log entry: ${error}`,
              module: "FileLogger",
              method: "writeToFile",
              cause: error
            })
          });
          yield* Effect.tryPromise({
            try: () => fileHandle!.sync(),
            catch: (error) => new LoggingServiceError({
              description: `Failed to sync log file: ${error}`,
              module: "FileLogger",
              method: "writeToFile",
              cause: error
            })
          });
          const stats = yield* Effect.tryPromise({
            try: () => fileHandle!.stat(),
            catch: (error) => new LoggingServiceError({
              description: `Failed to get file stats: ${error}`,
              module: "FileLogger",
              method: "writeToFile",
              cause: error
            })
          });
          if (stats.size >= config.maxFileSize) {
            // --- Begin log rotation ---
            yield* Effect.tryPromise({
              try: () => fileHandle!.close(),
              catch: (error) => new LoggingServiceError({
                description: `Failed to close log file before rotation: ${error}`,
                module: "FileLogger",
                method: "writeToFile",
                cause: error
              })
            });
            // Rotate backups (n-1 -> n, ..., .log -> .1.log)
            for (let i = config.maxBackups - 1; i >= 1; i--) {
              const src = NodePath.join(config.logDir, `${config.logFileBaseName}.${i}.log`);
              const dest = NodePath.join(config.logDir, `${config.logFileBaseName}.${i+1}.log`);
              const exists = yield* Effect.tryPromise({
                try: () => NodeFs.stat(src),
                catch: () => undefined
              }).pipe(
                Effect.match({
                  onSuccess: () => true,
                  onFailure: () => false
                })
              );
              if (exists) {
                yield* Effect.tryPromise({
                  try: () => NodeFs.rename(src, dest),
                  catch: (error) => new LoggingServiceError({
                    description: `Failed to rotate backup file: ${error}`,
                    module: "FileLogger",
                    method: "writeToFile",
                    cause: error
                  })
                });
              }
            }
            // Rotate main log file to .1.log
            const mainLog = NodePath.join(config.logDir, `${config.logFileBaseName}.log`);
            const firstBackup = NodePath.join(config.logDir, `${config.logFileBaseName}.1.log`);
            const mainExists = yield* Effect.tryPromise({
              try: () => NodeFs.stat(mainLog),
              catch: () => undefined
            }).pipe(
              Effect.match({
                onSuccess: () => true,
                onFailure: () => false
              })
            );
            if (mainExists) {
              yield* Effect.tryPromise({
                try: () => NodeFs.rename(mainLog, firstBackup),
                catch: (error) => new LoggingServiceError({
                  description: `Failed to rotate main log: ${error}`,
                  module: "FileLogger",
                  method: "writeToFile",
                  cause: error
                })
              });
            }
            // Open new log file for writing
            fileHandle = yield* Effect.tryPromise({
              try: () => NodeFs.open(mainLog, "w"),
              catch: (error) => new LoggingServiceError({
                description: `Failed to open new log file after rotation: ${error}`,
                module: "FileLogger",
                method: "writeToFile",
                cause: error
              })
            });
          }
        } finally {
          yield* Ref.set(writeLock, false);
        }
        return;
      });

    const logger: FileLoggerApi = {
      log: (
        level: LogLevel.LogLevel,
        message: string,
        data?: JsonObject
      ) =>
        LogLevel.greaterThanEqual(level, config.minLogLevel)
          ? writeToFile(level, message, data)
          : Effect.void,

      debug: (message: string, data?: JsonObject) =>
        LogLevel.greaterThanEqual(LogLevel.Debug, config.minLogLevel)
          ? writeToFile(LogLevel.Debug, message, data)
          : Effect.void,

      info: (message: string, data?: JsonObject) =>
        LogLevel.greaterThanEqual(LogLevel.Info, config.minLogLevel)
          ? writeToFile(LogLevel.Info, message, data)
          : Effect.void,

      warn: (message: string, data?: JsonObject) =>
        LogLevel.greaterThanEqual(LogLevel.Warning, config.minLogLevel)
          ? writeToFile(LogLevel.Warning, message, data)
          : Effect.void,

      error: (message: string, error?: unknown) => {
        if (!LogLevel.greaterThanEqual(LogLevel.Error, config.minLogLevel)) {
          return Effect.void;
        }
        const errorData: JsonObject = {};
        if (error instanceof Error) {
          errorData.error = error.message;
          if (error.stack) errorData.stack = error.stack;
          if (error.cause) errorData.cause = String(error.cause);
        } else if (error !== undefined) {
          errorData.error = typeof error === "object" ? JSON.stringify(error) : String(error);
        }
        return writeToFile(LogLevel.Error, message, errorData);
      },

      trace: (message: string, data?: JsonObject) =>
        LogLevel.greaterThanEqual(LogLevel.Trace, config.minLogLevel)
          ? writeToFile(LogLevel.Trace, message, data)
          : Effect.void,

      logCause: (level: LogLevel.LogLevel, cause: Cause.Cause<unknown>, data?: JsonObject) =>
        LogLevel.greaterThanEqual(level, config.minLogLevel)
          ? writeToFile(level, Cause.pretty(cause), data)
          : Effect.void,

      logErrorCause: (cause: Cause.Cause<unknown>, data?: JsonObject) =>
        LogLevel.greaterThanEqual(LogLevel.Error, config.minLogLevel)
          ? writeToFile(LogLevel.Error, Cause.pretty(cause), data)
          : Effect.void,

      withContext: (additionalContext: JsonObject) => logger
    };
    return logger;
  });
}

export class FileLogger extends Effect.Service<FileLoggerApi>()(
  "FileLogger",
  {
    effect: Effect.sync(() => {
      throw new Error("FileLogger must be provided via FileLogger.layer(config)");
      // This cast is required for Effect.Service to typecheck
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as unknown as FileLoggerApi;
    })
  }
) {}

export namespace FileLogger {
  export function layer(config: FileLoggerConfig): Layer.Layer<FileLoggerApi> {
    return Layer.effect(FileLogger, FileLoggerImpl(config));
  }
}
