/**
 * @file Weather Service Tests
 * @module ea/pipelines/weather/tests
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Effect, Layer, Console } from "effect";
import { FileSystem } from "@effect/platform";
import { layer as nodeFileSystemLayer } from "@effect/platform-node/NodeFileSystem";
import { WeatherService } from "@/examples/pipelines/weather/service.js";
import TextService from "@/services/pipeline/producers/text/service.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";

// Create a test layer with all required dependencies
const TestLayer = Layer.mergeAll(
  WeatherService.Default,
  TextService.Default,
  ModelService.Default,
  ProviderService.Default,
  ConfigurationService.Default,
  nodeFileSystemLayer
);

// Set log directory for tests
beforeAll(() => {
  process.env.LOG_DIR = "src/examples/pipelines/weather/logs";
  process.env.LOG_FILE_BASE = "weather-test";
});

afterEach(() => {
  // Clean up environment variables after each test
  delete process.env.LOG_DIR;
  delete process.env.LOG_FILE_BASE;
});

describe("WeatherService", () => {
  beforeAll(() => {
    console.log("WeatherService tests starting...");
  });

  afterAll(() => {
    console.log("WeatherService tests completed");
  });
  describe("getWeather", () => {
    it("should return weather data with required fields", () =>
      Effect.gen(function* () {
        const service = yield* WeatherService;
        const result = yield* service.getWeather({
          location: "New York",
          includeForecast: false
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
        const result = yield* Effect.either(service.getWeather({ location: "", includeForecast: false }));
        expect(result._tag).toBe("Left");
      }).pipe(Effect.provide(WeatherService.Default))
    );
  });
  describe("getWeather", () => {
    it("should return weather data with required fields", () =>
      Effect.gen(function* () {
        const service = yield* WeatherService;
        const result = yield* service.getWeather({
          location: "New York",
          includeForecast: false
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
        const result = yield* Effect.either(service.getWeather({ location: "", includeForecast: false }));
        expect(result._tag).toBe("Left");
      }).pipe(Effect.provide(WeatherService.Default))
    );
  });
    it("should return weather data with required fields", () =>
      Effect.gen(function* () {
        const weatherService = yield* WeatherService;
        const result = yield* weatherService.getWeather({
          location: "New York",
          includeForecast: false
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
          location: "New York",
          includeForecast: true
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
          location: "New York",
          includeForecast: true
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
          units: "celsius"
        });
        expect(celsiusResult.units).toBe("celsius");

        const fahrenheitResult = yield* weatherService.getWeather({
          location: "New York",
          units: "fahrenheit"
        });
        expect(fahrenheitResult.units).toBe("fahrenheit");
                
        // Verify temperature conversion
        const celsiusTemp = celsiusResult.temperature;
        const fahrenheitTemp = fahrenheitResult.temperature;
        const convertedTemp = (celsiusTemp * 9/5) + 32;
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
          location: "New York",
          includeForecast: false
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
          location: "New York",
          includeForecast: true
        });
        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain("New York");
      }).pipe(
        Effect.provide(WeatherService.Default)
      )
    );
  })

  it("should trigger logToFile and show console.log output [VISIBLE_LOG_TEST]", () =>
    Effect.gen(function* () {
      const weatherService = yield* WeatherService;
      const result = yield* weatherService.getWeather({
        location: "ConsoleLogTestville",
        includeForecast: false
      });
      expect(result.location.name).toBe("ConsoleLogTestville");
    }).pipe(
      Effect.provide(WeatherService.Default)
    )
  );

