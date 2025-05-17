/**
 * @file Weather Service API definitions
 * @module ea/pipelines/weather/api
 */

import { Effect } from "effect";
import { WeatherPipelineError } from "./errors.js";

// -------------------------------------------------------------------------------------
// SECTION: Configuration
// -------------------------------------------------------------------------------------

/**
 * Configuration for Weather Pipelines.
 */
export interface WeatherPipelineConfig {
    readonly apiKey: string;
    readonly baseUrl: string;
    readonly defaultUnits: "celsius" | "fahrenheit";
    readonly timeoutMs: number;
}

/**
 * Default configuration for WeatherPipeline
 */
export const defaultConfig: WeatherPipelineConfig = {
    defaultUnits: "celsius",
    apiKey: "demo-key",
    baseUrl: "https://api.example.com/weather",
    timeoutMs: 5000
};

// -------------------------------------------------------------------------------------
// SECTION: Input/Output Types
// -------------------------------------------------------------------------------------

/**
 * Input parameters for Weather Pipelines.
 */
export interface WeatherPipelineInput {
    readonly location: string;
    readonly date?: string;
    readonly includeForecast?: boolean;
    readonly units?: "celsius" | "fahrenheit";
}

/**
 * Weather condition data structure.
 */
export interface WeatherCondition {
    readonly condition: string;
    readonly description: string;
    readonly icon?: string;
}

/**
 * Core weather data structure.
 */
export interface WeatherData {
    readonly location: {
        readonly name: string;
        readonly country: string;
        readonly coordinates?: {
            readonly latitude: number;
            readonly longitude: number;
        };
    };
    readonly temperature: number;
    readonly temperatureFeelsLike: number;
    readonly humidity: number;
    readonly windSpeed: number;
    readonly windDirection: number;
    readonly conditions: ReadonlyArray<WeatherCondition>;
    readonly forecast?: ReadonlyArray<{
        readonly date: string;
        readonly highTemperature: number;
        readonly lowTemperature: number;
        readonly conditions: WeatherCondition;
    }>;
    readonly timestamp: string;
    readonly units: "celsius" | "fahrenheit";
}

// -------------------------------------------------------------------------------------
// SECTION: Service APIs
// -------------------------------------------------------------------------------------

/**
 * The WeatherService API interface.
 */
export interface WeatherServiceApi {
    readonly getWeather: (
        input: WeatherPipelineInput
    ) => Effect.Effect<WeatherData, WeatherPipelineError>;
    readonly getWeatherSummary: (
        input: WeatherPipelineInput
    ) => Effect.Effect<string, WeatherPipelineError>;
}

/**
 * WeatherService defines the service for accessing weather data
 */
export class WeatherService extends Effect.Service<WeatherServiceApi>()
    ("WeatherService", {
        effect: Effect.gen(function* () {
            return {
                getWeather: () => Effect.fail(new WeatherPipelineError({ message: "Not implemented" })),
                getWeatherSummary: () => Effect.fail(new WeatherPipelineError({ message: "Not implemented" }))
            };
        }),
        dependencies: []
    }) {}

// For accessing WeatherService as a dependency
export const WeatherServiceLive = WeatherService.Default;