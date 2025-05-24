/**
 * @file Unified tests for the logging system
 */

import type { JsonObject } from "@/types.js";
import { Effect, Cause, LogLevel } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as NodeFs from "node:fs/promises";
import * as NodePath from "node:path";
import { FileLogger } from "../file-logger.js";
import { LoggingService, LoggingServiceError } from "../service.js";

describe("Logging System", () => {
  describe("FileLogger Implementation", () => {
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

    it("writes a log entry and file is created and flushed", async () => {
      await cleanTestDirectory();

      await Effect.gen(function* () {
        const logger = yield* FileLogger;
        yield* logger.info("Hello FileLogger", { foo: "bar" });
      })
        .pipe(
          Effect.provide(FileLoggerTestLayer),
          Effect.provide(NodeFileSystem.layer)
        )
        .pipe(Effect.runPromise);

      const start = Date.now();
      let content = "";
      while (Date.now() - start < 5000) {
        try {
          content = await NodeFs.readFile(TEST_LOG_PATH, "utf8");
          if (content && content.length > 0) break;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(content).toContain("Hello FileLogger");
      expect(content).toContain("bar");
    });

    it("writes multiple log entries at different levels", async () => {
      await cleanTestDirectory();

      await Effect.gen(function* () {
        const logger = yield* FileLogger;
        yield* logger.info("First entry", { a: 1 });
        yield* logger.debug("Second entry", { b: 2 });
      })
        .pipe(
          Effect.provide(FileLoggerTestLayer),
          Effect.provide(NodeFileSystem.layer)
        )
        .pipe(Effect.runPromise);

      const start = Date.now();
      let content = "";
      while (Date.now() - start < 5000) {
        try {
          content = await NodeFs.readFile(TEST_LOG_PATH, "utf8");
          if (content.includes("First entry") && content.includes("Second entry")) break;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(content).toContain("First entry");
      expect(content).toContain("Second entry");
    });

    it("rotates log files and creates backups when maxFileSize is exceeded", async () => {
      await cleanTestDirectory();

      await Effect.gen(function* () {
        const logger = yield* FileLogger;
        const longEntry = "X".repeat(100);

        // Write enough entries to trigger rotation
        for (let i = 1; i <= 5; i++) {
          yield* logger.info(`entry-${i}: ${longEntry}`);
        }
      })
        .pipe(
          Effect.provide(FileLoggerTestLayer),
          Effect.provide(NodeFileSystem.layer)
        )
        .pipe(Effect.runPromise);

      // Wait for file operations to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check for rotated files
      const files = await NodeFs.readdir(TEST_LOG_DIR);
      const expectedFiles = [
        `${TEST_LOG_FILE}.log`,
        `${TEST_LOG_FILE}.1.log`,
        `${TEST_LOG_FILE}.2.log`
      ];

      // Verify backup files exist and contain content
      let found = false;
      for (const file of files) {
        found = expectedFiles.includes(file);
        if (!found) continue;

        const filePath = NodePath.join(TEST_LOG_DIR, file);
        const content = await NodeFs.readFile(filePath, "utf8");
        
        // Only assert rotated files are non-empty; .log may be empty after rotation
        if (/\.\d+\.log$/.test(file)) {
          expect(content.length).toBeGreaterThan(0);
        }
      }
      expect(found).toBe(true);
    });
  });

  describe("LoggingService Integration", () => {
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

    it("logs messages at different levels with context", () => 
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const logger = yield* LoggingService;
        const context: JsonObject = { userId: "123", action: "test" };

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

        yield* Effect.sleep("500 millis");

        const content = yield* fs.readFileString(`${tempDir}/error.log`);
        expect(content).toContain("Error with cause");
        expect(content).toContain("Nested error");
        expect(content).toContain("Complex error");
        expect(content).toContain("TEST_ERROR");
      }).pipe(
        Effect.provide(NodeFileSystem.layer)
      )
    );
  });
});
