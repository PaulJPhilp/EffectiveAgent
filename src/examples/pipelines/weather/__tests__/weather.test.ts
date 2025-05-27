/**
 * @file Weather Service Tests
 * @module ea/pipelines/weather/tests
 */

import { config } from "dotenv";
config(); // Load environment variables from .env file

import { WeatherService } from "@/examples/pipelines/weather/service.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { makeFileLogger } from "@/services/core/logging/file-logger.js";
import TextService from "@/services/pipeline/producers/text/service.js";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import path from "path";
import { beforeAll, describe, expect, it } from "vitest";

// Test data
const testLocation = "New York";

beforeAll(() => {
  // Set up config paths
  process.env.PROVIDERS_CONFIG_PATH = "/Users/paul/Projects/EffectiveAgent/src/services/ai/provider/__tests__/providers.json";
  process.env.MODELS_CONFIG_PATH = "/Users/paul/Projects/EffectiveAgent/src/services/ai/model/__tests__/config/models.json";
});

describe("WeatherService", () => {
  let loggerLive: Layer.Layer<never, any, never>;
  let testFile: string;

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

  beforeAll(async () => {
    // Set up logging
    testFile = "/Users/paul/Projects/EffectiveAgent/logs/app.log";
    loggerLive = makeFileLogger({
      logDir: path.dirname(testFile),
      logFileBase: path.basename(testFile, ".log")
    });
  });

  it("should get weather data and log operations", async () => {
    const makeService = Effect.gen(function* () {
      yield* Effect.logInfo("Starting service initialization");

      // Create text service
      yield* Effect.logInfo("Getting text service");
      const textService = yield* TextService;
      yield* Effect.logInfo("Text service initialized");

      // Create weather service
      yield* Effect.logInfo("Getting weather service");
      const weatherService = yield* WeatherService;
      yield* Effect.logInfo("Weather service initialized");

      return weatherService;
    }).pipe(
      // Provide services in reverse dependency order
      Effect.provide(WeatherService.Default),
      Effect.provide(TextService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(loggerLive)
    );

    const test = Effect.gen(function* () {
      yield* Effect.logInfo("Starting test execution");

      yield* Effect.logInfo("Creating service");
      const service = yield* makeService;
      yield* Effect.logInfo("Service created");

      yield* Effect.logInfo("Getting weather data", { location: testLocation });
      const weather = yield* service.getWeather({ location: testLocation });
      yield* Effect.logInfo("Got weather data", { conditions: weather.conditions });

      yield* Effect.logInfo("Verifying results");
      expect(weather).toBeDefined();
      expect(weather.location.name).toBe(testLocation);
      expect(weather.temperature).toBeDefined();
      expect(weather.conditions).toHaveLength(1);
      expect(weather.humidity).toBeDefined();
      expect(weather.windSpeed).toBeDefined();
      expect(weather.timestamp).toBeDefined();
      expect(weather.units.type).toBe("celsius");
      expect(weather.forecast).toBeUndefined();
      yield* Effect.logInfo("Test complete");
      return weather;
    });

  });

  it("should get weather summary and log operations", async () => {
    const test = Effect.gen(function* () {
      const service = yield* WeatherService;
      const summary = yield* service.getWeatherSummary({ location: testLocation });

      expect(summary).toBeDefined();
      expect(typeof summary).toBe("string");
      return summary;
    }).pipe(
      Effect.provide(WeatherService.Default)
    );

    const result = await Effect.runPromise(
      Effect.catchAll(test, (error) => {
        console.error('Test failed:', error);
        return Effect.fail(error);
      })
    );

    // Wait for logs to be written
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify logs after waiting
    const logs = await Effect.runPromise(readLogFile(testFile).pipe(
      Effect.provide(NodeFileSystem.layer)
    ));
    expect(logs).toContain('message="Getting weather summary"');
    expect(logs).toContain('message="Raw text service response"');
    expect(logs).toContain('message="Parsed weather data"');
    expect(logs).toContain('message="Weather data transformed"');

    return result;
  });
});
