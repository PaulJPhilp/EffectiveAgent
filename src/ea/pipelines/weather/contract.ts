/**
 * @file Contract definition for Weather Pipelines
 * @module ea/pipelines/weather/contract
 */

import { Context, Data, Effect } from "effect";

/**
 * Configuration for Weather Pipelines
 */
export interface WeatherPipelineConfig {
    /** API key for the weather service */
    apiKey: string;
    /** Base URL for the weather service API */
    baseUrl: string;
    /** Default units for temperature measurements */
    defaultUnits: "celsius" | "fahrenheit";
    /** Timeout in milliseconds for API requests */
    timeoutMs: number;
}

/**
 * Configuration context for Weather Pipelines
 */
export class WeatherPipelineConfigContext extends Context.Tag("WeatherPipelineConfig")<
    WeatherPipelineConfigContext,
    WeatherPipelineConfig
>() { }

/**
 * Input parameters for Weather Pipelines
 */
export interface WeatherPipelineInput {
    /** Location to retrieve weather data for (city name, coordinates, etc.) */
    location: string;
    /** Optional date for forecast (defaults to current date) */
    date?: string;
    /** Whether to include extended forecast information */
    includeForecast?: boolean;
    /** Units for temperature (celsius, fahrenheit) */
    units?: "celsius" | "fahrenheit";
}

/**
 * Weather condition data structure
 */
export interface WeatherCondition {
    /** Main weather condition (clear, cloudy, rain, etc.) */
    condition: string;
    /** Detailed description of weather condition */
    description: string;
    /** Weather icon code */
    icon?: string;
}

/**
 * Core weather data structure
 */
export interface WeatherData {
    /** Location for which weather data is provided */
    location: {
        name: string;
        country: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    /** Current temperature */
    temperature: number;
    /** Human-friendly temperature description */
    temperatureFeelsLike: number;
    /** Humidity percentage */
    humidity: number;
    /** Wind speed */
    windSpeed: number;
    /** Wind direction in degrees */
    windDirection: number;
    /** Current weather conditions */
    conditions: WeatherCondition[];
    /** Forecast data if requested */
    forecast?: Array<{
        /** Date of forecast */
        date: string;
        /** High temperature */
        highTemperature: number;
        /** Low temperature */
        lowTemperature: number;
        /** Forecast conditions */
        conditions: WeatherCondition;
    }>;
    /** Timestamp when data was retrieved */
    timestamp: string;
    /** Units used for measurements */
    units: "celsius" | "fahrenheit";
}

/**
 * Error specific to Weather Pipelines
 */
export class WeatherPipelineError extends Data.TaggedError("WeatherPipelineError")<{
    readonly message: string;
    readonly cause?: unknown;
}> { }

/**
 * The WeatherService API interface
 * Defines methods for retrieving weather data and summaries
 */
export interface WeatherServiceApi {
    /**
     * Gets detailed weather data for a specific location
     * 
     * @param input - Weather request parameters
     * @returns Effect that resolves to weather data or fails with pipeline error
     */
    getWeather: (
        input: WeatherPipelineInput
    ) => Effect.Effect<WeatherData, WeatherPipelineError, never>;

    /**
     * Gets a natural language summary of weather conditions for a location
     * 
     * @param input - Weather request parameters 
     * @returns Effect that resolves to a formatted weather summary string
     */
    getWeatherSummary: (
        input: WeatherPipelineInput
    ) => Effect.Effect<string, WeatherPipelineError, never>;
}

/**
 * Weather Service class for dependency injection
 */
export class WeatherService extends Context.Tag("WeatherService")<
    WeatherService,
    WeatherServiceApi
>() { }
