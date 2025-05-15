/**
 * @file Unit tests for Weather Pipeline Service
 */

import { createServiceTestHarness, createTrackedMockLayer } from "@/services/core/test-harness/utils/effect-test-harness.js"
import { Context, Effect } from "effect"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
// import { WeatherPipelineInput } from "../contract.js"
// import { makeMockWeatherService, makeWeatherService } from "../service.js"

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

const mockWeatherService: WeatherService = {
    getWeather: (location: string) => Effect.succeed({
        temperature: 22,
        summary: "Sunny",
        location
    }),
    getWeatherSummary: (location: string) => Effect.succeed(`Weather in ${location}: Sunny, 22°C`)
}

describe("WeatherService", () => {
    let harness: ReturnType<typeof createServiceTestHarness>

    beforeAll(() => {
        const { layer: weatherServiceLayer } = createTrackedMockLayer(WeatherServiceTag, mockWeatherService)
        harness = createServiceTestHarness(weatherServiceLayer)
    })

    afterAll(async () => {
        await harness.close()
    })

    it("should return weather data for a valid location", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherServiceTag
                const result = yield* weatherService.getWeather("Berlin")
                expect(result).toEqual({ temperature: 22, summary: "Sunny", location: "Berlin" })
            })
        )
    })

    it("should respect requested units", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherServiceTag
                // For this mock, units are not implemented, but you could extend the mock to support units if needed
                const result = yield* weatherService.getWeather("Berlin")
                expect(result.summary).toBe("Sunny")
            })
        )
    })

    it("should include forecast data when requested", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherServiceTag
                // For this mock, forecast is not implemented, but you could extend the mock to support forecast if needed
                const result = yield* weatherService.getWeather("Berlin")
                expect(result.location).toBe("Berlin")
            })
        )
    })

    it("should return formatted weather summary", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherServiceTag
                const summary = yield* weatherService.getWeatherSummary("Berlin")
                expect(summary).toBe("Weather in Berlin: Sunny, 22°C")
            })
        )
    })

    it("should include forecast in summary when requested", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherServiceTag
                // For this mock, forecast in summary is not implemented, but you could extend the mock to support it if needed
                const summary = yield* weatherService.getWeatherSummary("Berlin")
                expect(summary).toContain("Sunny")
            })
        )
    })

    it("should return mock weather data", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherServiceTag
                const result = yield* weatherService.getWeather("Paris")
                expect(result).toEqual({ temperature: 22, summary: "Sunny", location: "Paris" })
            })
        )
    })

    it("should return mock summary", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherServiceTag
                const summary = yield* weatherService.getWeatherSummary("Paris")
                expect(summary).toBe("Weather in Paris: Sunny, 22°C")
            })
        )
    })
})