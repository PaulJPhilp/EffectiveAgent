/**
 * @file Weather Service implementation
 * @module ea/pipelines/weather/service
 */

import { Effect, Logger, Option } from "effect";
import { WeatherPipelineError } from "./errors.js";
import {
    WeatherServiceApi,
    WeatherPipelineInput,
    WeatherData,
    WeatherCondition,
    defaultConfig
} from "./api.js";
import TextService from "@/services/pipeline/producers/text/service.js";

/**
 * Implementation of the WeatherService for generating simulated weather data
 */
export class WeatherService extends Effect.Service<WeatherServiceApi>()(
    "WeatherService",
    {
        effect: Effect.gen(function* () {
            // Get text service for generating weather data
            const textService = yield* TextService;

            return {
                getWeather: (input: WeatherPipelineInput): Effect.Effect<WeatherData, WeatherPipelineError, never> =>
                    Effect.gen(function* () {
                        // Log request details
                        yield* Effect.logInfo("Weather request received", { 
                            location: input.location,
                            units: input.units,
                            includeForecast: input.includeForecast 
                        });
                        
                        // Validate input
                        if (!input.location) {
                            const error = new WeatherPipelineError({ 
                                message: "Location is required" 
                            });
                            yield* Effect.logError("Weather request failed", { error });
                            return yield* Effect.fail(error);
                        }

                        yield* Effect.logDebug("Generating weather data", { input });
                        
                        const units = input.units || defaultConfig.defaultUnits;
                        const prompt = `Generate current weather data for ${input.location} in ${units}. Include temperature, feels like temperature, humidity, wind speed, wind direction, and conditions. ${input.includeForecast ? 'Also include a 5-day forecast.' : ''}`;

                        // Generate weather data using text service
                        const result = yield* textService.generate({
                            prompt,
                            system: Option.some("You are a weather data provider. Return data in a structured format with numeric values and descriptions."),
                            modelId: "gpt-4", // Use a capable model for structured data
                            parameters: {
                                temperature: 0.7,
                                maxSteps: 500
                            },
                            span: undefined as any // TODO: Add proper span
                        }).pipe(
                            Effect.mapError(error => new WeatherPipelineError({
                                message: "Failed to generate weather data",
                                cause: error
                            }))
                        );

                        // Parse the generated text into weather data
                        try {
                            const generatedData = JSON.parse(result.data.output);
                            const mainCondition: WeatherCondition = {
                                condition: generatedData.condition || "unknown",
                                description: generatedData.description || "Weather conditions unavailable",
                                icon: "sun" // TODO: Map conditions to icons
                            };

                            const forecast = input.includeForecast && generatedData.forecast
                                ? generatedData.forecast.map((day: any) => ({
                                    date: day.date,
                                    highTemperature: day.highTemp,
                                    lowTemperature: day.lowTemp,
                                    conditions: {
                                        condition: day.condition || "unknown",
                                        description: day.description || "Forecast unavailable",
                                        icon: "sun" // TODO: Map conditions to icons
                                    }
                                })) as ReadonlyArray<{
                                    readonly date: string;
                                    readonly highTemperature: number;
                                    readonly lowTemperature: number;
                                    readonly conditions: WeatherCondition;
                                }>
                                : undefined;

                            const weatherData: WeatherData = {
                                location: {
                                    name: input.location,
                                    country: generatedData.country || "Unknown Country",
                                    coordinates: generatedData.coordinates || {
                                        latitude: 0,
                                        longitude: 0
                                    }
                                },
                                temperature: generatedData.temperature || 20,
                                temperatureFeelsLike: generatedData.feelsLike || generatedData.temperature || 20,
                                humidity: generatedData.humidity || 50,
                                windSpeed: generatedData.windSpeed || 0,
                                windDirection: generatedData.windDirection || 0,
                                conditions: [mainCondition],
                                forecast,
                                timestamp: new Date().toISOString(),
                                units
                            };

                            yield* Effect.logInfo("Weather data generated successfully", { 
                                location: weatherData.location.name,
                                temperature: weatherData.temperature,
                                conditions: weatherData.conditions[0]?.description ?? "unknown",
                                hasForecast: !!weatherData.forecast
                            });
                            
                            return weatherData;
                        } catch (error) {
                            const parseError = new WeatherPipelineError({
                                message: "Failed to parse generated weather data",
                                cause: error
                            });
                            yield* Effect.logError("Weather data parsing failed", { error: parseError });
                            return yield* Effect.fail(parseError);
                        }
                    }),

                getWeatherSummary: (input: WeatherPipelineInput): Effect.Effect<string, WeatherPipelineError> =>
                    Effect.gen(function* (this: WeatherService) {
                        yield* Effect.logInfo("Weather summary request received", { 
                            location: input.location,
                            units: input.units
                        });

                        // Validate input
                        if (!input.location) {
                            const error = new WeatherPipelineError({ 
                                message: "Location is required" 
                            });
                            yield* Effect.logError("Weather summary request failed", { error });
                            return yield* Effect.fail(error);
                        }

                        yield* Effect.logDebug("Fetching weather data for summary", { input });
                        const data = yield* this.getWeather(input);

                        const tempUnit = data.units === "celsius" ? "°C" : "°F";
                        const mainCondition = data.conditions[0] ?? {
                            condition: "unknown",
                            description: "No weather data available",
                            icon: "unknown"
                        };

                        let summary = `Current weather in ${data.location.name}: ${mainCondition.description}, ${data.temperature}${tempUnit}`;

                        // Add forecast if available
                        const forecast = data.forecast;
                        if (forecast && forecast.length > 0) {
                            const tomorrow = forecast[0];
                            if (tomorrow) {
                                summary += ` Tomorrow's forecast: High ${tomorrow.highTemperature}${tempUnit}, Low ${tomorrow.lowTemperature}${tempUnit}.`;
                            }
                        }

                        yield* Effect.logInfo("Weather summary generated", { 
                            location: data.location.name,
                            summary
                        });

                        return summary;
                    })
            };
        }),
        dependencies: []
    }
) {}
