/**
 * @file Weather Service implementation
 * @module ea/pipelines/weather/service
 */

import { LoggingServiceApi } from "@/services/core/logging/api.js";
import { FileLogger } from "@/services/core/logging/file-logger.js";
import TextService from "@/services/pipeline/producers/text/service.js";
import type { JsonObject } from "@/types.js";
import { Effect, Option } from "effect";
import { WeatherServiceApi } from "./api.js";
import { WeatherPipelineError } from "./errors.js";
import type { WeatherData, WeatherPipelineInput } from "./types.js";
import { defaultConfig } from "./types.js";

const getWeather = (input: WeatherPipelineInput, logger: LoggingServiceApi): Effect.Effect<WeatherData, WeatherPipelineError, never> =>
  Effect.gen(function* () {
    const textService = yield* TextService;

    yield* logger.info("Getting weather data", {
      location: input.location.toString()
    } as JsonObject).pipe(
      Effect.mapError(error => new WeatherPipelineError({ message: "Logger error", cause: error }))
    );

    // Get weather data from text service
    const response = yield* textService.generate({
      prompt: `Get the weather for ${input.location}. Return a JSON object with the current weather data.`,
      modelId: "claude-3-5-sonnet",
      system: Option.some("You are a weather service API. Return valid JSON with: location (name, country), temperature, temperatureFeelsLike, humidity, windSpeed, windDirection, conditions, timestamp."),
      parameters: {
        temperature: 0.1
      }
    }).pipe(
      Effect.map(response => {
        const data = response.data
        return {
          location: {
            name: data.location.name,
            country: data.location.country
          },
          temperature: data.temperature,
          temperatureFeelsLike: data.temperatureFeelsLike,
          humidity: data.humidity,
          windSpeed: data.windSpeed,
          windDirection: data.windDirection,
          conditions: data.conditions,
          timestamp: data.timestamp,
          units: input.units || defaultConfig.defaultUnits
        };
      }),
      Effect.mapError(error => new WeatherPipelineError({ message: "Failed to get weather data", cause: error }))
    );

    yield* logger.info("Weather data retrieved", {
      location: response.location as unknown as JsonObject
    } as JsonObject).pipe(
      Effect.mapError(error => new WeatherPipelineError({ message: "Logger error", cause: error }))
    );

    return response;
  }).pipe(
    Effect.provide(TextService.Default)
  );

const getWeatherSummary = (input: WeatherPipelineInput, logger: LoggingServiceApi): Effect.Effect<string, WeatherPipelineError, never> =>
  Effect.gen(function* () {
    const textService = yield* TextService;
    const data = yield* getWeather(input, logger);

    yield* logger.info("Generating weather summary", {
      location: data.location as unknown as JsonObject
    } as JsonObject).pipe(
      Effect.mapError(error => new WeatherPipelineError({ message: "Logger error", cause: error }))
    );

    const summary = yield* textService.generate({
      prompt: `Summarize the current weather for ${data.location.name}, ${data.location.country}. Temperature: ${data.temperature}°C, Feels like: ${data.temperatureFeelsLike}°C, Humidity: ${data.humidity}%, Wind: ${data.windSpeed} m/s`,
      modelId: defaultConfig.defaultModelId,
      system: Option.some("You are a weather service. Provide a natural, concise summary of the weather conditions."),
      parameters: {
        temperature: defaultConfig.defaultTemperature
      }
    }).pipe(
      Effect.map((response): string => response.data.output),
      Effect.mapError((error): WeatherPipelineError => new WeatherPipelineError({ message: "Failed to generate weather summary", cause: error }))
    );

    yield* logger.info("Weather summary generated", {
      location: data.location as unknown as JsonObject,
      summary
    } as JsonObject).pipe(
      Effect.mapError(error => new WeatherPipelineError({ message: "Logger error", cause: error }))
    );

    return summary;
  }).pipe(
    Effect.provide(TextService.Default)
  );

/**
 * Weather service implementation
 */
export class WeatherService extends Effect.Service<WeatherServiceApi>()(
  "WeatherService",
  {
    effect: Effect.gen(function* () {
      const textService = yield* TextService;
      const logger = yield* FileLogger;

      yield* logger.info("Weather service initialized", {
        config: defaultConfig
      } as JsonObject);

      return {
        getWeather: (input: WeatherPipelineInput) =>
          Effect.gen(function* () {
            yield* logger.info("Getting weather data", { input } as JsonObject);
            const result = yield* getWeather(input, logger);
            yield* logger.info("Weather data retrieved", { location: input.location } as JsonObject);
            return result;
          }),
        getWeatherSummary: (input: WeatherPipelineInput) =>
          Effect.gen(function* () {
            yield* logger.info("Getting weather summary", { input } as JsonObject);
            const result = yield* getWeatherSummary(input, logger);
            yield* logger.info("Weather summary generated", { location: input.location } as JsonObject);
            return result;
          })
      };
    }),
    dependencies: [TextService.Default, FileLogger.Default]
  }
) { } 