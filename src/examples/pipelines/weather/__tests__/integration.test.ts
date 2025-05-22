/**
 * @file Integration tests for Weather Pipeline
 */

import { FileLogger } from "@/services/core/logging/file-logger.js";
import { Effect, LogLevel } from "effect";
import { describe, expect, it } from "vitest";
import { makeWeatherService } from "../service.js";

process.env.PROVIDERS_CONFIG_PATH = require('path').resolve(__dirname, '../../config/providers.json');

const fileLogger = new FileLogger({
    logDir: "test-logs",
    logFileBaseName: "weather-integration-test",
    minLogLevel: LogLevel.Debug
});
await Effect.runPromise(fileLogger.initialize());
const logger = fileLogger.createLoggingService();
const weatherService = makeWeatherService(logger);

describe("Weather Pipeline Integration Tests", () => {
    it("should get weather data", async () => {
        const data = await Effect.runPromise(weatherService.getWeather({
            location: "IntegrationCity",
            units: "celsius"
        }));
        expect(data).toBeDefined();
        expect(data.location.name).toBe("IntegrationCity");
    });

    it("should get weather summary", async () => {
        const summary = await Effect.runPromise(weatherService.getWeatherSummary({
            location: "IntegrationCity",
            units: "celsius"
        }));
        expect(summary).toContain("IntegrationCity");
    });

    it("should include forecast in weather data when requested", async () => {
        const data = await Effect.runPromise(weatherService.getWeather({
            location: "IntegrationCity",
            units: "celsius",
            includeForecast: true
        }));
        expect(data.forecast).toBeDefined();
        expect(Array.isArray(data.forecast)).toBe(true);
    });

    it("should respect custom configuration", async () => {
        const data = await Effect.runPromise(weatherService.getWeather({
            location: "IntegrationCity",
            units: "fahrenheit"
        }));
        expect(data.units).toBe("fahrenheit");
    });
});