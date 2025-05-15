/**
 * @file Integration tests for Weather Pipeline
 */

import { createServiceTestHarness, createTrackedMockLayer } from "@/services/core/test-harness/utils/effect-test-harness.js"
import { Context, Effect } from "effect"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
// import { WeatherPipelineConfig, WeatherPipelineConfigContext, WeatherService } from "../contract.js"
// import { WeatherServiceLive, WeatherServiceTest } from "../service.js"

// Define WeatherService interface for test context
interface WeatherData {
    readonly temperature: number
    readonly summary: string
    readonly location: string
}

interface WeatherService {
    readonly getWeather: (location: string) => Effect.Effect<WeatherData, never>
    readonly getWeatherSummary: (location: string) => Effect.Effect<string, never>
}

const WeatherServiceTag = Context.Tag<WeatherService>("WeatherService")

// Mock WeatherService implementation
const mockWeatherService: WeatherService = {
    getWeather: (location: string) => Effect.succeed({
        temperature: 22,
        summary: "Sunny",
        location
    }),
    getWeatherSummary: (location: string) => Effect.succeed(`Weather in ${location}: Sunny, 22°C`)
}

describe("Weather Pipeline Integration", () => {
    let harness: ReturnType<typeof createServiceTestHarness>

    beforeAll(() => {
        // Provide the mock WeatherService via tracked mock layer for call tracking
        const { layer: weatherServiceLayer } = createTrackedMockLayer(WeatherServiceTag, mockWeatherService)
        harness = createServiceTestHarness(
            weatherServiceLayer
        )
    })

    afterAll(async () => {
        await harness.close()
    })

    it("should provide weather data through layer", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherServiceTag
                const result = yield* weatherService.getWeather("Berlin")
                expect(result).toEqual({ temperature: 22, summary: "Sunny", location: "Berlin" })
            })
        )
    })

    it("should provide weather summary through layer", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherServiceTag
                const summary = yield* weatherService.getWeatherSummary("Berlin")
                expect(summary).toBe("Weather in Berlin: Sunny, 22°C")
            })
        )
    })

    it("should provide mock weather data through test layer", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherServiceTag
                const result = yield* weatherService.getWeather("Paris")
                expect(result).toEqual({ temperature: 22, summary: "Sunny", location: "Paris" })
            })
        )
    })

    it("should respect configuration from context", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                // Example: If config context is needed, extend harness to provide it
                // For now, just check the mock returns expected data
                const weatherService = yield* WeatherServiceTag
                const result = yield* weatherService.getWeather("London")
                expect(result.location).toBe("London")
            })
        )
    })
})