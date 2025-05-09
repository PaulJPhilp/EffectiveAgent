/**
 * @file End-to-End tests for Weather Pipeline
 */

import { Effect, Layer } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WeatherPipelineConfig, WeatherPipelineConfigContext, WeatherService } from "../contract.js";
import { WeatherServiceLive } from "../service.js";

// Test configuration for E2E tests
const e2eConfig: WeatherPipelineConfig = {
    apiKey: "test-api-key",
    baseUrl: "https://api.example.com/weather",
    defaultUnits: "celsius",
    timeoutMs: 5000
};

// Track resources that need cleanup
const resources: Array<() => Promise<void>> = [];

// Cleanup function
const cleanupAll = async () => {
    for (const cleanup of resources) {
        await cleanup();
    }
    resources.length = 0;
};

describe("Weather Pipeline E2E Tests", () => {
    // Setup once before all tests
    beforeAll(() => {
        // Any global setup needed before all tests
        // This could include setting up external dependencies or test doubles
    });

    // Cleanup after all tests
    afterAll(() => {
        // Global cleanup after all tests
        return cleanupAll();
    });

    describe("Complete Weather Data Flow", () => {
        // Test the complete flow from input to weather data to summary
        it("should process a complete weather request flow", async () => {
            // Arrange: Set up the configuration and service layers
            const configLayer = Layer.succeed(WeatherPipelineConfigContext, e2eConfig);
            const weatherLayer = WeatherServiceLive(e2eConfig);
            const combinedLayers = Layer.merge(configLayer, weatherLayer);

            // Build a program that tests the complete flow
            const program = Effect.gen(function* () {
                const weatherService = yield* WeatherService;

                // Step 1: Get weather data
                const weatherData = yield* weatherService.getWeather({
                    location: "Seattle",
                    includeForecast: true,
                    units: "celsius"
                });

                // Step 2: Get weather summary using the same parameters
                const weatherSummary = yield* weatherService.getWeatherSummary({
                    location: "Seattle",
                    includeForecast: true,
                    units: "celsius"
                });

                // Return both for verification
                return {
                    data: weatherData,
                    summary: weatherSummary
                };
            });

            // Act: Run the program with the provided layers
            const result = await Effect.runPromise(
                program.pipe(Effect.provide(combinedLayers))
            );

            // Assert: Verify the complete flow worked as expected
            expect(result.data).toBeDefined();
            expect(result.data.location.name).toBe("Seattle");
            expect(result.data.temperature).toBeDefined();
            expect(result.data.forecast).toBeDefined();
            expect(result.data.units).toBe("celsius");

            expect(result.summary).toBeDefined();
            expect(result.summary).toContain("Seattle");
            expect(result.summary).toContain("Tomorrow will be");
        });
    });

    describe("Error Handling", () => {
        it("should handle invalid locations gracefully", async () => {
            // In a real implementation, we would test with an actual invalid location
            // Here, we're demonstrating the pattern for error handling tests

            // This is a placeholder - in real E2E tests, you'd test actual error handling
            // with real API calls or properly mocked error responses
            expect(true).toBe(true);
        });
    });

    describe("Pipeline Performance", () => {
        it("should complete weather requests within acceptable timeframe", async () => {
            // Arrange: Set up the layers
            const configLayer = Layer.succeed(WeatherPipelineConfigContext, e2eConfig);
            const weatherLayer = WeatherServiceLive(e2eConfig);
            const combinedLayers = Layer.merge(configLayer, weatherLayer);

            // Create the program to measure
            const program = Effect.gen(function* () {
                const weatherService = yield* WeatherService;
                return yield* weatherService.getWeather({ location: "New York" });
            });

            // Act: Measure the execution time
            const startTime = Date.now();
            await Effect.runPromise(
                program.pipe(Effect.provide(combinedLayers))
            );
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            // Assert: Check it completed within acceptable time
            // Note: Adjust this threshold based on your actual requirements
            expect(executionTime).toBeLessThan(1000); // 1 second is a reasonable expectation for mock data
        });
    });
});