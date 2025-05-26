import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer, Logger, LogLevel } from "effect";
import path from "path";
import { makeFileLogger } from "@/services/core/logging/file-logger.js";
import { beforeAll, describe, expect, it } from "vitest";

describe("FileLogger", () => {
  let loggerLive: Layer.Layer<never, any, never>;
  let testFile: string;

  // Helper to create a test directory path
  const getTestDir = () => {
    const projectRoot = process.cwd();
    const testDir = path.join(projectRoot, "test-logs");
    return testDir;
  };

  // Helper to create a test file path
  const getTestFile = () => {
    const testId = Math.random().toString(36).slice(2);
    return path.join("test-logs", `test-${testId}.log`);
  };

  // Helper to read file contents
  const readLogFile = (logFile: string) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const exists = yield* fs.exists(logFile);
      if (!exists) {
        return "";
      }
      const contents = yield* fs.readFile(logFile);
      return contents.toString();
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    );

  beforeAll(() => {
    testFile = path.join(process.cwd(), "logs", "test.log");
    loggerLive = makeFileLogger({
      logDir: path.dirname(testFile),
      logFileBase: path.basename(testFile, ".log")
    });
  });

  it("should create log directory and file if they don't exist", () =>
    Effect.gen(function* () {
      // Keep logs for inspection

      // Log something
      yield* Effect.log("Test message").pipe(
        Effect.provide(loggerLive)
      );

      // Verify file exists and contains the message
      const contents = yield* readLogFile(testFile);
      expect(contents).toContain("Test message");
      expect(contents).toContain("level=INFO");
    })
  );

  it("should write logs in logfmt format", () => {
    // Create the test Effect
    const test = Effect.gen(function* () {
      // Log with context
      yield* Effect.log("Test with context").pipe(
        Effect.annotateLogs({
          userId: "123",
          action: "login"
        })
      );

      // Verify logfmt format
      const contents = yield* readLogFile(testFile);
      expect(contents).toContain("level=INFO");
      expect(contents).toContain("message=\"Test with context\"");
      expect(contents).toContain("userId=123");
      expect(contents).toContain("action=login");
    });

    // Run the test with logger
    return Effect.runFork(test.pipe(
      Effect.catchAll(() => Effect.succeed(undefined)),
      Effect.provide(loggerLive)
    ));
  });

  it("should handle different log levels", () => {
    // Create the test Effect
    const test = Effect.gen(function* () {
      // Log at different levels
      yield* Effect.log("Debug message").pipe(
        Effect.provide(Logger.minimumLogLevel(LogLevel.Debug))
      );
      yield* Effect.log("Info message");
      yield* Effect.log("Warning message").pipe(
        Effect.provide(Logger.minimumLogLevel(LogLevel.Warning))
      );
      yield* Effect.log("Error message").pipe(
        Effect.provide(Logger.minimumLogLevel(LogLevel.Error))
      );

      // Verify all levels are logged correctly
      const contents = yield* readLogFile(testFile);
      expect(contents).toContain("level=DEBUG");
      expect(contents).toContain("level=INFO");
      expect(contents).toContain("level=WARNING");
      expect(contents).toContain("level=ERROR");
    });

    // Run the test with logger
    return Effect.runFork(test.pipe(
      Effect.catchAll(() => Effect.succeed(undefined)),
      Effect.provide(loggerLive)
    ));
  });

  it("should handle multiple log files", () =>
    Effect.gen(function* () {
      // Keep logs for inspection

      // Create two loggers with different files
      const file1 = getTestFile();
      const file2 = getTestFile();

      const logger1 = makeFileLogger({
        logDir: path.dirname(file1),
        logFileBase: path.basename(file1, ".log")
      });

      const logger2 = makeFileLogger({
        logDir: path.dirname(file2),
        logFileBase: path.basename(file2, ".log")
      });

      // Log to both files
      yield* Effect.log("Message to file 1").pipe(
        Effect.provide(logger1)
      );
      yield* Effect.log("Message to file 2").pipe(
        Effect.provide(logger2)
      );

      // Verify each file has correct content
      const contents1 = yield* readLogFile(file1);
      const contents2 = yield* readLogFile(file2);

      expect(contents1).toContain("Message to file 1");
      expect(contents1).not.toContain("Message to file 2");
      expect(contents2).toContain("Message to file 2");
      expect(contents2).not.toContain("Message to file 1");
    })
  );

  it("should handle different log levels", () => {
    // Create the test Effect
    const test = Effect.gen(function* () {
      // Log at different levels
      yield* Effect.log("Debug message").pipe(
        Effect.provide(Logger.minimumLogLevel(LogLevel.Debug)),
        Effect.provide(loggerLive)
      );
      yield* Effect.log("Info message").pipe(
        Effect.provide(loggerLive)
      );
      yield* Effect.log("Warning message").pipe(
        Effect.provide(Logger.minimumLogLevel(LogLevel.Warning)),
        Effect.provide(loggerLive)
      );
      yield* Effect.log("Error message").pipe(
        Effect.provide(Logger.minimumLogLevel(LogLevel.Error)),
        Effect.provide(loggerLive)
      );

      // Verify all levels are logged correctly
      const contents = yield* readLogFile(testFile);
      expect(contents).toContain("level=DEBUG");
      expect(contents).toContain("level=INFO");
      expect(contents).toContain("level=WARNING");
      expect(contents).toContain("level=ERROR");
      expect(contents).toContain("Debug message");
      expect(contents).toContain("Info message");
      expect(contents).toContain("Warning message");
      expect(contents).toContain("Error message");
    });

    // Run the test with logger
    Effect.runFork(test);
  });
});
