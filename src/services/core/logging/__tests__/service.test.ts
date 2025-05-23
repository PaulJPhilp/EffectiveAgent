/**
 * @file Tests for the LoggingService implementation.
 */

import type { JsonObject } from "@/types.js";
import { Effect, Cause, LogLevel, Ref } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LoggingServiceApi } from "../api.js";
import { LoggingService, LoggingServiceError, type LoggingConfig } from "../service.js";

describe("LoggingService", () => {
  let tempDir: string;

  beforeEach(() => 
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectory();
      tempDir = dir;
      process.env.LOG_DIR = dir;
    }).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.catchAll((error) => Effect.fail(new LoggingServiceError({
        description: "Failed to create temp directory",
        module: "LoggingService",
        method: "beforeEach",
        cause: error
      })))
    )
  );

  afterEach(() => 
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.remove(tempDir, { recursive: true });
      delete process.env.LOG_DIR;
    }).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.catchAll((error) => Effect.fail(new LoggingServiceError({
        description: "Failed to cleanup temp directory",
        module: "LoggingService",
        method: "afterEach",
        cause: error
      })))
    )
  );

  it("logs messages at different levels", () => 
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const logger = yield* LoggingService;

      // Log messages
      yield* Effect.all([
        logger.debug("debug message"),
        logger.info("info message"),
        logger.warn("warn message"),
        logger.error("error message", new Error("test error"))
      ]);

      // Wait for logs to be written
      yield* Effect.sleep("500 millis");

      // Verify files contain messages
      const [debugContent, infoContent, warnContent, errorContent] = yield* Effect.all([
        fs.readFileString(`${tempDir}/debug.log`),
        fs.readFileString(`${tempDir}/info.log`),
        fs.readFileString(`${tempDir}/warn.log`),
        fs.readFileString(`${tempDir}/error.log`)
      ]);

      expect(debugContent).toContain("debug message");
      expect(infoContent).toContain("info message");
      expect(warnContent).toContain("warn message");
      expect(errorContent).toContain("error message");
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("logs messages with context", () => 
    Effect.gen(function* () {
      const context: JsonObject = { userId: "123", action: "test" };
      const fs = yield* FileSystem.FileSystem;
      const logger = yield* LoggingService;

      // Log message with context
      yield* Effect.all([
        logger.info("info with context", context)
      ]);

      // Wait for logs to be written
      yield* Effect.sleep("500 millis");

      // Verify file contains message and context
      const [content] = yield* Effect.all([
        fs.readFileString(`${tempDir}/info.log`)
      ]);
      expect(content).toContain("info with context");
      expect(content).toContain("123");
      expect(content).toContain("test");
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("logs errors with cause", () => 
    Effect.gen(function* () {
      const error = new Error("Test error");
      const fs = yield* FileSystem.FileSystem;
      const logger = yield* LoggingService;

      // Log error with cause
      yield* Effect.all([
        logger.error("error with cause", error)
      ]);

      // Wait for logs to be written
      yield* Effect.sleep("500 millis");

      // Verify file contains error and cause
      const [content] = yield* Effect.all([
        fs.readFileString(`${tempDir}/error.log`)
      ]);
      expect(content).toContain("error with cause");
      expect(content).toContain("Test error");
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("writes logs to file", () => 
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const logger = yield* LoggingService;

      // Log a test message
      yield* Effect.all([
        logger.info("file test message")
      ]);

      // Wait for logs to be written
      yield* Effect.sleep("500 millis");

      // Verify file exists and contains message
      const [content] = yield* Effect.all([
        fs.readFileString(`${tempDir}/info.log`)
      ]);
      expect(content).toContain("file test message");
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("logs errors with data", () => 
    Effect.gen(function* () {
      const error = new Error("Test error");
      const data: JsonObject = {
        userId: "123",
        action: "test",
        error: {
          message: error.message,
          name: error.name
        }
      };

      const logger = yield* LoggingService;
      yield* logger.error("error with data", error);
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("handles nested JSON objects", () => 
    Effect.gen(function* () {
      const complexData = {
        user: {
          id: "123",
          profile: {
            name: "Test User",
            settings: {
              theme: "dark",
              notifications: true
            }
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          version: "1.0.0"
        }
      };

      const fs = yield* FileSystem.FileSystem;
      const logger = yield* LoggingService;

      // Log complex data
      yield* Effect.all([
        logger.debug("Complex data log", complexData)
      ]);

      // Wait for logs to be written
      yield* Effect.sleep("500 millis");

      // Verify file contains complex data
      const [content] = yield* Effect.all([
        fs.readFileString(`${tempDir}/debug.log`)
      ]);
      expect(content).toContain("Complex data log");
      expect(content).toContain("Test User");
      expect(content).toContain("dark");
      expect(content).toContain("1.0.0");
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("handles arrays in data", () => 
    Effect.gen(function* () {
      const arrayData = {
        items: [1, 2, 3],
        tags: ["test", "logging"],
        nested: [{ id: 1 }, { id: 2 }]
      };

      const fs = yield* FileSystem.FileSystem;
      const logger = yield* LoggingService;

      // Log array data
      yield* Effect.all([
        logger.debug("Array data log", arrayData)
      ]);

      // Wait for logs to be written
      yield* Effect.sleep("500 millis");

      // Verify file contains array data
      const [content] = yield* Effect.all([
        fs.readFileString(`${tempDir}/debug.log`)
      ]);
      expect(content).toContain("Array data log");
      expect(content).toContain("[1,2,3]");
      expect(content).toContain("[\"test\",\"logging\"]");
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    )
  );
});

describe("error handling", () => {
  it("handles custom errors", () => 
    Effect.gen(function* () {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const customError = new CustomError("Custom error occurred", "CUSTOM_001");
      const logger = yield* LoggingService;
      yield* logger.error("Custom error log", customError);
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("handles error causes", () => 
    Effect.gen(function* () {
      const logger = yield* LoggingService;
      const outerCause = Cause.sequential(
        Cause.fail(new Error("Inner error")),
        Cause.sequential(
          Cause.fail(new Error("Parallel error")),
          Cause.fail(new Error("Final error"))
        )
      );

      yield* logger.logErrorCause(outerCause);
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    )
  );
});

describe("log data types", () => {
  it("accepts JSON objects in error logs", () => 
    Effect.gen(function* () {
      const logger = yield* LoggingService;
      yield* logger.error("Error occurred", { errorCode: "E101", details: "Sample details" });
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("accepts empty log messages", () => 
    Effect.gen(function* () {
      const logger = yield* LoggingService;
      yield* logger.info("");
      yield* logger.debug("");
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    )
  );
});
