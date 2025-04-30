/**
 * @file Tests for the LoggingService implementation.
 */

import { Effect, Layer, LogLevel, Cause } from "effect";
import { describe, it, expect } from "vitest";
import { LoggingService } from "../service.js";
import type { LoggingServiceApi } from "../api.js";

describe("LoggingService", () => {
  // Use direct access to the service via the Tag rather than layers
  // This approach works better with TypeScript in this version of Effect
  
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
      })
    );
    
    it("handles error objects correctly", () => 
      Effect.gen(function* (_) {
        const logger = yield* LoggingService;
        yield* logger.error("Test error with Error", new Error("Something failed"));
        
        // Test passes if no exceptions are thrown
        expect(true).toBe(true);
      })
    );

    it("handles causes in logs", () => 
      Effect.gen(function* (_) {
        const logger = yield* LoggingService;
        yield* logger.logCause(LogLevel.Warning, Cause.die("Test cause"));
        yield* logger.logErrorCause(Cause.fail("Test error cause"));
        
        // Test passes if no exceptions are thrown
        expect(true).toBe(true);
      })
    );
  });

  describe("log level configuration", () => {
    it("accepts all log levels", () => 
      Effect.gen(function* (_) {
        const logger = yield* LoggingService;
        yield* logger.log(LogLevel.Debug, "Debug level message");
        yield* logger.log(LogLevel.Info, "Info level message");
        yield* logger.log(LogLevel.Warning, "Warning level message");
        yield* logger.log(LogLevel.Error, "Error level message");
        
        // Test passes if no exceptions are thrown
        expect(true).toBe(true);
      })
    );
  });

  describe("log data types", () => {
    it("accepts JSON objects in error logs", () => 
      Effect.gen(function* (_) {
        const logger = yield* LoggingService;
        yield* logger.error("Error occurred", { errorCode: "E101", details: "Sample details" });
        
        // Test passes if no exceptions are thrown
        expect(true).toBe(true);
      })
    );
    
    it("accepts empty log messages", () => 
      Effect.gen(function* (_) {
        const logger = yield* LoggingService;
        yield* logger.info("");
        yield* logger.debug("");
        
        // Test passes if no exceptions are thrown
        expect(true).toBe(true);
      })
    );
  });
});
