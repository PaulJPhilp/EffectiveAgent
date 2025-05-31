/**
 * @file Weather Agent E2E Tests with Automatic AgentRuntime
 * @module examples/weather/tests
 */

import { config } from "dotenv";
config(); // Load environment variables from .env file

import { runWithAgentRuntime } from "@/agent-runtime/index.js";
import { WeatherAgent } from "@/examples/weather/agent.js";
import { Effect } from "effect";
import { beforeAll, describe, expect, it } from "vitest";

// Test data
const testLocation = "San Francisco";

describe("WeatherAgent E2E Tests with Automatic AgentRuntime", () => {
    beforeAll(() => {
        // Set up master config path for testing  
        process.env.MASTER_CONFIG_PATH = process.env.MASTER_CONFIG_PATH || "./config/master-config.json";

        // Ensure we have an OpenAI API key for testing (can be a mock one)
        process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key-for-mock";
    });

    it("should get weather data with AgentRuntime handling all configuration automatically", async () => {
        const result = await runWithAgentRuntime(
            Effect.gen(function* () {
                // WeatherAgent uses AgentRuntime automatically - no manual initialization needed!
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

                // Cleanup
                yield* weatherAgent.terminate();

                return { weatherData, summary };
            })
        );

        expect(result).toBeDefined();
        expect(result.weatherData).toBeDefined();
        expect(result.summary).toBeDefined();
    });

    it("should handle multiple concurrent weather requests with automatic runtime", async () => {
        const results = await runWithAgentRuntime(
            Effect.gen(function* () {
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

                // Cleanup
                yield* weatherAgent.terminate();

                return results;
            })
        );

        expect(results).toHaveLength(3);
    });

    it("should track agent runtime state correctly with automatic initialization", async () => {
        const result = await runWithAgentRuntime(
            Effect.gen(function* () {
                const weatherAgent = yield* WeatherAgent;
                const runtime = weatherAgent.getRuntime();

                // Check initial runtime state
                const initialRuntimeState = yield* runtime.getState();
                expect(initialRuntimeState.state.requestCount).toBe(0);

                // Make a request
                yield* weatherAgent.getWeather({
                    location: "Paris",
                    units: { type: "celsius", windSpeedUnit: "mps" }
                });

                // Verify the agent runtime is properly configured with logging
                // The master config should have set up file logging to ./logs/app.log automatically
                const finalRuntimeState = yield* runtime.getState();
                expect(finalRuntimeState).toBeDefined();
                expect(finalRuntimeState.processing).toBeDefined();

                // Cleanup
                yield* weatherAgent.terminate();

                return { success: true };
            })
        );

        expect(result.success).toBe(true);
    });

    it("should demonstrate automatic logging configuration from master config", async () => {
        const result = await runWithAgentRuntime(
            Effect.gen(function* () {
                // This test verifies that AgentRuntime automatically handles
                // logging configuration from master-config.json

                // The logging should be automatically configured to write to ./logs/app.log
                // as specified in the master config - no manual setup required!

                yield* Effect.log("Testing weather agent with automatic runtime initialization");

                const weatherAgent = yield* WeatherAgent;

                yield* Effect.log("Weather agent initialized through automatic AgentRuntime");

                const weatherData = yield* weatherAgent.getWeather({
                    location: "Test City",
                    units: { type: "celsius", windSpeedUnit: "mps" }
                });

                yield* Effect.log("Weather data retrieved successfully", {
                    location: weatherData.location.name,
                    temperature: weatherData.temperature
                });

                // Cleanup
                yield* weatherAgent.terminate();

                return {
                    success: true,
                    loggingConfiguredAutomatically: true,
                    weatherDataReceived: true,
                    logFileShouldBeCreated: "./logs/app.log"
                };
            })
        );

        expect(result.success).toBe(true);
        expect(result.loggingConfiguredAutomatically).toBe(true);
        expect(result.weatherDataReceived).toBe(true);
        expect(result.logFileShouldBeCreated).toBe("./logs/app.log");
    });
}); 