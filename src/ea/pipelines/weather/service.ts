/**
 * @file Service implementation for the WeatherPipeline
 * @module ea/pipelines/weather/service
 */

import { Context, Effect } from "effect";
import { type WeatherData, WeatherPipeline, type WeatherPipelineApi, WeatherPipelineError, type WeatherPipelineInput } from "./contract.js";

// Dependencies
class EaLlmProvider extends Context.Tag("EaLlmProvider")<EaLlmProvider, any>() { }
class WeatherTool extends Context.Tag("WeatherTool")<WeatherTool, any>() { }

/**
 * Implementation of the WeatherPipeline service
 */
export class WeatherPipelineService extends Effect.Service<WeatherPipelineApi>()(
    WeatherPipeline,
    {
        effect: Effect.gen(function* (_) {
            // Yield dependencies
            const llm = yield* _(EaLlmProvider);
            const weatherTool = yield* _(WeatherTool);

            // Helper function to convert temperature units
            const convertTemperature = (temp: number, toUnit: "celsius" | "fahrenheit"): number => {
                if (toUnit === "celsius") {
                    return Math.round((temp - 32) * 5 / 9);
                } else {
                    return Math.round((temp * 9 / 5) + 32);
                }
            };

            // Method implementations
            const getWeather = (input: WeatherPipelineInput): Effect.Effect<WeatherData, WeatherPipelineError> =>
                Effect.gen(function* (_) {
                    yield* _(Effect.logInfo(`Fetching weather data for location: ${input.location}`));

                    try {
                        // In a real implementation, we would call the weather service API
                        // For now, we'll use mock data that mimics the structure

                        // Mock data generation
                        const temperature = 15 + Math.floor(Math.random() * 15); // Between 15-30
                        const feelsLike = temperature - 2 + Math.floor(Math.random() * 5);
                        const humidity = 40 + Math.floor(Math.random() * 40);
                        const windSpeed = 5 + Math.floor(Math.random() * 20);
                        const windDirection = Math.floor(Math.random() * 360);

                        // Basic condition determination based on random data
                        const conditions = [
                            { condition: "Clear", description: "Clear sky" },
                            { condition: "Partly cloudy", description: "Few clouds" },
                            { condition: "Cloudy", description: "Overcast" },
                            { condition: "Rain", description: "Light rain" }
                        ];

                        const conditionIndex = Math.floor(Math.random() * conditions.length);

                        // Determine units
                        const units = input.units || "celsius";

                        // Generate forecast if requested
                        const forecast = input.includeForecast ? Array.from({ length: 5 }, (_, i) => {
                            const forecastDate = new Date();
                            forecastDate.setDate(forecastDate.getDate() + i + 1);

                            const highTemp = temperature + Math.floor(Math.random() * 5) - 2;
                            const lowTemp = temperature - 5 - Math.floor(Math.random() * 3);

                            return {
                                date: forecastDate.toISOString().split('T')[0],
                                highTemperature: units === "celsius" ? highTemp : convertTemperature(highTemp, "fahrenheit"),
                                lowTemperature: units === "celsius" ? lowTemp : convertTemperature(lowTemp, "fahrenheit"),
                                conditions: conditions[Math.floor(Math.random() * conditions.length)]
                            };
                        }) : undefined;

                        // Create the weather data object
                        const weatherData: WeatherData = {
                            location: {
                                name: input.location,
                                country: "Placeholder Country",
                                coordinates: {
                                    latitude: 40.7128, // Example coordinates (NYC)
                                    longitude: -74.0060
                                }
                            },
                            temperature: units === "celsius" ? temperature : convertTemperature(temperature, "fahrenheit"),
                            temperatureFeelsLike: units === "celsius" ? feelsLike : convertTemperature(feelsLike, "fahrenheit"),
                            humidity,
                            windSpeed,
                            windDirection,
                            conditions: [conditions[conditionIndex]],
                            forecast,
                            timestamp: new Date().toISOString(),
                            units
                        };

                        return yield* _(Effect.succeed(weatherData));
                    } catch (error) {
                        return yield* _(
                            Effect.fail(
                                new WeatherPipelineError({
                                    message: `Failed to retrieve weather data: ${error instanceof Error ? error.message : String(error)}`,
                                    cause: error
                                })
                            )
                        );
                    }
                });

            const getWeatherSummary = (input: WeatherPipelineInput): Effect.Effect<string, WeatherPipelineError> =>
                Effect.gen(function* (_) {
                    yield* _(Effect.logInfo(`Generating weather summary for location: ${input.location}`));

                    try {
                        // First get the weather data
                        const weatherData = yield* _(getWeather(input));

                        // In a real implementation, we would use the LLM to generate a natural language summary
                        // For now, we'll create a template-based summary

                        const unitSymbol = weatherData.units === "celsius" ? "°C" : "°F";
                        const windSpeedUnit = "km/h";
                        const currentCondition = weatherData.conditions[0];

                        let summary = `The current weather in ${weatherData.location.name} is ${currentCondition.description.toLowerCase()} with a temperature of ${weatherData.temperature}${unitSymbol}. `;
                        summary += `It feels like ${weatherData.temperatureFeelsLike}${unitSymbol}. `;
                        summary += `Humidity is at ${weatherData.humidity}% with winds at ${weatherData.windSpeed} ${windSpeedUnit}.`;

                        if (weatherData.forecast && weatherData.forecast.length > 0) {
                            const tomorrow = weatherData.forecast[0];
                            summary += ` Tomorrow will be ${tomorrow.conditions.description.toLowerCase()} with highs of ${tomorrow.highTemperature}${unitSymbol} and lows of ${tomorrow.lowTemperature}${unitSymbol}.`;
                        }

                        return yield* _(Effect.succeed(summary));
                    } catch (error) {
                        return yield* _(
                            Effect.fail(
                                new WeatherPipelineError({
                                    message: `Failed to generate weather summary: ${error instanceof Error ? error.message : String(error)}`,
                                    cause: error
                                })
                            )
                        );
                    }
                });

            // Return implementation of the API
            return {
                getWeather,
                getWeatherSummary
            };
        }),

        // List dependencies required by the 'effect' factory
        dependencies: [EaLlmProvider, WeatherTool]
    }
) { }

/**
 * Layer for the WeatherPipeline service
 */
export const WeatherPipelineLayer = WeatherPipelineService; 