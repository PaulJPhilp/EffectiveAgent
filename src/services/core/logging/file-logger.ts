/**
 * @file Simple FileLogger implementation
 * @module ea/services/core/logging/file-logger
 */

import { FileSystem, PlatformLogger } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Logger, Layer } from "effect";

import { Schema } from "effect";
import path from "path";

export const FileLoggerConfigSchema = Schema.Struct({
  logDir: Schema.String,
  logFileBase: Schema.String,
  maxFileSize: Schema.optional(Schema.Number),
  maxFiles: Schema.optional(Schema.Number),
  bufferSize: Schema.optional(Schema.Number)
});

export interface FileLoggerConfig {
  readonly logDir: string
  readonly logFileBase: string
  readonly maxFileSize?: number
  readonly maxFiles?: number
  readonly bufferSize?: number
}

/**
 * Default configuration for file logger
 */
export const DEFAULT_CONFIG: FileLoggerConfig = {
  logDir: "logs",
  logFileBase: "app",
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  bufferSize: 1024 * 8 // 8KB
};

export const makeFileLogger = (config: FileLoggerConfig = DEFAULT_CONFIG) => {
  // Create a string-based logger (logfmtLogger in this case)
  const myStringLogger = Logger.logfmtLogger

  // Apply toFile to write logs to configured path
  const fileLogger = myStringLogger.pipe(
    PlatformLogger.toFile("/Users/paul/Projects/EffectiveAgent/logs/app.log")
  )

  // Replace the default logger, providing NodeFileSystem
  // to access the file system
  const LoggerLive = Logger.replaceScoped(
    Logger.defaultLogger,
    fileLogger
  ).pipe(Layer.provide(NodeFileSystem.layer))

  return LoggerLive
}