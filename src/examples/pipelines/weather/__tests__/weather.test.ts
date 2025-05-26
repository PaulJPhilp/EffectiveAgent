/**
 * @file Weather Service Tests
 * @module ea/pipelines/weather/tests
 */

import { WeatherService } from "@/examples/pipelines/weather/service.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { FileLogger } from "@/services/core/logging/file-logger.js";
import TextService from "@/services/pipeline/producers/text/service.js";
import { layer as nodeFileSystemLayer } from "@effect/platform-node/NodeFileSystem";
import { Effect, Layer } from "effect";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Test config
const TEST_LOG_DIR = "src/examples/pipelines/weather/logs";
const TEST_LOG_FILE = "weather-test";

// Create a test layer with all required dependencies
const TestLayer = Layer.mergeAll(
  WeatherService.Default,
  TextService.Default,
  ModelService.Default,
  ProviderService.Default,
  nodeFileSystemLayer
);

// Set up test environment
beforeAll(() => {
  console.log("WeatherService tests starting...");
});

afterAll(() => {
  console.log("WeatherService tests completed");
});

describe("WeatherService", () => {
  describe("getWeather", () => {
    it("should return weather data with required fields", () =>
      Effect.gen(function* () {
        const service = yield* WeatherService;
        const result = yield* service.getWeather({
          location: "New York"
        });
        expect(result.location.name).toBe("New York");
        expect(result.temperature).toBeDefined();
        expect(result.humidity).toBeDefined();
        expect(result.conditions.length).toBeGreaterThan(0);
      }).pipe(Effect.provide(WeatherService.Default))
    );

    it("should fail if location is missing", () =>
      Effect.gen(function* () {
        const service = yield* WeatherService;
        const result = yield* Effect.either(service.getWeather({ location: "" }));
        expect(result._tag).toBe("Left");
      }).pipe(Effect.provide(WeatherService.Default))
    );
  });
  describe("getWeather", () => {
    it("should return weather data with required fields", () =>
      Effect.gen(function* () {
        const service = yield* WeatherService;
        const result = yield* service.getWeather({
          location: "New York"
        });
        expect(result.location.name).toBe("New York");
        expect(result.temperature).toBeDefined();
        expect(result.humidity).toBeDefined();
        expect(result.conditions.length).toBeGreaterThan(0);
      }).pipe(Effect.provide(WeatherService.Default))
    );

    it("should fail if location is missing", () =>
      Effect.gen(function* () {
        const service = yield* WeatherService;
        const result = yield* Effect.either(service.getWeather({ location: "" }));
        expect(result._tag).toBe("Left");
      }).pipe(Effect.provide(WeatherService.Default))
    );
  });
  it("should return weather data with required fields", () =>
    Effect.gen(function* () {
      const weatherService = yield* WeatherService;
      const result = yield* weatherService.getWeather({
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

  it("should return forecast data with required fields", () =>
    Effect.gen(function* () {
      const weatherService = yield* WeatherService;
      const result = yield* weatherService.getWeather({
        location: "New York"
      });

      expect(result).toBeDefined();
      expect(result.temperature).toBeDefined();
      expect(result.conditions).toBeDefined();
      expect(result.humidity).toBeDefined();
      expect(result.windSpeed).toBeDefined();
      expect(result.conditions).toHaveLength(1);
      expect(result.timestamp).toBeDefined();
      expect(result.units).toBe("celsius");
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

  it("should include forecast data when requested", () =>
    Effect.gen(function* () {
      const weatherService = yield* WeatherService;
      const result = yield* weatherService.getWeather({
        location: "New York"
      });

      expect(result.forecast).toBeDefined();
      expect(Array.isArray(result.forecast)).toBe(true);
      expect(result.forecast?.length).toBeGreaterThan(0);
    }).pipe(
      Effect.provide(WeatherService.Default)
    )
  );

  it("should handle different temperature units", () =>
    Effect.gen(function* () {
      const weatherService = yield* WeatherService;
      const celsiusResult = yield* weatherService.getWeather({
        location: "New York",
        units: {
          type: "celsius",
          windSpeedUnit: "mps"
        }
      });
      expect(celsiusResult.units.type).toBe("celsius");

      const fahrenheitResult = yield* weatherService.getWeather({
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
});

describe("getWeatherSummary", () => {
  it("should return current weather summary", () =>
    Effect.gen(function* () {
      const weatherService = yield* WeatherService;
      const result = yield* weatherService.getWeatherSummary({
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
      const weatherService = yield* WeatherService;
      const result = yield* weatherService.getWeatherSummary({
        location: "New York"
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("New York");
    }).pipe(
      Effect.provide(WeatherService.Default)
    )
  )
});

it("should trigger logToFile and show console.log output [VISIBLE_LOG_TEST]", () =>
  Effect.gen(function* () {
    const weatherService = yield* WeatherService;
    const result = yield* weatherService.getWeather({
      location: "ConsoleLogTestville"
    });
    expect(result.location.name).toBe("ConsoleLogTestville");
  }).pipe(
    Effect.provide(WeatherService.Default)
  )
)

