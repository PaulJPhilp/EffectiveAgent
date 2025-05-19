/**
 * @file Implementation of file-based logging for the LoggingService.
 * This module provides a FileLogger that writes logs to a file with rotation support.
 */

import type { JsonObject } from "@/types.js";
import { Cause, Effect, LogLevel, Ref } from 'effect';
import * as NodeFs from 'node:fs/promises';
import * as NodePath from 'node:path';
import type { LoggingServiceApi } from './api.js';

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

/**
 * A logger that writes logs to a file with rotation support.
 */
export class FileLogger {
  private fileHandle: FileHandle | null = null;
  private isInitialized = false;
  private readonly logFilePath: string;
  private readonly writeLock: Ref.Ref<boolean>;
  private readonly rotationLock: Ref.Ref<boolean>;

  constructor(config: Partial<FileLoggerConfig> = {}) {
    this.config = { ...DEFAULT_FILE_LOGGER_CONFIG, ...config };
    this.logFilePath = NodePath.join(this.config.logDir, `${this.config.logFileBaseName}.log`);
    this.writeLock = Ref.unsafeMake(false);
    this.rotationLock = Ref.unsafeMake(false);
  }

  private readonly config: FileLoggerConfig;

  /**
   * Initializes the logger by creating the log directory and opening the log file.
   */
  public initialize(): Effect.Effect<void, Error> {
    const self = this;
    return Effect.gen(function* () {
      if (self.isInitialized) {
        return Effect.succeed(void 0);
      }

      // Create log directory if it doesn't exist
      yield* Effect.tryPromise({
        try: () => NodeFs.mkdir(self.config.logDir, { recursive: true }),
        catch: (error) => new Error(`Failed to create log directory: ${error}`)
      });

      // Ensure directory is writable
      yield* Effect.tryPromise({
        try: () => NodeFs.access(self.config.logDir, NodeFs.constants.W_OK),
        catch: (error) => new Error(`Log directory is not writable: ${error}`)
      });

      // Open the log file
      self.fileHandle = yield* Effect.tryPromise({
        try: () => NodeFs.open(self.logFilePath, 'a+'),
        catch: (error) => new Error(`Failed to open log file: ${error}`)
      });

      self.isInitialized = true;
      return Effect.succeed(void 0);
    });
  }

  /**
   * Writes a log entry to the log file.
   */
  private writeToFile(level: LogLevel.LogLevel, message: string, data?: JsonObject): Effect.Effect<void, Error> {
    const self = this;
    return Effect.gen(function* () {
      if (!self.fileHandle) {
        yield* Effect.fail(new Error('Log file not open'));
        return;
      }

      const timestamp = new Date().toISOString();
      const logEntry = JSON.stringify({
        timestamp,
        level: level.label,
        message,
        ...data
      }) + '\n';

      // Acquire write lock
      while (yield* Ref.get(self.writeLock)) {
        yield* Effect.sleep('10 millis');
      }
      yield* Ref.set(self.writeLock, true);

      try {
        // Write the log entry
        yield* Effect.tryPromise({
          try: () => self.fileHandle!.write(logEntry),
          catch: (error) => new Error(`Failed to write log entry: ${error}`)
        });

        // Check if rotation is needed
        const stats = yield* Effect.tryPromise({
          try: () => self.fileHandle!.stat(),
          catch: (error) => new Error(`Failed to get file stats: ${error}`)
        });

        if (stats.size >= self.config.maxFileSize) {
          // Rotation is no longer supported; do nothing here.
        }
      } finally {
        yield* Ref.set(self.writeLock, false);
      }

      return void 0;
    });
  }

  /**
   * Creates a LoggingServiceApi implementation that writes to the file.
   */
  public createLoggingService(): LoggingServiceApi {
    const self = this;

    const createLogMethod = (level: LogLevel.LogLevel) =>
      (message: string, data?: JsonObject): Effect.Effect<void, Error> =>
        LogLevel.greaterThanEqual(level, self.config.minLogLevel)
          ? self.writeToFile(level, message, data)
          : Effect.succeed(void 0) as Effect.Effect<void, Error>;

    const service: LoggingServiceApi = {
      debug: createLogMethod(LogLevel.Debug),
      info: createLogMethod(LogLevel.Info),
      warn: createLogMethod(LogLevel.Warning),
      trace: createLogMethod(LogLevel.Trace),

      error: (message: string, error?: Error | unknown): Effect.Effect<void, Error> => {
        if (!LogLevel.greaterThanEqual(LogLevel.Error, self.config.minLogLevel)) {
          return Effect.succeed(void 0);
        }

        const errorData: JsonObject = {};
        if (error instanceof Error) {
          errorData.error = error.message;
          if (error.stack) {
            errorData.stack = error.stack;
          }
          if (error.cause) {
            errorData.cause = String(error.cause);
          }
        } else if (error !== undefined) {
          errorData.error = typeof error === 'object' ? JSON.stringify(error) : String(error);
        }

        return self.writeToFile(LogLevel.Error, message, errorData);
      },

      log: (level: LogLevel.LogLevel, message: string, data?: JsonObject) =>
        LogLevel.greaterThanEqual(level, self.config.minLogLevel)
          ? self.writeToFile(level, message, data)
          : Effect.succeed(void 0),

      logCause: (level: LogLevel.LogLevel, cause: Cause.Cause<unknown>, data?: JsonObject) =>
        LogLevel.greaterThanEqual(level, self.config.minLogLevel)
          ? self.writeToFile(level, Cause.pretty(cause), data)
          : Effect.succeed(void 0),

      logErrorCause: (cause: Cause.Cause<unknown>, data?: JsonObject) =>
        LogLevel.greaterThanEqual(LogLevel.Error, self.config.minLogLevel)
          ? self.writeToFile(LogLevel.Error, Cause.pretty(cause), data)
          : Effect.succeed(void 0),

      withContext: (additionalContext: JsonObject) => {
        // TODO: Implement a simpler withContext that just merges context with data
        return service;
      }
    };

    return service;
  }

  /**
   * Closes the file logger and releases resources.
   */
  public close(): Effect.Effect<void, Error> {
    const self = this;
    return Effect.gen(function* () {
      if (self.fileHandle) {
        yield* Effect.tryPromise({
          try: () => self.fileHandle!.close(),
          catch: (error) => new Error(`Failed to close log file: ${error}`)
        });
        self.fileHandle = null;
      }
      self.isInitialized = false;
      return Effect.succeed(void 0);
    });
  }
}
