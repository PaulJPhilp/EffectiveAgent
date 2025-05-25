/**
 * @file Simple FileLogger implementation
 * @module ea/services/core/logging/file-logger
 */

import { Effect, LogLevel } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { LoggingServiceError } from "./errors.js";
import { FileLoggerApi } from "./api.js";
import { JsonObject } from "@/types.js";

export interface FileLoggerConfig {
  readonly logDir: string;
  readonly logFileBase: string;
}

/**
 * FileLogger service implementation using Effect.Service pattern
 */
export class FileLogger extends Effect.Service<FileLoggerApi>()(
  "FileLogger",
  {
    effect: Effect.gen(function* (_) {
      // Get dependencies
      const fs = yield* FileSystem.FileSystem;
      
      // Get config
      const config: FileLoggerConfig = {
        logDir: "logs",
        logFileBase: "app"
      };

      // Set up logging path
      const logFilePath = `${config.logDir}/${config.logFileBase}.log`;

      // Ensure log directory exists
      yield* fs.makeDirectory(config.logDir, { recursive: true }).pipe(
        Effect.catchAll((error) =>
          Effect.fail(new LoggingServiceError({
            description: `Failed to create log directory: ${error}`,
            module: "FileLogger",
            method: "makeDirectory",
            cause: error
          }))
        )
      );

      // Basic log function implementation
      const log = (
        level: LogLevel.LogLevel,
        message: string,
        data?: JsonObject
      ): Effect.Effect<void, LoggingServiceError, never> => {
        const entry = {
          timestamp: new Date().toISOString(),
          level: level.toString(),
          message,
          ...(data || {})
        };

        return fs.writeFile(
          logFilePath,
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
      };

      // Return minimal API with only log function
      return { log } as Pick<FileLoggerApi, 'log'>;
    }),
    dependencies: [NodeFileSystem.layer]
  }
) { }
