import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import {
    MOCK_WEATHER_PIPELINE_CONFIG,
    MOCK_WEATHER_RESPONSE,
    WeatherConfigService,
    WeatherPipelineError,
    WeatherService,
    WeatherServiceApi,
    WeatherServiceTestLayer, // Using the fully mocked layer
    WeatherServiceWithMockConfigTestLayer // Using real service logic with mocked config
} from "../index.js"

describe("WeatherService", () => {
    it("should return a mock forecast when using WeatherServiceTestLayer", () =>
        Effect.runPromise(
            Effect.gen(function* () {
                const weatherService = yield* WeatherService
                const forecast = yield* weatherService.getForecast("MockCity")

                expect(forecast).toEqual(MOCK_WEATHER_RESPONSE)
                expect(forecast.name).toBe("MockCity")
            }).pipe(Effect.provide(WeatherServiceTestLayer))
        )
    )

    it("should handle WeatherPipelineError when the service fails (using WeatherServiceTestLayer)", () =>
        Effect.runPromise(
            Effect.gen(function* () {
                const weatherService = yield* WeatherService
                const program = weatherService.getForecast("ErrorCity")

                yield* Effect.match(program, {
                    onFailure: (error: WeatherPipelineError) => {
                        expect(error).toBeInstanceOf(WeatherPipelineError)
                        expect(error.message).toBe("Mock error for ErrorCity")
                    },
                    onSuccess: () => {
                        throw new Error("Test expected failure but got success")
                    }
                })
            }).pipe(
                Layer.provide(
                    Layer.succeed(WeatherService, {
                        getForecast: (city?: string) => city === "ErrorCity"
                            ? Effect.fail(new WeatherPipelineError({ message: "Mock error for ErrorCity" }))
                            : Effect.succeed(MOCK_WEATHER_RESPONSE)
                    } satisfies WeatherServiceApi),
                    Layer.succeed(WeatherConfigService, MOCK_WEATHER_PIPELINE_CONFIG)
                )
            )
        )
    )

    // This test uses the real WeatherService logic with a mocked configuration.
    // It will attempt to make a real HTTP request to OpenWeatherMap
    // but with a "mockApiKey". This will likely result in an API error from OpenWeatherMap.
    // This test is good for verifying that WeatherService correctly handles API errors.
    it("should attempt a real API call and handle errors when using WeatherServiceWithMockConfigTestLayer", () =>
        Effect.runPromise(
            Effect.gen(function* () {
                const weatherService = yield* WeatherService
                const program = weatherService.getForecast("London")

                yield* Effect.match(program, {
                    onFailure: (error: WeatherPipelineError) => {
                        expect(error).toBeInstanceOf(WeatherPipelineError)
                        expect(error.message).toMatch(/API request failed with status 401|Failed to fetch weather data/i)
                    },
                    onSuccess: () => {
                        throw new Error("Test expected API call to fail but it succeeded.")
                    }
                })
            }).pipe(Effect.provide(WeatherServiceWithMockConfigTestLayer))
        )
    )

    it("should return a forecast for a specified city using WeatherServiceTestLayer", () =>
        Effect.runPromise(
            Effect.gen(function* () {
                const weatherService = yield* WeatherService
                const specificCity = "Paris"
                const program = weatherService.getForecast(specificCity)
                const forecast = yield* program

                expect(forecast.name).toBe(specificCity)
            }).pipe(
                Effect.provide(
                    Layer.provide(
                        Layer.succeed(WeatherService, {
                            getForecast: (city?: string) => Effect.succeed({ ...MOCK_WEATHER_RESPONSE, name: city ?? MOCK_WEATHER_RESPONSE.name })
                        } satisfies WeatherServiceApi),
                        Layer.succeed(WeatherConfigService, MOCK_WEATHER_PIPELINE_CONFIG)
                    )
                )
            )
        )
    )
}) 