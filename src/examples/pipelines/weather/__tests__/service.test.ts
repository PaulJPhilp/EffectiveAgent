/**
 * @file Unit tests for Weather Pipeline Service
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { WeatherPipelineInput } from "../api.js";
import { WeatherService } from "../service.js";

describe("WeatherService", () => {
    it("should return weather data", () => 
        Effect.gen(function* () {
            const input: WeatherPipelineInput = {
                location: "Berlin",
                units: "celsius",
                includeForecast: false
            };

            const service = yield* WeatherService;
            const result = yield* service.getWeather(input);

            expect(result.location.name).toBe("Berlin");
            expect(result.units).toBe("celsius");
            expect(result.conditions.length).toBeGreaterThan(0);
            expect(result.temperature).toBeDefined();
            expect(result.forecast).toBeUndefined();
        }).pipe(Effect.provide(WeatherService.Default))
    );

    it("should include forecast data when requested", () =>
        Effect.gen(function* () {
            const input: WeatherPipelineInput = {
                location: "London",
                units: "fahrenheit",
                includeForecast: true
            };

            const service = yield* WeatherService;
            const result = yield* service.getWeather(input);

            expect(result.location.name).toBe("London");
            expect(result.units).toBe("fahrenheit");
            expect(result.forecast).toBeDefined();
            expect(result.forecast?.length).toBe(1);
            if (result.forecast?.[0]) {
                expect(result.forecast[0].conditions).toBeDefined();
            }
        }).pipe(Effect.provide(WeatherService.Default))
    );

    it("should return formatted weather summary", () =>
        Effect.gen(function* () {
            const input: WeatherPipelineInput = {
                location: "Berlin",
                units: "celsius",
                includeForecast: false
            };

            const service = yield* WeatherService;
            const summary = yield* service.getWeatherSummary(input);

            expect(summary).toContain("Berlin");
            expect(summary).toContain("°C");
        }).pipe(Effect.provide(WeatherService.Default))
    );

    it("should include forecast in summary when requested", () =>
        Effect.gen(function* () {
            const input: WeatherPipelineInput = {
                location: "London",
                units: "fahrenheit",
                includeForecast: true
            };

            const service = yield* WeatherService;
            const summary = yield* service.getWeatherSummary(input);

            expect(summary).toContain("London");
            expect(summary).toContain("°F");
            expect(summary).toContain("Tomorrow");
        }).pipe(Effect.provide(WeatherService.Default))
    );
});
