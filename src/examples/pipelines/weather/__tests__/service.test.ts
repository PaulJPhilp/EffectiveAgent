/**
 * @file Unit tests for Weather Pipeline Service
 */

import { FileLogger } from "@/services/core/logging/file-logger.js";
import { Effect, LogLevel } from "effect";
import { describe, expect, it } from "vitest";
import { makeWeatherService } from "../service.js";

const fileLogger = new FileLogger({
    logDir: "test-logs",
    logFileBaseName: "weather-service-test",
    minLogLevel: LogLevel.Debug
});
await Effect.runPromise(fileLogger.initialize());
const logger = fileLogger.createLoggingService();
const weatherService = makeWeatherService(logger);

describe("WeatherService", () => {
    it("should return weather data", async () => {
        const data = await Effect.runPromise(weatherService.getWeather({
            location: "Testville",
            units: "celsius"
        }));
        expect(data).toBeDefined();
        expect(data.location.name).toBe("Testville");
    });

    it("should include forecast data when requested", async () => {
        const data = await Effect.runPromise(weatherService.getWeather({
            location: "Testville",
            units: "celsius",
            includeForecast: true
        }));
        expect(data.forecast).toBeDefined();
        expect(Array.isArray(data.forecast)).toBe(true);
    });

    it("should return formatted weather summary", async () => {
        const summary = await Effect.runPromise(weatherService.getWeatherSummary({
            location: "Testville",
            units: "celsius"
        }));
        expect(summary).toContain("Testville");
    });

    it("should include forecast in summary when requested", async () => {
        const summary = await Effect.runPromise(weatherService.getWeatherSummary({
            location: "Testville",
            units: "celsius",
            includeForecast: true
        }));
        expect(summary).toContain("Tomorrow will be");
    });
});
