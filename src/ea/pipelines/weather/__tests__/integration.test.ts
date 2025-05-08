/**
 * @file Integration tests for Weather Pipeline
 */

import { Effect, Layer } from "effect";
import { describe, expect, it } from "@effect/vitest";
import {
    WeatherPipelineConfig,
    WeatherPipelineConfigContext,
    WeatherService
} from "../contract.js";
import { WeatherServiceLive, WeatherServiceTest } from "../service.js";

// Test configuration
const testConfig: WeatherPipelineConfig = {
    apiKey: "test-api-key",
    baseUrl: "https://api.example.com/weather",
    defaultUnits: "celsius",
    timeoutMs: 5000
};

describe("Weather Pipeline Integration", () => {
    describe("Live Service Layer", () => {
        // Setup the layers
        const configLayer = Layer.succeed(WeatherPipelineConfigContext, testConfig);
        const weatherServiceLayer = WeatherServiceLive(testConfig);
        const combinedLayers = Layer.merge(configLayer, weatherServiceLayer);

        it("should provide weather data through layer", async () => {
            // Create the effect that needs the layer
            const program = Effect.gen(function* () {
                const weatherService = yield* WeatherService;
                const result = yield* weatherService.getWeather({ location: "London" });
                return result;
            });

            // Run the effect with the layer
            const result = await Effect.runPromise(
                program.pipe(Effect.provide(combinedLayers))
            );

            // Verify results
            expect(result).toBeDefined();
            expect(result.location.name).toBe("London");
            expect(result.temperature).toBeDefined();
        });

        it("should provide weather summary through layer", async () => {
            // Create the effect
            const program = Effect.gen(function* () {
                const weatherService = yield* WeatherService;
                const result = yield* weatherService.getWeatherSummary({
                    location: "London",
                    includeForecast: true
                });
                return result;
            });

            // Run with layer
            const result = await Effect.runPromise(
                program.pipe(Effect.provide(combinedLayers))
            );

            // Verify results
            expect(result).toContain("London");
            expect(result).toContain("temperature");
        });
    });

    describe("Test Service Layer", () => {
        // Just use the test layer
        const mockLayer = WeatherServiceTest;

        it("should provide mock weather data through test layer", async () => {
            // Create the effect
            const program = Effect.gen(function* () {
                const weatherService = yield* WeatherService;
                const result = yield* weatherService.getWeather({ location: "Test City" });
                return result;
            });

            // Run with test layer
            const result = await Effect.runPromise(
                program.pipe(Effect.provide(mockLayer))
            );

            // Verify results
            expect(result).toBeDefined();
            expect(result.location.name).toBe("Test City");
        });
    });

    describe("Configuration Context", () => {
        it("should respect configuration from context", async () => {
            // Create an effect that explicitly uses the config
            const program = Effect.gen(function* () {
                const config = yield* WeatherPipelineConfigContext;
                const weatherService = yield* WeatherService;
                const result = yield* weatherService.getWeather({ location: "Paris" });

                // Return both for verification
                return { config, result };
            });

            // Provide both layers
            const configLayer = Layer.succeed(WeatherPipelineConfigContext, testConfig);
            const weatherLayer = WeatherServiceLive(testConfig);
            const combinedLayers = Layer.merge(configLayer, weatherLayer);

            // Run with layers
            const { config, result } = await Effect.runPromise(
                program.pipe(Effect.provide(combinedLayers))
            );

            // Verify config was properly used
            expect(config.defaultUnits).toBe(testConfig.defaultUnits);
            expect(result.units).toBe(testConfig.defaultUnits);
        });
    });
});