import { WeatherServiceApi } from "@/examples/pipelines/weather/api.js";
import { WeatherService } from "@/examples/pipelines/weather/service.js";
import TextService from "@/services/pipeline/producers/text/service.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { describe, expect, it } from "bun:test";
import { Effect } from "effect";

describe("WeatherService", () => {
    console.log("Starting WeatherService test suite");
    describe("getWeather", () => {
        console.log("Starting getWeather test group");
        it("should return weather data with required fields", () => {
            console.log("Starting first test case");
            return Effect.gen(function* () {
                console.log("Inside Effect.gen");
                console.log("Getting WeatherService...");
                const weatherService = yield* WeatherService;
                console.log("Got WeatherService, calling getWeather...");
                const result = yield* weatherService.getWeather({
                    location: "New York",
                    includeForecast: false
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
                console.log("First test case completed");
            })
        }
        );

        it("should return forecast data with required fields", () => {
            console.log("Starting second test case");
            return Effect.gen(function* () {
                console.log("Inside Effect.gen for forecast test");
                console.log("Getting WeatherService...");
                const weatherService = yield* WeatherService;
                console.log("Got WeatherService, calling getWeather with forecast...");
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
                console.log("Second test case completed");
            })
        }
        );

        it("should include forecast data when requested", () => {
            console.log("Starting third test case");
            return Effect.gen(function* () {
                console.log("Inside Effect.gen for forecast request test");
                console.log("Getting WeatherService...");
                const weatherService = yield* WeatherService;
                console.log("Got WeatherService, calling getWeather with forecast...");
                const result = yield* weatherService.getWeather({
                    location: "New York",
                    includeForecast: true
                });

                expect(result.forecast).toBeDefined();
                expect(Array.isArray(result.forecast)).toBe(true);
                expect(result.forecast?.length).toBeGreaterThan(0);
                console.log("Third test case completed");
            })
        }
        );

        describe("getWeatherSummary", () => {
            it("should return weather summary", () => {
                console.log("Starting weather summary test");
                return Effect.gen(function* () {
                    console.log("Inside Effect.gen for summary test");
                    console.log("Getting WeatherService...");
                    const weatherService = yield* WeatherService;
                    console.log("Got WeatherService, calling getWeatherSummary...");
                    const result = yield* weatherService.getWeatherSummary({
                        location: "New York",
                        includeForecast: false
                    });

                    expect(result).toBeDefined();
                    expect(typeof result).toBe("string");
                    expect(result.length).toBeGreaterThan(0);
                    expect(result).toContain("New York");
                    expect(result).not.toContain("forecast");
                    console.log("Weather summary test completed");
                })
            }
            );

            it("should include forecast in summary when requested", () => {
                console.log("Starting forecast summary test");
                return Effect.gen(function* () {
                    console.log("Inside Effect.gen for forecast summary test");
                    console.log("Getting WeatherService...");
                    const weatherService = yield* WeatherService;
                    console.log("Got WeatherService, calling getWeatherSummary with forecast...");
                    const result = yield* weatherService.getWeatherSummary({
                        location: "New York",
                        includeForecast: true
                    });

                    expect(result).toBeDefined();
                    expect(typeof result).toBe("string");
                    expect(result.length).toBeGreaterThan(0);
                    expect(result).toContain("New York");
                    expect(result).toContain("forecast");
                    console.log("Forecast summary test completed");
                })
            }
            );
        });
    })
})
