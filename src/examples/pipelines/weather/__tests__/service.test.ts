import { WeatherServiceApi } from "@/examples/pipelines/weather/api.js";
import { WeatherService } from "@/examples/pipelines/weather/service.js";
import TextService from "@/services/pipeline/producers/text/service.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { LoggingService } from "@/services/core/logging/service.js";
import { describe, expect, it } from "bun:test";
import { Effect, LogLevel } from "effect";

describe("WeatherService", () => {
    // Set log directory for tests
    process.env.LOG_DIR = "src/examples/pipelines/weather/logs";
    process.env.LOG_FILE_BASE = "weather";

    describe("getWeather", () => {
        it("should return weather data with required fields", () =>
            Effect.gen(function* () {
                const weatherService = yield* WeatherService;
                const logger = (yield* LoggingService).withContext({
                    logDir: "src/examples/pipelines/weather/logs",
                    logFileBaseName: "weather"
                });

                // Log the start of the test
                yield* logger.info("Starting weather data test", { location: "New York" });
                console.log("Starting weather data test", { location: "New York" });

                const result = yield* weatherService.getWeather({
                    location: "New York",
                    includeForecast: false
                });

                // Log the result
                yield* logger.debug("Weather data received", { 
                    temperature: result.temperature,
                    conditions: result.conditions.map(c => String(c)),
                    humidity: result.humidity,
                    windSpeed: result.windSpeed
                });

                // Log the result
                console.log("Weather data received", {
                    temperature: result.temperature,
                    conditions: result.conditions.map(c => String(c)),
                    humidity: result.humidity,
                    windSpeed: result.windSpeed
                });

                expect(result).toBeDefined();
                expect(result.temperature).toBeDefined();
                expect(result.conditions).toBeDefined();
                expect(result.humidity).toBeDefined();
                expect(result.windSpeed).toBeDefined();
                expect(result.conditions).toHaveLength(1);
                expect(result.timestamp).toBeDefined();
                expect(result.units).toBe("celsius");
                expect(result.forecast).toBeUndefined();
            })
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

                result.forecast?.forEach((forecast: { date: string; highTemperature: number; lowTemperature: number; conditions: unknown }) => {
                    expect(forecast).toMatchObject({
                        date: expect.any(String),
                        highTemperature: expect.any(Number),
                        lowTemperature: expect.any(Number),
                        conditions: expect.any(Object)
                    });
                });
            })
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
            })
        );
    });

    describe("getWeatherSummary", () => {
        it("should return weather summary", () =>
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
                expect(result).not.toContain("forecast");
            })
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
                expect(result).toContain("forecast");
            })
        );
    });
});
