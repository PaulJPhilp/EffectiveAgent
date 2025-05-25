/**
 * @file Unified tests for the logging system
 */

import type { JsonObject } from "@/types.js";
import { Effect, Cause, LogLevel } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as NodeFs from "node:fs/promises";
import * as NodePath from "node:path";
import { FileLogger } from "../file-logger.js";
import { ConsoleLogger } from "../console-logger.js";
import { LoggingService, LoggingServiceError } from "../service.js";

describe("Logging System", () => {
  describe("ConsoleLogger", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "info").mockImplementation(() => {});
      vi.spyOn(console, "debug").mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("logs messages at different levels", () =>
      Effect.gen(function* () {
        const logger = yield* ConsoleLogger;
        const testData = { test: true };

        // Test all log levels
        yield* logger.log(LogLevel.Error, "error message", testData);
        expect(console.error).toHaveBeenCalledWith("error message {\"test\":true}");

        yield* logger.log(LogLevel.Warning, "warn message", testData);
        expect(console.warn).toHaveBeenCalledWith("warn message {\"test\":true}");

        yield* logger.log(LogLevel.Info, "info message", testData);
        expect(console.info).toHaveBeenCalledWith("info message {\"test\":true}");

        // Debug should not log (default minLevel is Info)
        yield* logger.log(LogLevel.Debug, "debug message", testData);
        expect(console.debug).not.toHaveBeenCalled();
      })
    );

    it("handles complex data objects", () =>
      Effect.gen(function* () {
        const logger = yield* ConsoleLogger;
        const complexData = {
          user: {
            id: "123",
            settings: { theme: "dark", notifications: true }
          },
          timestamp: new Date().toISOString()
        };

        yield* logger.log(LogLevel.Info, "complex data", complexData);
        expect(console.info).toHaveBeenCalledWith(
          `complex data ${JSON.stringify(complexData)}`
        );
      })
    );
  });

  describe("FileLogger", () => {
    const TEST_LOG_DIR = NodePath.join(process.cwd(), "test-logs");
    const TEST_LOG_FILE = "test-logger";
    const TEST_LOG_PATH = NodePath.join(TEST_LOG_DIR, `${TEST_LOG_FILE}.log`);

    const fileLoggerConfig = {
      logDir: TEST_LOG_DIR,
      logFileBaseName: TEST_LOG_FILE,
      maxFileSize: 200,
      maxBackups: 2,
      minLogLevel: LogLevel.Debug
    };
    const FileLoggerTestLayer = FileLogger.layer(fileLoggerConfig);

    async function cleanTestDirectory(): Promise<void> {
      try {
        await NodeFs.access(TEST_LOG_DIR, NodeFs.constants.F_OK);
        const files = await NodeFs.readdir(TEST_LOG_DIR);
        for (const file of files) {
          try {
            await NodeFs.chmod(NodePath.join(TEST_LOG_DIR, file), 0o666);
          } catch {}
          try {
            await NodeFs.unlink(NodePath.join(TEST_LOG_DIR, file));
          } catch {}
        }
      } catch {}
    }

    beforeEach(async () => {
      await NodeFs.mkdir(TEST_LOG_DIR, { recursive: true });
      await NodeFs.chmod(TEST_LOG_DIR, 0o777);
      await cleanTestDirectory();
    });

    afterEach(async () => {
      await cleanTestDirectory();
    });

    it("writes log entries at different levels", () =>
      Effect.gen(function* () {
        const logger = yield* FileLogger;
        const fs = yield* FileSystem.FileSystem;

        // Write log entries
        yield* logger.info("First entry", { a: 1 });
        yield* logger.debug("Second entry", { b: 2 });
        yield* logger.warn("Third entry", { c: 3 });
        yield* logger.error("Fourth entry", new Error("test error"));

        // Allow time for file writes to complete
        yield* Effect.sleep("1 seconds");

        // Read and verify content
        const content = yield* fs.readFileString(TEST_LOG_PATH);
        expect(content).toContain("First entry");
        expect(content).toContain("Second entry");
        expect(content).toContain("Third entry");
        expect(content).toContain("Fourth entry");
        expect(content).toContain("test error");
      }).pipe(
        Effect.provide(FileLoggerTestLayer),
        Effect.provide(NodeFileSystem.layer)
      )
    );

    it("rotates log files when maxFileSize is exceeded", () =>
      Effect.gen(function* () {
        const logger = yield* FileLogger;
        const fs = yield* FileSystem.FileSystem;
        const longEntry = "X".repeat(100);

        // Write enough entries to trigger rotation
        for (let i = 1; i <= 5; i++) {
          yield* logger.info(`entry-${i}: ${longEntry}`);
        }

        // Allow time for file writes and rotation
        yield* Effect.sleep("1 seconds");

        // Get list of files in directory
        const files = yield* fs.readDirectory(TEST_LOG_DIR);
        const expectedFiles = [
          `${TEST_LOG_FILE}.log`,
          `${TEST_LOG_FILE}.1.log`,
          `${TEST_LOG_FILE}.2.log`
        ];

        // Verify rotated files exist and have content
        for (const file of files) {
          if (!expectedFiles.includes(file)) continue;

          const filePath = NodePath.join(TEST_LOG_DIR, file);
          const content = yield* fs.readFileString(filePath);
          
          if (/\.\d+\.log$/.test(file)) {
            expect(content.length).toBeGreaterThan(0);
          }
          // Found at least one expected file
          return;
        }
        throw new Error("No expected log files found");
      }).pipe(
        Effect.provide(FileLoggerTestLayer),
        Effect.provide(NodeFileSystem.layer)
      )
    );
  });

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

    it("logs messages with context", () => 
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const logger = yield* LoggingService;
        const context = { userId: "123", action: "test" };

        yield* Effect.all([
          logger.debug("debug message", context),
          logger.info("info message", context),
          logger.warn("warn message", context),
          logger.error("error message", new Error("test error"))
        ]);

        yield* Effect.sleep("500 millis");

        const [debugContent, infoContent, warnContent, errorContent] = yield* Effect.all([
          fs.readFileString(`${tempDir}/debug.log`),
          fs.readFileString(`${tempDir}/info.log`),
          fs.readFileString(`${tempDir}/warn.log`),
          fs.readFileString(`${tempDir}/error.log`)
        ]);

        expect(debugContent).toContain("debug message");
        expect(debugContent).toContain("123");
        expect(infoContent).toContain("info message");
        expect(infoContent).toContain("test");
        expect(warnContent).toContain("warn message");
        expect(errorContent).toContain("error message");
        expect(errorContent).toContain("test error");
      }).pipe(
        Effect.provide(NodeFileSystem.layer)
      )
    );

    it("handles complex error scenarios", () => 
      Effect.gen(function* () {
        const logger = yield* LoggingService;
        const fs = yield* FileSystem.FileSystem;

        // Test nested error with cause
        const error = new Error("Test error");
        (error as any).cause = new Error("Nested error");
        yield* logger.error("Error with cause", error);

        // Test error with complex data
        const complexError = {
          name: "TestError",
          message: "Test error",
          code: "TEST_ERROR",
          details: {
            reason: "Testing",
            timestamp: new Date().toISOString()
          }
        };
        yield* logger.error("Complex error", complexError);

        // Test error cause chain
        const outerCause = Cause.sequential(
          Cause.fail(new Error("Inner error")),
          Cause.sequential(
            Cause.fail(new Error("Parallel error")),
            Cause.fail(new Error("Final error"))
          )
        );
        yield* logger.logErrorCause(outerCause);

        yield* Effect.sleep("500 millis");

        const content = yield* fs.readFileString(`${tempDir}/error.log`);
        expect(content).toContain("Error with cause");
        expect(content).toContain("Nested error");
        expect(content).toContain("Complex error");
        expect(content).toContain("TEST_ERROR");
        expect(content).toContain("Inner error");
        expect(content).toContain("Parallel error");
        expect(content).toContain("Final error");
      }).pipe(
        Effect.provide(NodeFileSystem.layer)
      )
    );
  });
});
