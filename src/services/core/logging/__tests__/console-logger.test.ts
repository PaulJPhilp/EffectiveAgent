/**
 * @file Tests for ConsoleLogger
 */

import { Effect, LogLevel } from "effect";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConsoleLogger } from "../console-logger.js";

describe("ConsoleLogger", () => {
  // Spy on console methods
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs messages at different levels to appropriate console methods", () =>
    Effect.gen(function* () {
      const logger = yield* ConsoleLogger;
      const testData = { test: true };

      // Test error level
      yield* logger.log(LogLevel.Error, "error message", testData);
      expect(console.error).toHaveBeenCalledWith("error message {\"test\":true}");
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();

      // Test warning level
      yield* logger.log(LogLevel.Warning, "warn message", testData);
      expect(console.warn).toHaveBeenCalledWith("warn message {\"test\":true}");
      expect(console.info).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();

      // Test info level
      yield* logger.log(LogLevel.Info, "info message", testData);
      expect(console.info).toHaveBeenCalledWith("info message {\"test\":true}");
      expect(console.debug).not.toHaveBeenCalled();

      // Test debug level (should not log as default minLevel is Info)
      yield* logger.log(LogLevel.Debug, "debug message", testData);
      expect(console.debug).not.toHaveBeenCalled();
    })
  );

  it("handles messages without data", () =>
    Effect.gen(function* () {
      const logger = yield* ConsoleLogger;

      yield* logger.log(LogLevel.Error, "error message");
      expect(console.error).toHaveBeenCalledWith("error message");

      yield* logger.log(LogLevel.Warning, "warn message");
      expect(console.warn).toHaveBeenCalledWith("warn message");

      yield* logger.log(LogLevel.Info, "info message");
      expect(console.info).toHaveBeenCalledWith("info message");
    })
  );

  it("respects minimum log level", () =>
    Effect.gen(function* () {
      const logger = yield* ConsoleLogger;
      const testData = { test: true };

      // Debug messages should not be logged (default minLevel is Info)
      yield* logger.log(LogLevel.Debug, "debug message", testData);
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();

      // Info and above should be logged
      yield* logger.log(LogLevel.Info, "info message", testData);
      expect(console.info).toHaveBeenCalledWith("info message {\"test\":true}");
    })
  );

  it("handles complex data objects", () =>
    Effect.gen(function* () {
      const logger = yield* ConsoleLogger;
      const complexData = {
        user: {
          id: "123",
          settings: {
            theme: "dark",
            notifications: true
          }
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
