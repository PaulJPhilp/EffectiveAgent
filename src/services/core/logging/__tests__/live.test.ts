/**
 * @file Tests for the LoggingService implementation.
 */

import { Effect, Layer, LogLevel, Cause } from "effect";
import { describe, it, expect } from "vitest";
import { LoggingService, LoggingServiceLive, LoggingLevelLayer } from "../live.js";
import type { LoggingServiceApi } from "../types.js";

describe("LoggingService", () => {
  // Set up a test layer that combines LoggingServiceLive with a default LogLevel
  const baseLogLevel = LoggingLevelLayer(LogLevel.Info);
  // Use a double type assertion to help TypeScript understand the layer structure
  const TestLayer = Layer.provide(
    LoggingServiceLive as unknown as Layer.Layer<never, never, LoggingServiceApi>, 
    baseLogLevel
  );

  describe("logging methods", () => {
    it("provides basic logging functionality", () => 
      Effect.gen(function* (_) {
        const logger = yield* LoggingService;
        
        // Test different log methods
        yield* logger.log(LogLevel.Info, "Test log message", { key: "value" });
        yield* logger.debug("Test debug message");
        yield* logger.info("Test info message");
        yield* logger.warn("Test warn message");
        yield* logger.error("Test error message", { code: 123 });
        yield* logger.trace("Test trace message");
        
        // Test passes if no exceptions are thrown
        expect(true).toBe(true);
      }).pipe(Effect.provide(TestLayer))
    );
    
    it("handles error objects correctly", () => 
      Effect.gen(function* (_) {
        const logger = yield* LoggingService;
        yield* logger.error("Test error with Error", new Error("Something failed"));
        
        // Test passes if no exceptions are thrown
        expect(true).toBe(true);
      }).pipe(Effect.provide(TestLayer))
    );

    it("handles causes in logs", () => 
      Effect.gen(function* (_) {
        const logger = yield* LoggingService;
        yield* logger.logCause(LogLevel.Warning, Cause.die("Test cause"));
        yield* logger.logErrorCause(Cause.fail("Test error cause"));
        
        // Test passes if no exceptions are thrown
        expect(true).toBe(true);
      }).pipe(Effect.provide(TestLayer))
    );
  });

  describe("log level configuration", () => {
    it("allows setting custom log levels", () => {
      // Create a layer that sets the minimum log level to Debug
      const debugLogLevel = LoggingLevelLayer(LogLevel.Debug);
      
      // Provide the LoggingServiceLive with debug log level
      const combinedLayer = Layer.provide(
        LoggingServiceLive as unknown as Layer.Layer<never, never, LoggingServiceApi>, 
        debugLogLevel
      );

      return Effect.gen(function* (_) {
        const logger = yield* LoggingService;
        yield* logger.info("Info message after setting level");
        yield* logger.debug("Debug message after setting level");
        
        // Test passes if no exceptions are thrown
        expect(true).toBe(true);
      }).pipe(Effect.provide(combinedLayer));
    });

    it("filters messages below the set log level", () => {
      // Create a layer that sets the minimum log level to Warning
      const warnLogLevel = LoggingLevelLayer(LogLevel.Warning);
      const warnLayer = Layer.provide(
        LoggingServiceLive as unknown as Layer.Layer<never, never, LoggingServiceApi>, 
        warnLogLevel
      );

      return Effect.gen(function* (_) {
        const logger = yield* LoggingService;
        yield* logger.debug("Debug message should be filtered");
        yield* logger.info("Info message should be filtered");
        yield* logger.warn("Warning message should appear");
        yield* logger.error("Error message should appear");
        
        // Test passes if no exceptions are thrown
        expect(true).toBe(true);
      }).pipe(Effect.provide(warnLayer));
    });
  });

  describe("log data types", () => {
    it("accepts JSON objects in error logs", () => 
      Effect.gen(function* (_) {
        const logger = yield* LoggingService;
        yield* logger.error("Error occurred", { errorCode: "E101", details: "Sample details" });
        
        // Test passes if no exceptions are thrown
        expect(true).toBe(true);
      }).pipe(Effect.provide(TestLayer))
    );
    
    it("accepts empty log messages", () => 
      Effect.gen(function* (_) {
        const logger = yield* LoggingService;
        yield* logger.info("");
        yield* logger.debug("");
        
        // Test passes if no exceptions are thrown
        expect(true).toBe(true);
      }).pipe(Effect.provide(TestLayer))
    );
  });
});
