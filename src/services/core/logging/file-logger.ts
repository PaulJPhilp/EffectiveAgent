/**
 * @file Implementation of file-based logging for the LoggingService.
 * This module provides a FileLogger that writes logs to a file with rotation support.
 */

import { Cause, Effect, LogLevel, pipe } from 'effect';
import type { JsonObject } from './types.js';
import * as NodePath from 'node:path';
import * as NodeFs from 'node:fs/promises';
import type { LoggingServiceApi } from './api.js';

type FileHandle = Awaited<ReturnType<typeof NodeFs.open>>;

/**
 * Configuration options for the FileLogger.
 */
export interface FileLoggerConfig {
  /** Base directory where log files will be stored */
  logDir: string;
  
  /** Base name for log files */
  logFileBaseName: string;
  
  /** Maximum size of a log file in bytes before rotation */
  maxFileSize: number;
  
  /** Maximum number of backup log files to keep */
  maxBackups: number;
  
  /** Minimum log level to output */
  minLogLevel: LogLevel.LogLevel;
}

// Default configuration values
const DEFAULT_LOG_DIR = "logs";
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_BACKUPS = 5;

/**
 * Default configuration values for FileLogger.
 */
export const DEFAULT_FILE_LOGGER_CONFIG: FileLoggerConfig = {
  logDir: DEFAULT_LOG_DIR,
  logFileBaseName: 'app',
  maxFileSize: DEFAULT_MAX_FILE_SIZE,
  maxBackups: DEFAULT_MAX_BACKUPS,
  minLogLevel: LogLevel.Info
};

/**
 * Converts a LogLevel to its string representation.
 */
function getLogLevelString(level: LogLevel.LogLevel): string {
  if (LogLevel.lessThan(level, LogLevel.Info)) return 'TRACE';
  if (LogLevel.lessThan(level, LogLevel.Warning)) return 'DEBUG';
  if (LogLevel.lessThan(level, LogLevel.Error)) return 'INFO';
  if (LogLevel.lessThan(level, LogLevel.Fatal)) return 'WARN';
  if (LogLevel.lessThan(level, LogLevel.None)) return 'ERROR';
  return 'FATAL';
}

/**
 * A logger that writes logs to a file with rotation support.
 */
export class FileLogger {
  private fileHandle: NodeFs.FileHandle | null = null;
  private currentLogSize = 0;
  private isInitialized = false;
  private logFilePath: string;
  private logFn: LoggingServiceApi['log'];

  constructor(private config: FileLoggerConfig = DEFAULT_FILE_LOGGER_CONFIG) {
    this.logFilePath = NodePath.join(config.logDir, `${config.logFileBaseName}.log`);
    
    // Initialize the log function with proper this binding
    this.logFn = (level: LogLevel.LogLevel, message: string, data?: JsonObject) => {
      if (LogLevel.lessThan(level, this.config.minLogLevel)) {
        return Effect.succeed(undefined);
      }
      return this.writeToFile(level, message, data);
    };
  }

  /**
   * Initializes the logger by creating the log directory and opening the log file.
   */
  public initialize(): Effect.Effect<void, Error> {
    const config = this.config;
    const logFilePath = this.logFilePath;
    const self = this;
    return Effect.gen(function*() {
      // Create log directory if it doesn't exist
      yield* Effect.tryPromise({
        try: () => NodeFs.mkdir(config.logDir, { recursive: true }),
        catch: (error) => new Error(`Failed to create log directory: ${error}`)
      });

      // Open the log file
      const fileHandle = yield* Effect.tryPromise({
        try: () => NodeFs.open(logFilePath, 'a+'),
        catch: (error) => new Error(`Failed to open log file: ${error}`)
      });

      // Get current file size
      const stats = yield* Effect.tryPromise({
        try: () => fileHandle.stat(),
        catch: (error) => new Error(`Failed to get file stats: ${error}`)
      });

      self.fileHandle = fileHandle;
      self.currentLogSize = stats.size;
      self.isInitialized = true;
      
      return Effect.void;
    });
  }

  /**
   * Writes a log entry to the log file.
   */
  private writeToFile(level: LogLevel.LogLevel, message: string, data?: JsonObject): Effect.Effect<void> {
    const self = this;
    return Effect.gen(function*() {
      if (!self.fileHandle) {
        return yield* Effect.fail(new Error('Log file not open'));
      }

      const timestamp = new Date().toISOString();
      const levelStr = getLogLevelString(level);
      const logEntry = JSON.stringify({
        timestamp,
        level: levelStr,
        message,
        ...data
      }) + '\n';

      const writeResult = yield* Effect.tryPromise({
        try: () => self.fileHandle!.write(logEntry),
        catch: (error) => new Error(`Failed to write log entry: ${error}`)
      });
      if (writeResult instanceof Error) {
        return yield* Effect.fail(writeResult);
      }
      self.currentLogSize += Buffer.byteLength(logEntry, 'utf8');

      // Rotate log file if it exceeds max size
      if (self.currentLogSize > self.config.maxFileSize) {
        yield* self.rotateLogFile();
      }
      return Effect.void;
    }).pipe(Effect.catchAll(error => 
      Effect.sync(() => {
        console.error('Failed to write log entry:', error);
        return Effect.void;
      })
    ));
  }

  /**
   * Rotates the log file by renaming the current file and creating a new one.
   */
  private rotateLogFile(): Effect.Effect<void, Error> {
    const self = this;
    return Effect.gen(function*() {
      if (!self.fileHandle) {
        return yield* Effect.fail(new Error('Log file not open'));
      }

      const closeResult = yield* Effect.try({
        try: () => self.fileHandle!.close(),
        catch: (error) => new Error(`Failed to close log file: ${error}`)
      });
      if (closeResult instanceof Error) {
        console.error('Failed to rotate log file:', closeResult);
        return yield* Effect.fail(closeResult);
      }
      self.fileHandle = null;

      // Generate a timestamp for the rotated file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFilePath = NodePath.join(
        self.config.logDir,
        `${self.config.logFileBaseName}-${timestamp}.log`
      );

      const renameResult = yield* Effect.try({
        try: () => NodeFs.rename(self.logFilePath, rotatedFilePath),
        catch: (error) => new Error(`Failed to rename log file: ${error}`)
      });
      if (renameResult instanceof Error) {
        console.error('Failed to rotate log file:', renameResult);
        return yield* Effect.fail(renameResult);
      }

      // Reopen the log file
      const initResult = yield* Effect.try({
        try: () => self.initialize(),
        catch: (error) => new Error(`Failed to initialize log file: ${error}`)
      });
      if (initResult instanceof Error) {
        console.error('Failed to rotate log file:', initResult);
        return yield* Effect.fail(initResult);
      }
      return Effect.void;
    }).pipe(Effect.catchAll(error => 
      Effect.sync(() => {
        console.error('Failed to rotate log file:', error);
        return Effect.void;
      })
    ));
  }

  /**
   * Creates a logging service API that can be used by the LoggingService.
   */
  createLoggingService(): LoggingServiceApi {
    const self = this;
    const service: LoggingServiceApi = {
      log: (level: LogLevel.LogLevel, message: string, data?: JsonObject) => 
        self.logFn(level, message, data),
      
      debug: (message: string, data?: JsonObject) => 
        self.logFn(LogLevel.Debug, message, data),
      
      info: (message: string, data?: JsonObject) => 
        self.logFn(LogLevel.Info, message, data),
      
      warn: (message: string, data?: JsonObject) => 
        self.logFn(LogLevel.Warning, message, data),
      
      error: (message: string, data?: JsonObject | Error) => 
        self.logFn(LogLevel.Error, message, data instanceof Error ? { error: data.message } : data),
      
      trace: (message: string, data?: JsonObject) => 
        self.logFn(LogLevel.Trace, message, data),
      
      logCause: (level: LogLevel.LogLevel, cause: Cause.Cause<unknown>) => {
        const message = Cause.pretty(cause);
        return self.logFn(level, message, { cause: { message } });
      },
      
      logErrorCause: (cause: Cause.Cause<unknown>) => {
        const message = Cause.pretty(cause);
        return self.logFn(LogLevel.Error, message, { cause: { message } });
      },

      withContext: <T extends JsonObject>(context: T): LoggingServiceApi => {
        return {
          log: (level: LogLevel.LogLevel, message: string, data?: JsonObject) => 
            self.logFn(level, message, { ...context, ...data }),
          
          debug: (message: string, data?: JsonObject) => 
            self.logFn(LogLevel.Debug, message, { ...context, ...data }),
          
          info: (message: string, data?: JsonObject) => 
            self.logFn(LogLevel.Info, message, { ...context, ...data }),
          
          warn: (message: string, data?: JsonObject) => 
            self.logFn(LogLevel.Warning, message, { ...context, ...data }),
          
          error: (message: string, data?: JsonObject | Error) => 
            self.logFn(LogLevel.Error, message, { ...context, ...(data instanceof Error ? { error: data.message } : data) }),
          
          trace: (message: string, data?: JsonObject) => 
            self.logFn(LogLevel.Trace, message, { ...context, ...data }),
          
          logCause: (level: LogLevel.LogLevel, cause: Cause.Cause<unknown>) => {
            const message = Cause.pretty(cause);
            return self.logFn(level, message, { ...context, cause: { message } });
          },
          
          logErrorCause: (cause: Cause.Cause<unknown>) => {
            const message = Cause.pretty(cause);
            return self.logFn(LogLevel.Error, message, { ...context, cause: { message } });
          },

          withContext: <U extends JsonObject>(additionalContext: U): LoggingServiceApi => {
            return service.withContext({ ...context, ...additionalContext });
          }
        };
      }
    };
    return service;
  }

  /**
   * Closes the file logger and releases resources.
   */
  close(): Effect.Effect<void, Error> {
    const self = this;
    return Effect.gen(function*() {
      if (self.fileHandle) {
        yield* Effect.tryPromise({
          try: () => self.fileHandle!.close(),
          catch: (error) => new Error(`Failed to close log file: ${error}`)
        });
      }
      self.isInitialized = false;
      return Effect.void;
    });
  }
}
