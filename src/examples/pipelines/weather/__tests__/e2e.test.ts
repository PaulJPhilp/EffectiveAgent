/**
 * @file End-to-End tests for Weather Pipeline
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { WeatherService } from "../service.js";

describe("Weather Pipeline E2E Tests", () => {
    describe("Complete Weather Data Flow", () => {
        it("should process a complete weather request flow", () => 
            Effect.gen(function* () {
                const service = yield* WeatherService;
                const weatherData = yield* service.getWeather({
                    location: "Seattle",
                    includeForecast: true,
                    units: "celsius"
                });
                const weatherSummary = yield* service.getWeatherSummary({
                    location: "Seattle",
                    includeForecast: true,
                    units: "celsius"
                });

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
            })
        );
    });

    describe("Error Handling", () => {
        it("should handle invalid locations gracefully", () =>
            Effect.gen(function* () {
                const service = yield* WeatherService;
                const result = yield* Effect.either(service.getWeather({
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
                const service = yield* WeatherService;
                const startTime = Date.now();
                const weatherData = yield* service.getWeather({ 
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