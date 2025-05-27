/**
 * @file Weather Service implementation
 * @module ea/pipelines/weather/service
 */

import TextService from "@/services/pipeline/producers/text/service.js";
import { LoggingService } from "@/services/core/logging/service.js";
import { Effect, Logger, Option } from "effect";
import type { JsonObject } from "@/types.js";

import { WeatherServiceApi } from "./api.js";
import { WeatherPipelineError } from "./errors.js";
import type { WeatherData, WeatherPipelineInput, WeatherCondition } from "./types.js";
import { defaultConfig } from "./types.js";

/**
 * Weather service implementation
 */
export class WeatherService extends Effect.Service<WeatherServiceApi>()(
  "WeatherService",
  {
    effect: Effect.gen(function* () {
      const textService = yield* TextService;
      yield* Effect.log("Weather service initialized", {
        config: defaultConfig
      } as JsonObject);

      const getWeather = (input: WeatherPipelineInput): Effect.Effect<WeatherData, WeatherPipelineError, never> =>
        Effect.gen(function* () {
          yield* Effect.log("Getting weather data", {
            location: input.location.toString()
          } as JsonObject);

          // Get weather data from text service
          const response = yield* textService.generate({
            prompt: `Get the weather for ${input.location}. Return a JSON object with the current weather data.`,
            modelId: "gpt-4o",
            system: Option.some("You are a weather service API. Return valid JSON with: location (name, country), temperature, temperatureFeelsLike, humidity, windSpeed, windDirection, conditions, timestamp."),
            parameters: {
              temperature: 0.1
            }
          });

          yield* Effect.log("Raw text service response", { 
            output: response.data.output
          } as JsonObject);

          const parsed = JSON.parse(response.data.output) as {
            location: { name: string; country: string };
            temperature: number;
            temperatureFeelsLike: number;
            humidity: number;
            windSpeed: number;
            windDirection: number;
            conditions: { condition: string; description: string; icon: string };
            timestamp: string;
          };

          yield* Effect.log("Parsed weather data", parsed as JsonObject);

          const weatherData: WeatherData = {
            location: {
              name: parsed.location.name,
              country: parsed.location.country
            },
            temperature: parsed.temperature,
            temperatureFeelsLike: parsed.temperatureFeelsLike,
            humidity: parsed.humidity,
            windSpeed: parsed.windSpeed,
            windDirection: parsed.windDirection,
            conditions: [parsed.conditions] as ReadonlyArray<WeatherCondition>,
            timestamp: parsed.timestamp,
            units: input.units || defaultConfig.defaultUnits
          };

          yield* Effect.log("Weather data transformed", { 
            location: { name: weatherData.location.name, country: weatherData.location.country },
            temperature: weatherData.temperature,
            humidity: weatherData.humidity,
            windSpeed: weatherData.windSpeed,
            conditions: weatherData.conditions.map((c: WeatherCondition) => ({ 
              condition: c.condition,
              description: c.description,
              icon: c.icon
            }))
          } as JsonObject);

          return weatherData;
        }).pipe(
          Effect.mapError((error: unknown) => new WeatherPipelineError({ 
            message: "Failed to get weather data", 
            cause: error 
          }))
        );

      const getWeatherSummary = (input: WeatherPipelineInput): Effect.Effect<string, WeatherPipelineError, never> =>
        Effect.gen(function* () {
          const data = yield* getWeather(input);
          yield* Effect.log("Generating weather summary", {
            location: data.location as unknown as JsonObject
          } as JsonObject);

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

          yield* Effect.log("Weather summary generated", {
            location: data.location as unknown as JsonObject,
            summary
          } as JsonObject);

          return summary;
        }).pipe(
          Effect.mapError((error): WeatherPipelineError => 
            error instanceof WeatherPipelineError 
              ? error 
              : new WeatherPipelineError({ message: "Unexpected error in weather summary", cause: error })
          )
        );

      return {
        getWeather,
        getWeatherSummary
      };
    }),
    dependencies: [TextService.Default]
  }
) { } 