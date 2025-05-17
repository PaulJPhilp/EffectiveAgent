/**
 * @file Integration tests for Weather Pipeline
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { WeatherService } from "../service.js"

describe("Weather Pipeline Integration Tests", () => {

    it("should get weather data", () => 
        Effect.gen(function* () {
            const service = yield* WeatherService;
            const data = yield* service.getWeather({
                location: "London",
                units: "celsius"
            });

            expect(data.location.name).toBe("London");
            expect(data.units).toBe("celsius");
            expect(data.conditions).toHaveLength(1);
            expect(data.temperature).toBeDefined();
            expect(data.temperatureFeelsLike).toBeDefined();
            expect(data.humidity).toBeDefined();
            expect(data.windSpeed).toBeDefined();
            expect(data.windDirection).toBeDefined();
            expect(data.timestamp).toBeDefined();
        })
    );

    it("should get weather summary", () => 
        Effect.gen(function* () {
            const service = yield* WeatherService;
            const summary = yield* service.getWeatherSummary({
                location: "Paris",
                units: "celsius"
            });

            expect(summary).toContain("Current weather in Paris");
            expect(summary).toContain("°C");
        })
    );

    it("should include forecast in weather data when requested", () =>
        Effect.gen(function* () {
            const service = yield* WeatherService;
            const data = yield* service.getWeather({
                location: "Berlin",
                units: "celsius",
                includeForecast: true
            });

            expect(data.forecast).toBeDefined();
            const forecast = data.forecast;
            if (!forecast) {
                return Effect.fail(new Error("Forecast is undefined"));
            }
            expect(forecast).not.toBeNull();
            expect(forecast).toHaveLength(1);
            
            const tomorrow = forecast[0];
            if (!tomorrow) {
                return Effect.fail(new Error("Tomorrow is undefined"));
            }
            expect(tomorrow).toBeDefined();
            expect(tomorrow.date).toBeDefined();
            expect(tomorrow.highTemperature).toBeDefined();
            expect(tomorrow.lowTemperature).toBeDefined();
            expect(tomorrow.conditions).toBeDefined();
        })
    );

    it("should respect custom configuration", () => 
        Effect.gen(function* () {
            const service = yield* WeatherService;
            const result = yield* service.getWeather({
                location: "London",
                units: "fahrenheit"
            });

            expect(result.location.name).toBe("London");
            expect(result.units).toBe("fahrenheit");
        })
    );
})