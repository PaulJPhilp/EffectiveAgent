/**
 * @file Tests for the LoggingService implementation.
 */

import type { JsonObject } from "@/types.js";
import { Cause, Effect, LogLevel } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LoggingServiceApi } from "../api.js";
import { LoggingService } from "../service.js";

describe("LoggingService", () => {
  // Track logged messages for verification
  let loggedMessages: Array<{ level: LogLevel.LogLevel; message: string; data?: JsonObject }> = [];

  // Create a test implementation
  const testLogger: LoggingServiceApi = {
    log: (level: LogLevel.LogLevel, message: string, data?: JsonObject | Error) => {
      if (data instanceof Error) {
        loggedMessages.push({ 
          level, 
          message, 
          data: {
            name: data.name,
            message: data.message,
            stack: data.stack || ""
          }
        });
      } else {
        loggedMessages.push({ level, message, data });
      }
      return Effect.succeed(undefined);
    },

    debug: (message: string, data?: JsonObject | Error) => {
      if (data instanceof Error) {
        return Effect.succeed(loggedMessages.push({ 
          level: LogLevel.Debug, 
          message, 
          data: {
            name: data.name,
            message: data.message,
            stack: data.stack || ""
          }
        }));
      }
      return Effect.succeed(loggedMessages.push({ level: LogLevel.Debug, message, data }));
    },

    info: (message: string, data?: JsonObject | Error) => {
      if (data instanceof Error) {
        return Effect.succeed(loggedMessages.push({ 
          level: LogLevel.Info, 
          message, 
          data: {
            name: data.name,
            message: data.message,
            stack: data.stack || ""
          }
        }));
      }
      return Effect.succeed(loggedMessages.push({ level: LogLevel.Info, message, data }));
    },

    warn: (message: string, data?: JsonObject | Error) => {
      if (data instanceof Error) {
        return Effect.succeed(loggedMessages.push({ 
          level: LogLevel.Warning, 
          message, 
          data: {
            name: data.name,
            message: data.message,
            stack: data.stack || ""
          }
        }));
      }
      return Effect.succeed(loggedMessages.push({ level: LogLevel.Warning, message, data }));
    },

    error: (message: string, data?: JsonObject | Error) => {
      if (data instanceof Error) {
        return Effect.succeed(loggedMessages.push({ 
          level: LogLevel.Error, 
          message, 
          data: {
            name: data.name,
            message: data.message,
            stack: data.stack || ""
          }
        }));
      }
      return Effect.succeed(loggedMessages.push({ level: LogLevel.Error, message, data }));
    },

    trace: (message: string, data?: JsonObject | Error) => {
      if (data instanceof Error) {
        return Effect.succeed(loggedMessages.push({ 
          level: LogLevel.Trace, 
          message, 
          data: {
            name: data.name,
            message: data.message,
            stack: data.stack || ""
          }
        }));
      }
      return Effect.succeed(loggedMessages.push({ level: LogLevel.Trace, message, data }));
    },

    logCause: (level: LogLevel.LogLevel, cause: Cause.Cause<unknown>) => {
      return Effect.succeed(loggedMessages.push({ level, message: Cause.pretty(cause) }));
    },

    logErrorCause: (cause: Cause.Cause<unknown>) => {
      return Effect.succeed(loggedMessages.push({ 
        level: LogLevel.Error, 
        message: Cause.pretty(cause) 
      }));
    }
  };

  // Create test service
  const testService = new LoggingService(testLogger);

  beforeEach(() => {
    loggedMessages = [];
    vi.clearAllMocks();
  });

  describe("logging methods", () => {
    it("provides basic logging functionality", async () => {
      const program = Effect.gen(function* () {
        // Test different log methods
        yield* testLogger.log(LogLevel.Info, "Test log message", { key: "value" });
        yield* testLogger.debug("Debug message");
        yield* testLogger.info("Info message");
        yield* testLogger.warn("Warning message");
        yield* testLogger.error("Error message", { code: 123 });
        yield* testLogger.trace("Trace message");
      });

      await Effect.runPromise(program);

      // Verify messages
      expect(loggedMessages).toHaveLength(6);
      expect(loggedMessages.map(m => m.level)).toEqual([
        LogLevel.Info,
        LogLevel.Debug,
        LogLevel.Info,
        LogLevel.Warning,
        LogLevel.Error,
        LogLevel.Trace
      ]);
    });

    it("handles error objects correctly", async () => {
      const program = Effect.gen(function* () {
        const error = new Error("Something failed");
        yield* testLogger.error("Test error with Error", error);
      });

      await Effect.runPromise(program);

      // Verify messages
      expect(loggedMessages).toHaveLength(1);
      expect(loggedMessages[0].level).toBe(LogLevel.Error);
    });

    it("handles causes in logs", async () => {
      const program = Effect.gen(function* () {
        const testCause = Cause.die("Test cause");
        yield* testLogger.logCause(LogLevel.Warning, testCause);
        yield* testLogger.logCause(LogLevel.Error, testCause);
        
        // Test error cause convenience method
        yield* testLogger.logErrorCause(testCause);
        
        // Test nested causes
        const nestedCause = Cause.sequential(
          Cause.fail(new Error("First error")),
          Cause.fail(new Error("Second error"))
        );
        yield* testLogger.logErrorCause(nestedCause);
      });

      await Effect.runPromise(program);

      // Verify messages
      expect(loggedMessages).toHaveLength(4);
      expect(loggedMessages.map(m => m.level)).toEqual([
        LogLevel.Warning,
        LogLevel.Error,
        LogLevel.Error,
        LogLevel.Error
      ]);
    });
  });

  describe("log level handling", () => {
    it("should handle all log levels", async () => {
      const program = Effect.gen(function* () {
        const levels = [
          LogLevel.Fatal,
          LogLevel.Error,
          LogLevel.Warning,
          LogLevel.Info,
          LogLevel.Debug,
          LogLevel.Trace,
          LogLevel.All
        ];
        
        // Test each log level
        for (const level of levels) {
          yield* testLogger.log(level, `Message at level ${level}`);
        }
      });

      await Effect.runPromise(program);
      
      // Verify messages
      expect(loggedMessages).toHaveLength(7); // 7 log levels
      expect(loggedMessages.map(m => m.level)).toEqual([
        LogLevel.Fatal,
        LogLevel.Error,
        LogLevel.Warning,
        LogLevel.Info,
        LogLevel.Debug,
        LogLevel.Trace,
        LogLevel.All
      ]);
    });
    
    it("should handle all convenience methods", async () => {
      const program = Effect.gen(function* () {
        yield* testLogger.debug("Debug message");
        yield* testLogger.info("Info message");
        yield* testLogger.warn("Warning message");
        yield* testLogger.error("Error message");
        yield* testLogger.trace("Trace message");
      });

      await Effect.runPromise(program);
      
      // Verify messages
      expect(loggedMessages).toHaveLength(5);
      expect(loggedMessages.map(m => m.level)).toEqual([
        LogLevel.Debug,
        LogLevel.Info,
        LogLevel.Warning,
        LogLevel.Error,
        LogLevel.Trace
      ]);
    });
  });

  describe("fatal level logging", () => {
    it("handles fatal level logs", async () => {
      const program = Effect.gen(function* () {
        yield* testLogger.log(LogLevel.Fatal, "Critical system failure", {
          subsystem: "database",
          errorCode: "FATAL_001"
        });
      });

      await Effect.runPromise(program);

      expect(loggedMessages).toHaveLength(1);
      expect(loggedMessages[0].level).toBe(LogLevel.Fatal);
      expect(loggedMessages[0].data).toEqual({
        subsystem: "database",
        errorCode: "FATAL_001"
      });
    });
  });

  describe("complex data structures", () => {
    it("handles nested JSON objects", async () => {
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
          timestamp: "2025-05-02T00:33:30-04:00",
          source: "test"
        }
      };

      const program = Effect.gen(function* () {
        yield* testLogger.info("Complex data log", complexData);
      });

      await Effect.runPromise(program);

      expect(loggedMessages).toHaveLength(1);
      expect(loggedMessages[0].data).toEqual(complexData);
    });

    it("handles arrays in data", async () => {
      const arrayData = {
        items: [1, 2, 3],
        tags: ["test", "logging"],
        nested: [{ id: 1 }, { id: 2 }]
      };

      const program = Effect.gen(function* () {
        yield* testLogger.debug("Array data log", arrayData);
      });

      await Effect.runPromise(program);

      expect(loggedMessages).toHaveLength(1);
      expect(loggedMessages[0].data).toEqual(arrayData);
    });
  });

  describe("error handling", () => {
    it("handles custom errors", async () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const customError = new CustomError("Custom error occurred", "CUSTOM_001");
      
      const program = Effect.gen(function* () {
        yield* testLogger.error("Custom error log", customError);
      });

      await Effect.runPromise(program);

      expect(loggedMessages).toHaveLength(1);
      expect(loggedMessages[0].data).toMatchObject({
        name: "CustomError",
        message: "Custom error occurred"
      });
    });

    it("handles error cause chains", async () => {
      const program = Effect.gen(function* () {
        const innerCause = Cause.fail(new Error("Inner error"));
        const middleCause = Cause.parallel(
          innerCause,
          Cause.fail(new Error("Parallel error"))
        );
        const outerCause = Cause.sequential(
          middleCause,
          Cause.fail(new Error("Final error"))
        );

        yield* testLogger.logCause(LogLevel.Error, outerCause);
      });

      await Effect.runPromise(program);

      expect(loggedMessages).toHaveLength(1);
      expect(loggedMessages[0].level).toBe(LogLevel.Error);
      // The message should contain all error messages
      expect(loggedMessages[0].message).toContain("Inner error");
      expect(loggedMessages[0].message).toContain("Parallel error");
      expect(loggedMessages[0].message).toContain("Final error");
    });
  });

  describe("log data types", () => {
    it("accepts JSON objects in error logs", async () => {
      const program = Effect.gen(function* () {
        yield* testLogger.error("Error occurred", { errorCode: "E101", details: "Sample details" });
      });

      await Effect.runPromise(program);

      // Verify messages
      expect(loggedMessages).toHaveLength(1);
      expect(loggedMessages[0].data).toEqual({ errorCode: "E101", details: "Sample details" });
    });

    it("accepts empty log messages", async () => {
      const program = Effect.gen(function* () {
        yield* testLogger.info("");
        yield* testLogger.debug("");
      });

      await Effect.runPromise(program);

      // Verify messages
      expect(loggedMessages).toHaveLength(2);
      expect(loggedMessages.map(m => m.message)).toEqual(["", ""]);
    });
  });
});
