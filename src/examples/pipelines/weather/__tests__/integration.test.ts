/**
 * @file Integration tests for Weather Pipeline
 */

import { createServiceTestHarness } from "@/services/core/test-harness/utils/effect-test-harness.js"
import { Effect, Layer } from "effect"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { WeatherPipelineConfig, WeatherPipelineConfigContext, type WeatherPipelineInput, WeatherService } from "../../../services/weather/index.js"
import { WeatherServiceLiveLayer, WeatherServiceTestLayer } from "../../../services/weather/index.js"

const testBaseConfig: WeatherPipelineConfig = {
    apiKey: "mock-key-integration",
    baseUrl: "mock-url-integration",
    defaultUnits: "celsius",
    timeoutMs: 1000
}

describe("Weather Pipeline Integration Tests", () => {
    // Test with the mock layer
    const testLayerHarness = createServiceTestHarness(WeatherServiceTestLayer)

    beforeAll(async () => { })
    afterAll(async () => { })

    const testInput1: WeatherPipelineInput = { location: "Berlin", units: "celsius", includeForecast: false }
    const testInput2: WeatherPipelineInput = { location: "Paris", units: "fahrenheit", includeForecast: true }

    it("should provide weather data through the test layer", async () => {
        await testLayerHarness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherService
                const result = yield* weatherService.getWeather(testInput1)
                expect(result.location.name).toBe("Berlin")
                expect(result.units).toBe("celsius")
                expect(result.temperature).toBe(22.5)
            }).pipe(Effect.orDie)
        )
    })

    it("should provide weather summary through the test layer", async () => {
        await testLayerHarness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherService
                const summary = yield* weatherService.getWeatherSummary(testInput1)
                expect(summary).toContain("Berlin")
                expect(summary).toContain("22.5°C")
            }).pipe(Effect.orDie)
        )
    })

    it("should provide weather data with forecast through the test layer", async () => {
        await testLayerHarness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherService
                const result = yield* weatherService.getWeather(testInput2)
                expect(result.location.name).toBe("Paris")
                expect(result.units).toBe("fahrenheit")
                expect(result.forecast).toBeDefined()
                if (result.forecast && result.forecast.length > 0 && result.forecast[0]) {
                    expect(result.forecast[0].conditions.description).toBe("clear sky")
                }
            }).pipe(Effect.orDie)
        )
    })

    it("should respect configuration when WeatherServiceLiveLayer is used", async () => {
        const customConfig: WeatherPipelineConfig = { ...testBaseConfig, defaultUnits: "fahrenheit" }
        const configLayer = Layer.succeed(WeatherPipelineConfigContext, customConfig)
        const weatherServiceLayerSatisfied = Layer.provide(WeatherServiceLiveLayer, configLayer)

        const finalLayerForTest = Layer.merge(weatherServiceLayerSatisfied, configLayer)

        await Effect.runPromise(
            Effect.gen(function* () {
                const config = yield* WeatherPipelineConfigContext
                const weatherService = yield* WeatherService

                expect(config.defaultUnits).toBe("fahrenheit")

                const result = yield* weatherService.getWeather({ location: "London" })
                expect(result.location.name).toBe("London")
                expect(result.units).toBe("fahrenheit")
            }).pipe(
                Effect.orDie,
                Effect.provide(finalLayerForTest)
            )
        )
    })
})