/**
 * @file Weather Service implementation.
 * @module ea/pipelines/weather/service
 */

import { Effect } from "effect";
import {
    WeatherData,
    WeatherPipelineConfig,
    WeatherPipelineConfigContext,
    WeatherPipelineInput,
    WeatherServiceApi
} from "./api.js";
import { WeatherPipelineError } from "./errors.js";

// -------------------------------------------------------------------------------------
// SECTION: Configuration Values
// -------------------------------------------------------------------------------------

// Default configuration values
const defaultConfig: WeatherPipelineConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    baseUrl: "https://api.example.com/weather",
    defaultUnits: "celsius",
    timeoutMs: 5000
};

// -------------------------------------------------------------------------------------
// SECTION: Helper Functions
// -------------------------------------------------------------------------------------

function convertTemperature(temp: number, toUnit: "celsius" | "fahrenheit"): number {
    if (toUnit === "celsius") {
        return Math.round((temp - 32) * 5 / 9);
    }
    return Math.round((temp * 9 / 5) + 32);
}

// -------------------------------------------------------------------------------------
// SECTION: WeatherService Implementation
// -------------------------------------------------------------------------------------

/**
 * Concrete implementation of WeatherService following the Effect.Service pattern
 */
export class WeatherService extends Effect.Service<WeatherServiceApi>()(
    "WeatherService",
    {
        effect: Effect.gen(function* () {
            // Define the getWeather function first
            const getWeather = (input: WeatherPipelineInput): Effect.Effect<WeatherData, WeatherPipelineError> => {
                const units = input.units || defaultConfig.defaultUnits;

                return Effect.gen(function* () {
                    // Simulate an API call with some random variation
                    const temperatureBase = units === "celsius" ? 20 : 68; // 20°C or 68°F
                    const temperature = Math.round((temperatureBase + (Math.random() * 5 - 2.5)) * 10) / 10;
                    const temperatureFeelsLike = Math.round((temperature - 1 + (Math.random() * 2 - 1)) * 10) / 10;
                    const humidity = Math.round(55 + (Math.random() * 20 - 10));
                    const windSpeed = Math.round((units === "celsius" ? 3 : 6.71) * (1 + (Math.random() * 0.4 - 0.2)) * 10) / 10;
                    const windDirection = Math.round(Math.random() * 360);

                    // Simulate different weather conditions
                    const possibleConditions = [
                        { condition: "Clear", description: "clear sky", icon: "01d" },
                        { condition: "Clouds", description: "scattered clouds", icon: "03d" },
                        { condition: "Rain", description: "light rain", icon: "10d" },
                        { condition: "Snow", description: "light snow", icon: "13d" },
                    ];
                    const randomConditionIndex = Math.floor(Math.random() * possibleConditions.length);
                    const mainCondition = possibleConditions[randomConditionIndex];
                    
                    if (!mainCondition) {
                        return yield* Effect.fail(new WeatherPipelineError({
                            message: "Failed to generate weather condition",
                            cause: new Error("Invalid condition index")
                        }));
                    }

                    // Build the weather data response
                    const weatherData: WeatherData = {
                        location: {
                            name: input.location,
                            country: "Demo",
                            coordinates: {
                                latitude: 0,
                                longitude: 0,
                            },
                        },
                        temperature,
                        temperatureFeelsLike,
                        humidity,
                        windSpeed,
                        windDirection,
                        conditions: [mainCondition],
                        timestamp: new Date().toISOString(),
                        units,
                        forecast: input.includeForecast ? [{
                            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0] ?? "",
                            highTemperature: Math.round((temperature + 3 + (Math.random() * 2)) * 10) / 10,
                            lowTemperature: Math.round((temperature - 5 - (Math.random() * 3)) * 10) / 10,
                            conditions: {
                                condition: mainCondition.condition,
                                description: mainCondition.description,
                                icon: mainCondition.icon,
                            }
                        }] : undefined
                    };

                    return weatherData;
                }).pipe(
                    Effect.catchAll((error) => {
                        console.error("Weather API error:", error);
                        return Effect.fail(new WeatherPipelineError({
                            message: `Failed to fetch weather data for ${input.location}`,
                            cause: error instanceof Error ? error : new Error(String(error))
                        }));
                    })
                );
            };

            // Define getWeatherSummary using the previously defined getWeather function
            const getWeatherSummary = (input: WeatherPipelineInput): Effect.Effect<string, WeatherPipelineError> => {
                // Use the local getWeather reference instead of this.getWeather
                return Effect.flatMap(getWeather(input), (data) => {
                    const mainCondition = data.conditions[0];
                    if (!mainCondition) {
                        return Effect.fail(new WeatherPipelineError({
                            message: "Failed to generate weather condition",
                            cause: new Error("Missing condition in weather data")
                        }));
                    }

                    const tempUnit = data.units === "celsius" ? "°C" : "°F";
                    let summary = `Current weather in ${data.location.name}: ${mainCondition.description}, ${data.temperature}${tempUnit}. Feels like ${data.temperatureFeelsLike}${tempUnit}.`;

                    if (data.forecast?.[0]) {
                        const tomorrow = data.forecast[0];
                        summary += ` Tomorrow will be ${tomorrow.conditions.description}, with a high of ${tomorrow.highTemperature}${tempUnit} and a low of ${tomorrow.lowTemperature}${tempUnit}.`;
                    }

                    return Effect.succeed(summary);
                });
            };

            // Return both functions in the implementation object
            return {
                getWeather,
                getWeatherSummary
            };
        }),
        dependencies: []
    }
) { }


/** Mock configuration for testing */
export const mockConfig: WeatherPipelineConfig = {
    apiKey: "MOCK_API_KEY",
    baseUrl: "https://mock.api.weather",
    defaultUnits: "celsius",
    timeoutMs: 1000
};