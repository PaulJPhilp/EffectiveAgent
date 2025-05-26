/**
 * @file Weather Service Tests
 * @module ea/pipelines/weather/tests
 */

import { WeatherService } from "@/examples/pipelines/weather/service.js";
import { FileSystem } from "@effect/platform";
import { layer as nodeFileSystemLayer } from "@effect/platform-node/NodeFileSystem";
import { Effect, Layer } from "effect";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FileLogger } from "@/services/core/logging/file-logger.js";

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test log file path
const LOG_DIR = "/Users/paul/Projects/EffectiveAgent/src/examples/pipelines/weather/logs";
const LOG_FILE = join(LOG_DIR, "weather-test.log");

// Helper to read log file contents
const readLogFile = (): string => {
  try {
    return readFileSync(LOG_FILE, 'utf8');
  } catch (error) {
    return '';
  }
};

// Clean up and setup before tests
beforeAll(async () => {
  await Effect.gen(function* () {
    // Clean up any existing log file
    const fs = yield* FileSystem.FileSystem;
    const exists = yield* fs.exists(LOG_FILE);
    if (exists) {
      yield* fs.remove(LOG_FILE);
    }
    
    // Create logs directory
    yield* fs.makeDirectory(LOG_DIR, { recursive: true });
    
    // Configure logger
    const logger = yield* FileLogger;
    yield* logger.setConfig({
      logDir: LOG_DIR,
      logFileBase: "weather-test"
    });
    
    // Log setup info
    console.log(`LOG_DIR path: ${LOG_DIR}`);
    console.log(`LOG_FILE path: ${LOG_FILE}`);
    console.log('Environment variables set:');
    console.log(`LOG_DIR env: ${LOG_DIR}`);
    console.log(`LOG_FILE_BASE env: weather-test`);
  }).pipe(
    Effect.provide(Layer.merge(
      nodeFileSystemLayer,
      FileLogger.Default
    )),
    Effect.runPromise
  );
});

// Log test completion
afterAll(() => {
  if (existsSync(LOG_FILE)) {
    console.log(`\nLog file created at: ${LOG_FILE}`);
    console.log('='.repeat(80));
    console.log('LOG FILE CONTENTS:');
    console.log('='.repeat(80));
    console.log(readLogFile());
    console.log('='.repeat(80));
  }
});

describe("WeatherService", () => {
  describe("getWeather", () => {
    it("should return weather data with required fields", () =>
      Effect.gen(function* () {
        const service = yield* WeatherService;
        const result = yield* service.getWeather({
          location: "New York"
        });

        expect(result).toBeDefined();
        expect(result.location.name).toBe("New York");
        expect(result.temperature).toBeDefined();
        expect(result.conditions).toHaveLength(1);
        expect(result.humidity).toBeDefined();
        expect(result.windSpeed).toBeDefined();
        expect(result.timestamp).toBeDefined();
        expect(result.units).toBe("celsius");
        expect(result.forecast).toBeUndefined();
      }).pipe(
        Effect.provide(WeatherService.Default)
      )
    );

    it("should fail if location is missing", () =>
      Effect.gen(function* () {
        const service = yield* WeatherService;
        const result = yield* Effect.either(service.getWeather({ location: "" }));
        expect(result._tag).toBe("Left");
      }).pipe(
        Effect.provide(WeatherService.Default)
      )
    );

    it("should include forecast data when requested", () =>
      Effect.gen(function* () {
        const service = yield* WeatherService;
        const result = yield* service.getWeather({
          location: "New York"
        });

        expect(result.forecast).toBeDefined();
        expect(Array.isArray(result.forecast)).toBe(true);
        expect(result.forecast?.length).toBeGreaterThan(0);

        result.forecast?.forEach((forecast) => {
          expect(forecast).toMatchObject({
            date: expect.any(String),
            temperature: expect.any(Number),
            humidity: expect.any(Number)
          });
        });
      }).pipe(
        Effect.provide(WeatherService.Default)
      )
    );

    it("should handle different temperature units", () =>
      Effect.gen(function* () {
        const service = yield* WeatherService;
        const celsiusResult = yield* service.getWeather({
          location: "New York",
          units: {
            type: "celsius",
            windSpeedUnit: "mps"
          }
        });
        expect(celsiusResult.units.type).toBe("celsius");

        const fahrenheitResult = yield* service.getWeather({
          location: "New York",
          units: {
            type: "fahrenheit",
            windSpeedUnit: "mph"
          }
        });
        expect(fahrenheitResult.units.type).toBe("fahrenheit");

        // Verify temperature conversion
        const celsiusTemp = celsiusResult.temperature;
        const fahrenheitTemp = fahrenheitResult.temperature;
        const convertedTemp = (celsiusTemp * 9 / 5) + 32;
        expect(Math.abs(fahrenheitTemp - convertedTemp)).toBeLessThan(1);
      }).pipe(
        Effect.provide(WeatherService.Default)
      )
    );

    it("should write to log file when getting weather", () =>
      Effect.gen(function* () {
        const service = yield* WeatherService;

        // Verify log file doesn't exist at start
        if (existsSync(LOG_FILE)) {
          return Effect.fail(new Error(`Log file already exists at ${LOG_FILE}`));
        }

        // Get weather (should trigger logging)
        const result = yield* service.getWeather({
          location: "TestCity"
        });

        // Give file system time to write
        yield* Effect.promise(() => new Promise(resolve => setTimeout(resolve, 200)));

        // Verify log file was created
        if (!existsSync(LOG_FILE)) {
          return Effect.fail(new Error(`Log file not found at ${LOG_FILE}`));
        }

        // Verify log contents
        const logContent = readLogFile();
        const expectedLogs = [
          "Getting weather data",
          "TestCity",
          "Generated weather data"
        ];

        const missingLogs = expectedLogs.filter(log => !logContent.includes(log));
        if (missingLogs.length > 0) {
          return Effect.fail(new Error(
            `Log file missing expected content: ${missingLogs.join(", ")}\n` +
            `Actual content: ${logContent}`
          ));
        }

        return Effect.succeed(true);
      }).pipe(
        Effect.provide(WeatherService.Default)
      )
    );
  });

  describe("getWeatherSummary", () => {
    it("should return current weather summary", () =>
      Effect.gen(function* () {
        const service = yield* WeatherService;
        const result = yield* service.getWeatherSummary({
          location: "New York"
        });

        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain("New York");
      }).pipe(
        Effect.provide(WeatherService.Default)
      )
    );

    it("should include forecast in summary when requested", () =>
      Effect.gen(function* () {
        const service = yield* WeatherService;
        const result = yield* service.getWeatherSummary({
          location: "New York"
        });

        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain("New York");
        expect(result).toContain("forecast");
      }).pipe(
        Effect.provide(WeatherService.Default)
      )
    );
  });
});
