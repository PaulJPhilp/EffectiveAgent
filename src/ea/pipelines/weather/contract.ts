/**
 * @file Contract definition for the WeatherPipeline
 * @module ea/pipelines/weather/contract
 */

import { Effect } from "effect";
import { AnyPipelineError } from "../common/errors.js";

/**
 * Input parameters for the WeatherPipeline
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
 * Error specific to the WeatherPipeline
 */
export class WeatherPipelineError extends AnyPipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "WeatherPipeline",
            cause: params.cause,
        });
    }
}

/**
 * API contract for the WeatherPipeline service
 */
export interface WeatherPipelineApi {
    /**
     * Retrieves current weather data for a specific location
     * 
     * @param input - Weather request parameters
     * @returns Effect that resolves to weather data or fails with pipeline error
     */
    getWeather: (
        input: WeatherPipelineInput
    ) => Effect.Effect<WeatherData, WeatherPipelineError>;

    /**
     * Retrieves a natural language summary of weather conditions
     * 
     * @param input - Weather request parameters
     * @returns Effect that resolves to a formatted weather summary string
     */
    getWeatherSummary: (
        input: WeatherPipelineInput
    ) => Effect.Effect<string, WeatherPipelineError>;
}

/**
 * Service tag for the WeatherPipeline
 */
export const WeatherPipeline = Effect.GenericTag<WeatherPipelineApi>("WeatherPipeline"); 