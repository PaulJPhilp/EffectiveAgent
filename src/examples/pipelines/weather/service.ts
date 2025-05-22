/**
 * @file Weather Service implementation.
 * @module ea/pipelines/weather/service
 */

import type { LoggingServiceApi } from "@/services/core/logging/api.js";
import { PlatformLogger } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer, Logger } from "effect";
import * as NodePath from "node:path";
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

function makeLogger(name: string) {
    const fmtLogger = Logger.logfmtLogger
    const fileLogger = fmtLogger.pipe(
        PlatformLogger.toFile(NodePath.join(process.cwd(), "test-logs", `${name}.log`))
    )
    return Logger.replaceScoped(Logger.defaultLogger, fileLogger).pipe(Layer.provide(NodeFileSystem.layer))
}

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
        // Define the service object for self-reference
        const self = {
            getWeather: (input: WeatherPipelineInput): Effect.Effect<WeatherData, WeatherPipelineError> =>
                Effect.gen(function* () {
                    const logger = {
                        info: async (..._args: unknown[]) => { },
                        debug: async (..._args: unknown[]) => { },
                        error: async (..._args: unknown[]) => { }
                    };
                    yield* Effect.tryPromise(() => logger.info("getWeather called", { input }));
                    const units = input.units || defaultConfig.defaultUnits;
                    yield* Effect.tryPromise(() => logger.debug("Units selected", { units }));
                    const temperatureBase = units === "celsius" ? 20 : 68;
                    const temperature = Math.round((temperatureBase + (Math.random() * 5 - 2.5)) * 10) / 10;
                    const temperatureFeelsLike = Math.round((temperature - 1 + (Math.random() * 2 - 1)) * 10) / 10;
                    const humidity = Math.round(55 + (Math.random() * 20 - 10));
                    const windSpeed = Math.round((units === "celsius" ? 3 : 6.71) * (1 + (Math.random() * 0.4 - 0.2)) * 10) / 10;
                    const windDirection = Math.round(Math.random() * 360);

                    yield* Effect.tryPromise(() => logger.debug("Generated weather values", {
                        temperature,
                        temperatureFeelsLike,
                        humidity,
                        windSpeed,
                        windDirection
                    }));

                    const possibleConditions = [
                        { condition: "Clear", description: "clear sky", icon: "01d" },
                        { condition: "Clouds", description: "scattered clouds", icon: "03d" },
                        { condition: "Rain", description: "light rain", icon: "10d" },
                        { condition: "Snow", description: "light snow", icon: "13d" },
                    ];
                    const mainCondition = possibleConditions[Math.floor(Math.random() * possibleConditions.length)];

                    yield* Effect.tryPromise(() => logger.debug("Selected main condition", { mainCondition }));

                    if (!mainCondition) {
                        yield* Effect.tryPromise(() => logger.error("No main condition generated", { input }));
                        return yield* Effect.fail<WeatherPipelineError>(new WeatherPipelineError({
                            message: "Failed to generate weather condition",
                            cause: new Error("Invalid condition index")
                        }));
                    }

                    const result: WeatherData = {
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
                    yield* Effect.tryPromise(() => logger.info("Returning weather data", { result }));
                    return result;
                }).pipe(
                    Effect.catchAll((error) =>
                        Effect.fail<WeatherPipelineError>(
                            error instanceof WeatherPipelineError
                                ? error
                                : new WeatherPipelineError({
                                    message: `Failed to fetch weather data for ${input.location}`,
                                    cause: error instanceof Error ? error : new Error(String(error))
                                })
                        )
                    )
                ),
            getWeatherSummary: (input: WeatherPipelineInput): Effect.Effect<string, WeatherPipelineError> =>
                Effect.gen(function* () {
                    const logger = {
                        info: async (..._args: unknown[]) => { },
                        debug: async (..._args: unknown[]) => { },
                        error: async (..._args: unknown[]) => { }
                    };
                    yield* Effect.tryPromise(() => logger.info("getWeatherSummary called", { input }));
                    const data: WeatherData = yield* self.getWeather(input);
                    yield* Effect.tryPromise(() => logger.debug("Weather data for summary", { data }));
                    const mainCondition = data.conditions[0];
                    if (!mainCondition) {
                        yield* Effect.tryPromise(() => logger.error("No main condition in summary", { data }));
                        return yield* Effect.fail<WeatherPipelineError>(new WeatherPipelineError({
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

                    yield* Effect.tryPromise(() => logger.info("Returning weather summary", { summary }));
                    return summary;
                }).pipe(
                    Effect.catchAll((error) =>
                        Effect.fail<WeatherPipelineError>(
                            error instanceof WeatherPipelineError
                                ? error
                                : new WeatherPipelineError({
                                    message: `Failed to get weather summary for ${input.location}`,
                                    cause: error instanceof Error ? error : new Error(String(error))
                                })
                        )
                    )
                ),
        };
        return self;
    }),
    dependencies: []
}
) { }

export function makeWeatherService(logger: LoggingServiceApi) {
    const service = {
        getWeather: (input: WeatherPipelineInput): Effect.Effect<WeatherData, WeatherPipelineError> =>
            Effect.gen(function* () {
                // Use a local logger or remove if not available
                // const logger = (yield* LoggingService).withContext({ service: "WeatherService" });
                // For now, just use a no-op logger
                const logger = {
                    info: async (..._args: unknown[]) => { },
                    debug: async (..._args: unknown[]) => { },
                    error: async (..._args: unknown[]) => { }
                };
                yield* Effect.tryPromise(() => logger.info("getWeather called", { input: JSON.stringify(input) }));
                const units = input.units || defaultConfig.defaultUnits;
                yield* Effect.tryPromise(() => logger.debug("Units selected", { units }));
                const temperatureBase = units === "celsius" ? 20 : 68;
                const temperature = Math.round((temperatureBase + (Math.random() * 5 - 2.5)) * 10) / 10;
                const temperatureFeelsLike = Math.round((temperature - 1 + (Math.random() * 2 - 1)) * 10) / 10;
                const humidity = Math.round(55 + (Math.random() * 20 - 10));
                const windSpeed = Math.round((units === "celsius" ? 3 : 6.71) * (1 + (Math.random() * 0.4 - 0.2)) * 10) / 10;
                const windDirection = Math.round(Math.random() * 360);

                yield* Effect.tryPromise(() => logger.debug("Generated weather values", {
                    temperature,
                    temperatureFeelsLike,
                    humidity,
                    windSpeed,
                    windDirection
                }));

                const possibleConditions = [
                    { condition: "Clear", description: "clear sky", icon: "01d" },
                    { condition: "Clouds", description: "scattered clouds", icon: "03d" },
                    { condition: "Rain", description: "light rain", icon: "10d" },
                    { condition: "Snow", description: "light snow", icon: "13d" },
                ];
                const mainCondition = possibleConditions[Math.floor(Math.random() * possibleConditions.length)];

                yield* Effect.tryPromise(() => logger.debug("Selected main condition", { mainCondition: JSON.stringify(mainCondition) }));

                if (!mainCondition) {
                    yield* Effect.tryPromise(() => logger.error("No main condition generated", { input: JSON.stringify(input) }));
                    return yield* Effect.fail<WeatherPipelineError>(new WeatherPipelineError({
                        message: "Failed to generate weather condition",
                        cause: new Error("Invalid condition index")
                    }));
                }

                const result: WeatherData = {
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
                yield* Effect.tryPromise(() => logger.info("Returning weather data", { result: JSON.stringify(result) }));
                return result;
            }).pipe(
                Effect.catchAll((error) =>
                    Effect.fail<WeatherPipelineError>(
                        error instanceof WeatherPipelineError
                            ? error
                            : new WeatherPipelineError({
                                message: "Unexpected error in getWeather",
                                cause: error instanceof Error ? error : new Error(String(error)),
                            })
                    )
                )
            ),

        getWeatherSummary: (input: WeatherPipelineInput): Effect.Effect<string, WeatherPipelineError> =>
            Effect.gen(function* () {
                // Use a local logger or remove if not available
                const logger = {
                    info: async (..._args: unknown[]) => { },
                    debug: async (..._args: unknown[]) => { },
                    error: async (..._args: unknown[]) => { }
                };
                yield* Effect.tryPromise(() => logger.info("getWeatherSummary called", { input: JSON.stringify(input) }));
                try {
                    // Call getWeather directly
                    const data: WeatherData = yield* (yield* Effect.succeed({
                        getWeather: (input: WeatherPipelineInput) => Effect.fail<WeatherPipelineError>(new WeatherPipelineError({ message: "Not implemented" }))
                    })).getWeather(input);
                    yield* Effect.tryPromise(() => logger.debug("Weather data for summary", { data: JSON.stringify(data) }));
                    const mainCondition = data.conditions?.[0]; // Use optional chaining
                    if (!mainCondition) {
                        yield* Effect.tryPromise(() => logger.error("No main condition in summary", { data: JSON.stringify(data) }));
                        return yield* Effect.fail<WeatherPipelineError>(new WeatherPipelineError({
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

                    yield* Effect.tryPromise(() => logger.info("Returning weather summary", { summary }));
                    return summary;
                } catch (error) {
                    yield* Effect.tryPromise(() => logger.error("Error in getWeatherSummary", { error: JSON.stringify(error), input: JSON.stringify(input) }));
                    return yield* Effect.fail<WeatherPipelineError>(new WeatherPipelineError({
                        message: `Failed to get weather summary for ${input.location}`,
                        cause: error instanceof Error ? error : new Error(String(error))
                    }));
                }
            }).pipe(
                Effect.catchAll((error) =>
                    Effect.fail<WeatherPipelineError>(
                        error instanceof WeatherPipelineError
                            ? error
                            : new WeatherPipelineError({
                                message: "Unexpected error in getWeatherSummary",
                                cause: error instanceof Error ? error : new Error(String(error)),
                            })
                    )
                )
            ),
    };
    return service;
}