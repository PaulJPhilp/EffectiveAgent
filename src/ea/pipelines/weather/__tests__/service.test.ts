/**
 * @file Unit tests for Weather Pipeline Service
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { WeatherPipelineInput } from "../contract.js";
import { makeMockWeatherService, makeWeatherService } from "../service.js";

// Sample configuration for testing
const testConfig = {
    apiKey: "test-api-key",
    baseUrl: "https://api.example.com/weather",
    defaultUnits: "celsius" as const,
    timeoutMs: 5000
};

describe("WeatherService", () => {
    describe("makeWeatherService", () => {
        const service = makeWeatherService(testConfig);

        describe("getWeather", () => {
            it("should return weather data for a valid location", async () => {
                // Arrange
                const input: WeatherPipelineInput = {
                    location: "New York"
                };

                // Act
                const result = await Effect.runPromise(service.getWeather(input));

                // Assert
                expect(result).toBeDefined();
                expect(result.location.name).toBe("New York");
                expect(result.temperature).toBeDefined();
                expect(result.conditions).toBeDefined();
                expect(result.units).toBe("celsius"); // Should use default units
            });

            it("should respect requested units", async () => {
                // Arrange
                const input: WeatherPipelineInput = {
                    location: "New York",
                    units: "fahrenheit"
                };

                // Act
                const result = await Effect.runPromise(service.getWeather(input));

                // Assert
                expect(result.units).toBe("fahrenheit");
            });

            it("should include forecast data when requested", async () => {
                // Arrange
                const input: WeatherPipelineInput = {
                    location: "New York",
                    includeForecast: true
                };

                // Act
                const result = await Effect.runPromise(service.getWeather(input));

                // Assert
                expect(result.forecast).toBeDefined();
                expect(Array.isArray(result.forecast)).toBe(true);
                expect(result.forecast?.length).toBeGreaterThan(0);
                expect(result.forecast?.[0].highTemperature).toBeDefined();
            });
        });

        describe("getWeatherSummary", () => {
            it("should return formatted weather summary", async () => {
                // Arrange
                const input: WeatherPipelineInput = {
                    location: "New York"
                };

                // Act
                const result = await Effect.runPromise(service.getWeatherSummary(input));

                // Assert
                expect(result).toBeDefined();
                expect(typeof result).toBe("string");
                expect(result).toContain("New York");
                expect(result).toContain("°C"); // Should use default units
            });

            it("should include forecast in summary when requested", async () => {
                // Arrange
                const input: WeatherPipelineInput = {
                    location: "New York",
                    includeForecast: true
                };

                // Act
                const result = await Effect.runPromise(service.getWeatherSummary(input));

                // Assert
                expect(result).toContain("Tomorrow will be");
            });
        });
    });

    describe("makeMockWeatherService", () => {
        const mockService = makeMockWeatherService();

        it("should return mock weather data", async () => {
            // Arrange
            const input: WeatherPipelineInput = {
                location: "Test City"
            };

            // Act
            const result = await Effect.runPromise(mockService.getWeather(input));

            // Assert
            expect(result.location.name).toBe("Test City");
        });

        it("should return mock summary", async () => {
            // Arrange
            const input: WeatherPipelineInput = {
                location: "Test City"
            };

            // Act
            const result = await Effect.runPromise(mockService.getWeatherSummary(input));

            // Assert
            expect(result).toContain("Test City");
        });
    });
});