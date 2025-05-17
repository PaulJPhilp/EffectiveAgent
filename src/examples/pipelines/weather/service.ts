/**
 * @file Weather Service implementation.
 * @module ea/pipelines/weather/service
 */

import { Effect } from "effect";
import {
    WeatherData,
    WeatherPipelineConfig,
    WeatherPipelineInput,
    WeatherServiceApi
} from "./api.js";
import { WeatherPipelineError } from "./errors.js";

const defaultConfig: WeatherPipelineConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    baseUrl: "https://api.example.com/weather",
    defaultUnits: "celsius",
    timeoutMs: 5000
};

function convertTemperature(temp: number, toUnit: "celsius" | "fahrenheit"): number {
    if (toUnit === "celsius") {
        return Math.round((temp - 32) * 5 / 9);
    }
    return Math.round((temp * 9 / 5) + 32);
}
/**
 * Concrete implementation of WeatherService following the Effect.Service pattern
 */
export class WeatherService extends Effect.Service<WeatherServiceApi>()(
    "WeatherService", {
        effect: Effect.gen(function* () {
            // Helper functions
            const generateWeatherData = (input: WeatherPipelineInput): WeatherData => {
                const units = input.units || defaultConfig.defaultUnits;
                const temperatureBase = units === "celsius" ? 20 : 68;
                const temperature = Math.round((temperatureBase + (Math.random() * 5 - 2.5)) * 10) / 10;
                const temperatureFeelsLike = Math.round((temperature - 1 + (Math.random() * 2 - 1)) * 10) / 10;
                const humidity = Math.round(55 + (Math.random() * 20 - 10));
                const windSpeed = Math.round((units === "celsius" ? 3 : 6.71) * (1 + (Math.random() * 0.4 - 0.2)) * 10) / 10;
                const windDirection = Math.round(Math.random() * 360);

                const possibleConditions = [
                    { condition: "Clear", description: "clear sky", icon: "01d" },
                    { condition: "Clouds", description: "scattered clouds", icon: "03d" },
                    { condition: "Rain", description: "light rain", icon: "10d" },
                    { condition: "Snow", description: "light snow", icon: "13d" },
                ];
                const mainCondition = possibleConditions[Math.floor(Math.random() * possibleConditions.length)];

                if (!mainCondition) {
                    throw new WeatherPipelineError({
                        message: "Failed to generate weather condition",
                        cause: new Error("Invalid condition index")
                    });
                }

                return {
                    location: {
                        name: input.location,
                        country: "Demo",
                        coordinates: { latitude: 0, longitude: 0 },
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
            };

            // Return implementation
            return {
                getWeather: (input: WeatherPipelineInput): Effect.Effect<WeatherData, WeatherPipelineError> =>
                    Effect.try({
                        try: () => generateWeatherData(input),
                        catch: (error) => new WeatherPipelineError({
                            message: `Failed to fetch weather data for ${input.location}`,
                            cause: error instanceof Error ? error : new Error(String(error))
                        })
                    }),

                getWeatherSummary: (input: WeatherPipelineInput): Effect.Effect<string, WeatherPipelineError> =>
                    Effect.gen(function* () {
                        const data = yield* WeatherService.prototype.getWeather(input);
                        const mainCondition = data.conditions[0];
                        if (!mainCondition) {
                            return yield* Effect.fail(new WeatherPipelineError({
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

                        return summary;
                    })
            };
        }),
        dependencies: []
    }
) { }