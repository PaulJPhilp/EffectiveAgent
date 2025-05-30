/**
 * @file Weather Service API definitions
 * @module ea/pipelines/weather/api
 */

import { Effect } from "effect";
import { WeatherPipelineError } from "./errors.js";
import type { WeatherData, WeatherPipelineInput } from "./types.js";

/**
 * The WeatherService API interface.
 */
export interface WeatherServiceApi {
  readonly getWeather: (
    input: WeatherPipelineInput
  ) => Effect.Effect<WeatherData, WeatherPipelineError, never>;
  
  readonly getWeatherSummary: (
    input: WeatherPipelineInput
  ) => Effect.Effect<string, WeatherPipelineError, never>;
}