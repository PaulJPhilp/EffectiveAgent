/**
 * @file Unit tests for Weather Pipeline Service
 */

import { createServiceTestHarness } from "@/services/core/test-harness/utils/effect-test-harness.js";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    type WeatherPipelineInput,
    WeatherService, // Service Tag
    WeatherServiceTestLayer // Test Layer (provides mock WeatherService & mock WeatherConfigService)
} from "../index.js"; // All imports from index

describe("WeatherService Unit Tests (using Test Layer)", () => {
    // WeatherServiceTestLayer (from service.ts, via index.ts)
    // already provides both a mock WeatherService and a MockWeatherConfigService.
    const harness = createServiceTestHarness(WeatherServiceTestLayer);

    beforeAll(async () => { });

    afterAll(async () => { });

    const testInput: WeatherPipelineInput = { location: "Berlin", units: "celsius", includeForecast: false };
    const testInputWithForecast: WeatherPipelineInput = { location: "London", units: "fahrenheit", includeForecast: true };

    it("should return weather data from mock service via test layer", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherService; // Yield the WeatherService Tag
                const result = yield* weatherService.getWeather(testInput);

                expect(result.location.name).toBe("Berlin");
                expect(result.units).toBe("celsius");
                expect(result.forecast).toBeUndefined();
                // Assertions below depend on the mock implementation in makeMockWeatherServiceImpl
                // and the defaultUnits used by it if input.units is not set.
                // makeMockWeatherServiceImpl defaults to celsius.
                expect(result.temperature).toBe(20);
            }).pipe(Effect.orDie)
        );
    });

    it("should include forecast data when requested from mock service via test layer", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherService;
                const result = yield* weatherService.getWeather(testInputWithForecast);

                expect(result.location.name).toBe("London");
                expect(result.units).toBe("fahrenheit");
                expect(result.forecast).toBeDefined();
                expect(result.forecast?.length).toBeGreaterThan(0);
                if (result.forecast && result.forecast[0]) {
                    // Adjusted for makeMockWeatherServiceImpl with defaultUnits="celsius" if not specified by input
                    // but input.units = "fahrenheit" IS specified here by testInputWithForecast
                    expect(result.forecast[0].conditions.condition).toBe("MockForecast");
                }
            }).pipe(Effect.orDie)
        );
    });

    it("should return formatted weather summary from mock service via test layer", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherService;
                const summary = yield* weatherService.getWeatherSummary(testInput);
                expect(summary).toContain("Berlin");
                expect(summary).toContain("20°C"); // Based on makeMockWeatherServiceImpl with defaultUnits="celsius"
            }).pipe(Effect.orDie)
        );
    });

    it("should include forecast in summary when requested from mock service via test layer", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const weatherService = yield* WeatherService;
                // The mock summary from makeMockWeatherServiceImpl is static for this test case.
                const summary = yield* weatherService.getWeatherSummary(testInputWithForecast);
                expect(summary).toContain("London");
                expect(summary).toContain("mock weather, 68°F"); // Based on input.units = "fahrenheit"
            }).pipe(Effect.orDie)
        );
    });
});