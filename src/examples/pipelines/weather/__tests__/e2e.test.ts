/**
 * @file End-to-End tests for Weather Pipeline
 */

import { FileLogger } from "@/services/core/logging/file-logger.js";
import { Effect, LogLevel } from "effect";
import { describe, expect, it } from "vitest";
import { makeWeatherService } from "../service.js";

const fileLogger = new FileLogger({
    logDir: "test-logs",
    logFileBaseName: "weather-e2e-global",
    minLogLevel: LogLevel.Debug
});
await Effect.runPromise(fileLogger.initialize());
const logger = fileLogger.createLoggingService();
const weatherService = makeWeatherService(logger);

// Helper to run effects with logging
async function withLogger<R, E, A>(name: string, effect: Effect.Effect<R, E, A>) {
    return effect;
}

describe("Weather Pipeline E2E Tests", () => {
    describe("Complete Weather Data Flow", () => {
        it("should process a complete weather request flow", async () =>
            await withLogger(
                "weather-e2e-test",
                Effect.gen(function* () {
                    yield* logger.info("Starting complete weather flow test");

                    yield* logger.info("Fetching weather data", { location: "Seattle" });
                    const weatherData = yield* weatherService.getWeather({
                        location: "Seattle",
                        includeForecast: true,
                        units: "celsius"
                    });
                    yield* logger.info("Received weather data", { data: JSON.stringify(weatherData) });

                    yield* logger.info("Fetching weather summary");
                    const weatherSummary = yield* weatherService.getWeatherSummary({
                        location: "Seattle",
                        includeForecast: true,
                        units: "celsius"
                    });
                    yield* logger.info("Received weather summary", { summary: weatherSummary });

                    expect(weatherData).toBeDefined();
                    expect(weatherData.location.name).toBe("Seattle");
                    expect(weatherData.units).toBe("celsius");
                    expect(weatherData.forecast).toBeDefined();

                    expect(weatherSummary).toBeDefined();
                    expect(weatherSummary).toContain("Seattle");
                    expect(weatherSummary).toContain("clear sky");
                    if (weatherData.forecast && weatherData.forecast[0]) {
                        expect(weatherSummary).toContain("Tomorrow will be clear sky");
                    }
                    yield* logger.info("Test completed successfully");
                })
            )
        );
    });

    describe("Error Handling", () => {
        it("should handle invalid locations gracefully", () =>
            Effect.gen(function* () {
                const result = yield* Effect.either(weatherService.getWeather({
                    location: "InvalidLocation",
                    units: "celsius"
                }));
                expect(Effect.isFailure(result)).toBe(true);
            })
        );
    });

    describe("Pipeline Performance", () => {
        it("should complete weather requests within acceptable timeframe", () =>
            Effect.gen(function* () {
                const startTime = Date.now();
                const weatherData = yield* weatherService.getWeather({
                    location: "New York",
                    units: "celsius"
                });
                const executionTime = Date.now() - startTime;

                expect(executionTime).toBeLessThan(1000);
                expect(weatherData.location.name).toBe("New York");
            })
        );
    });
});