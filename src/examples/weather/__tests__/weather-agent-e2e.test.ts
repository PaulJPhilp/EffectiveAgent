/**
 * @file Weather Agent E2E Tests
 * @module examples/weather/tests
 */

import { config } from "dotenv";
config(); // Load environment variables from .env file

import { AgentRuntimeService } from "@/agent-runtime/service.js";
import { WeatherAgent } from "@/examples/weather/agent.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import TextService from "@/services/pipeline/producers/text/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Option } from "effect";
import { beforeAll, describe, expect, it } from "vitest";

// Test data
const testLocation = "San Francisco";

describe("WeatherAgent E2E Tests", () => {
    beforeAll(() => {
        // Set up config paths for real testing
        process.env.PROVIDERS_CONFIG_PATH = process.env.PROVIDERS_CONFIG_PATH || "config/providers.json";
        process.env.MODELS_CONFIG_PATH = process.env.MODELS_CONFIG_PATH || "config/models.json";
    });

    it("should get weather data through agent runtime", async () => {
        const test = Effect.gen(function* () {
            // Initialize the weather agent
            const weatherAgent = yield* WeatherAgent;

            // Test getting weather data
            const weatherData = yield* weatherAgent.getWeather({
                location: testLocation,
                units: { type: "celsius", windSpeedUnit: "mps" }
            });

            // Verify the weather data
            expect(weatherData).toBeDefined();
            expect(weatherData.location.name).toBe(testLocation);
            expect(weatherData.temperature).toBeDefined();
            expect(typeof weatherData.temperature).toBe("number");
            expect(weatherData.conditions).toBeDefined();
            expect(Array.isArray(weatherData.conditions)).toBe(true);
            expect(weatherData.conditions.length).toBeGreaterThan(0);
            expect(weatherData.humidity).toBeDefined();
            expect(weatherData.windSpeed).toBeDefined();
            expect(weatherData.timestamp).toBeDefined();
            expect(weatherData.units.type).toBe("celsius");

            // Test agent state
            const agentState = yield* weatherAgent.getAgentState();
            expect(agentState.requestCount).toBe(1);
            expect(Option.isSome(agentState.currentWeather)).toBe(true);
            expect(Option.isSome(agentState.lastUpdate)).toBe(true);

            // Get weather summary
            const summary = yield* weatherAgent.getWeatherSummary({
                location: testLocation,
                units: { type: "celsius", windSpeedUnit: "mps" }
            });

            expect(summary).toBeDefined();
            expect(typeof summary).toBe("string");
            expect(summary.length).toBeGreaterThan(0);

            // Test second request to verify state persistence
            yield* weatherAgent.getWeather({
                location: "New York",
                units: { type: "fahrenheit", windSpeedUnit: "mph" }
            });

            const updatedState = yield* weatherAgent.getAgentState();
            expect(updatedState.requestCount).toBe(2);

            // Cleanup
            yield* weatherAgent.terminate();

            return { weatherData, summary, agentState, updatedState };
        }).pipe(
            Effect.provide(WeatherAgent.Default),
            Effect.provide(AgentRuntimeService.Default),
            Effect.provide(TextService.Default),
            Effect.provide(ModelService.Default),
            Effect.provide(ProviderService.Default),
            Effect.provide(ConfigurationService.Default),
            Effect.provide(NodeFileSystem.layer)
        );

        const result: any = await Effect.runPromise(test as any);

        expect(result).toBeDefined();
        expect(result.weatherData).toBeDefined();
        expect(result.summary).toBeDefined();
        expect(result.agentState).toBeDefined();
        expect(result.updatedState).toBeDefined();
    });

    it("should handle multiple concurrent weather requests", async () => {
        const test = Effect.gen(function* () {
            const weatherAgent = yield* WeatherAgent;

            // Create multiple concurrent requests
            const locations = ["London", "Tokyo", "Sydney"];
            const requests = locations.map(location =>
                weatherAgent.getWeather({
                    location,
                    units: { type: "celsius", windSpeedUnit: "mps" }
                })
            );

            // Execute all requests concurrently
            const results = yield* Effect.all(requests, { concurrency: "unbounded" });

            // Verify all results
            expect(results).toHaveLength(3);
            for (const [index, result] of results.entries()) {
                expect(result.location.name).toBe(locations[index]);
                expect(result.temperature).toBeDefined();
                expect(result.conditions).toBeDefined();
            }

            // Check agent state
            const finalState = yield* weatherAgent.getAgentState();
            expect(finalState.requestCount).toBe(3);

            // Cleanup
            yield* weatherAgent.terminate();

            return results;
        }).pipe(
            Effect.provide(WeatherAgent.Default),
            Effect.provide(AgentRuntimeService.Default),
            Effect.provide(TextService.Default),
            Effect.provide(ModelService.Default),
            Effect.provide(ProviderService.Default),
            Effect.provide(ConfigurationService.Default),
            Effect.provide(NodeFileSystem.layer)
        );

        const results = await Effect.runPromise(test as any);
        expect(results).toHaveLength(3);
    });

    it("should track agent runtime state correctly", async () => {
        const test = Effect.gen(function* () {
            const weatherAgent = yield* WeatherAgent;
            const runtime = weatherAgent.getRuntime();

            // Check initial runtime state
            const initialRuntimeState = yield* runtime.getState();
            expect(initialRuntimeState.state.requestCount).toBe(0);
            expect(Option.isNone(initialRuntimeState.state.currentWeather)).toBe(true);

            // Make a request
            yield* weatherAgent.getWeather({
                location: "Paris",
                units: { type: "celsius", windSpeedUnit: "mps" }
            });

            // Check runtime state after request
            const updatedRuntimeState = yield* runtime.getState();
            expect(updatedRuntimeState.state.requestCount).toBe(1);
            expect(Option.isSome(updatedRuntimeState.state.currentWeather)).toBe(true);

            // Cleanup
            yield* weatherAgent.terminate();

            return updatedRuntimeState;
        }).pipe(
            Effect.provide(WeatherAgent.Default),
            Effect.provide(AgentRuntimeService.Default),
            Effect.provide(TextService.Default),
            Effect.provide(ModelService.Default),
            Effect.provide(ProviderService.Default),
            Effect.provide(ConfigurationService.Default),
            Effect.provide(NodeFileSystem.layer)
        );

        const finalState: any = await Effect.runPromise(test as any);
        expect(finalState.state.requestCount).toBe(1);
    });
}); 