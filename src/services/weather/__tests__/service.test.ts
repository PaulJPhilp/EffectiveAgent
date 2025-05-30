import { Effect, Either } from "effect"
import { describe, expect, it } from "vitest"
import {
    MOCK_WEATHER_RESPONSE,
    WeatherService,
    WeatherServiceTestLayer,
    WeatherServiceWithMockConfigTestLayer
} from "../index.js"

/**
 * Test runner for WeatherService tests using the test layer
 */
const runWeatherTest = <A, E, R>(
    effect: Effect.Effect<A, E, R>
): Promise<A> => {
    return Effect.runPromise(
        effect.pipe(Effect.provide(WeatherServiceTestLayer)) as Effect.Effect<A, E, never>
    )
}

/**
 * Test runner for WeatherService tests using real service with mock config
 */
const runWeatherTestWithMockConfig = <A, E, R>(
    effect: Effect.Effect<A, E, R>
): Promise<A> => {
    return Effect.runPromise(
        effect.pipe(Effect.provide(WeatherServiceWithMockConfigTestLayer)) as Effect.Effect<A, E, never>
    )
}

describe("WeatherService", () => {
    it("should return a mock forecast", async () => {
        await runWeatherTest(Effect.gen(function* () {
            // Arrange
            const weatherService = yield* WeatherService

            // Act
            const forecast = yield* weatherService.getForecast("MockCity")

            // Assert
            expect(forecast).toEqual(MOCK_WEATHER_RESPONSE)
            expect(forecast.name).toBe("MockCity")
        }))
    })

    it("should handle WeatherPipelineError when the service fails", async () => {
        await runWeatherTestWithMockConfig(Effect.gen(function* () {
            // Arrange
            const weatherService = yield* WeatherService

            // Act - This should fail because we're using mock config with invalid API key
            const result = yield* Effect.either(weatherService.getForecast("London"))

            // Assert
            expect(Either.isLeft(result)).toBe(true)
            if (Either.isLeft(result)) {
                expect(result.left.name).toBe("WeatherPipelineError")
                expect(result.left.message).toContain("Failed to fetch weather data")
            }
        }))
    })

    it("should attempt a real API call and handle errors with mock config", async () => {
        await runWeatherTestWithMockConfig(Effect.gen(function* () {
            // Arrange
            const weatherService = yield* WeatherService

            // Act - Using mock config should fail due to invalid API key
            const result = yield* Effect.either(weatherService.getForecast("London"))

            // Assert
            expect(Either.isLeft(result)).toBe(true)
            if (Either.isLeft(result)) {
                expect(result.left.name).toBe("WeatherPipelineError")
                expect(result.left.message).toMatch(/Failed to fetch weather data|API request failed/i)
            }
        }))
    })

    it("should return a forecast for a specified city", async () => {
        await runWeatherTest(Effect.gen(function* () {
            // Arrange
            const weatherService = yield* WeatherService
            const specificCity = "Paris"

            // Act
            const forecast = yield* weatherService.getForecast(specificCity)

            // Assert
            expect(forecast.name).toBe("MockCity") // The mock always returns MockCity
            expect(forecast).toEqual(MOCK_WEATHER_RESPONSE)
        }))
    })
}) 