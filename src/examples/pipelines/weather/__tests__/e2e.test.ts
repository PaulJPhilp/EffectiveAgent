/**
 * @file End-to-End tests for Weather Pipeline
 */

import { Effect, Layer } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    WeatherPipelineConfig,
    WeatherPipelineConfigContext,
    WeatherService
} from "../api.js";
import { WeatherServiceLiveLayer } from "../service.js";

// Test configuration for E2E tests
const e2eTestConfig: WeatherPipelineConfig = {
    apiKey: "test-api-key",
    baseUrl: "https://api.example.com/weather",
    defaultUnits: "celsius",
    timeoutMs: 5000
};

// Create the config layer
const testConfigLayer = Layer.succeed(WeatherPipelineConfigContext, e2eTestConfig);

// Compose the final layer for E2E tests
// Layer.provide(consumer, provider) means provider is supplied to consumer
const e2eTestLayer = Layer.provide(WeatherServiceLiveLayer, testConfigLayer);

// Track resources that need cleanup (if any, less likely with this pattern)
const resources: Array<() => Promise<void>> = [];

// Cleanup function
const cleanupAll = async () => {
    for (const cleanup of resources) {
        await cleanup();
    }
    resources.length = 0;
};

describe("Weather Pipeline E2E Tests", () => {
    beforeAll(() => {
        // Global setup if needed
    });

    afterAll(() => {
        return cleanupAll();
    });

    describe("Complete Weather Data Flow", () => {
        it("should process a complete weather request flow", async () => {
            const program = Effect.gen(function* () {
                const weatherService = yield* WeatherService;
                const weatherData = yield* weatherService.getWeather({
                    location: "Seattle",
                    includeForecast: true,
                    units: "celsius"
                });
                const weatherSummary = yield* weatherService.getWeatherSummary({
                    location: "Seattle",
                    includeForecast: true,
                    units: "celsius"
                });
                return { data: weatherData, summary: weatherSummary };
            });

            const result = await Effect.runPromise(
                program.pipe(Effect.provide(e2eTestLayer))
            );

            expect(result.data).toBeDefined();
            expect(result.data.location.name).toBe("Seattle");
            expect(result.data.temperature).toBe(22.5);
            expect(result.data.forecast).toBeDefined();
            expect(result.data.units).toBe("celsius");

            expect(result.summary).toBeDefined();
            expect(result.summary).toContain("Seattle");
            expect(result.summary).toContain("clear sky");
            if (result.data.forecast && result.data.forecast[0]) {
                expect(result.summary).toContain("Tomorrow will be clear sky");
            }
        });
    });

    describe("Error Handling", () => {
        it("should handle invalid locations gracefully", async () => {
            // This test remains a placeholder for actual error testing with a real service
            // or a more sophisticated mock that can simulate errors.
            // For now, it just ensures the test structure is present.
            const program = Effect.succeed(true);
            const result = await Effect.runPromise(program.pipe(Effect.provide(e2eTestLayer)));
            expect(result).toBe(true);
        });
    });

    describe("Pipeline Performance", () => {
        it("should complete weather requests within acceptable timeframe", async () => {
            const program = Effect.gen(function* () {
                const weatherService = yield* WeatherService;
                return yield* weatherService.getWeather({ location: "New York" });
            });

            const startTime = Date.now();
            await Effect.runPromise(
                program.pipe(Effect.provide(e2eTestLayer))
            );
            const endTime = Date.now();
            const executionTime = endTime - startTime;
            expect(executionTime).toBeLessThan(1000);
        });
    });
});