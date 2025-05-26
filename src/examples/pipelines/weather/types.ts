/**
 * @file Weather Service Types
 * @module ea/pipelines/weather/types
 */

/**
 * Weather location information
 */
export interface WeatherLocation {
  readonly name: string;
  readonly country: string;
  readonly coordinates?: {
    readonly latitude: number;
    readonly longitude: number;
  };
}

/**
 * Weather condition information
 */
export type WeatherCondition = {
  condition: string;
  description: string;
  icon: string;
};

/**
 * Units for weather measurements
 */
export type TemperatureUnit = "celsius" | "fahrenheit" | "kelvin";
export type WindSpeedUnit = "mps" | "mph" | "kph";

export type WeatherUnits = {
  type: TemperatureUnit;  // "celsius" | "fahrenheit" | "kelvin"
  windSpeedUnit: WindSpeedUnit;  // "mps" | "mph" | "kph"
};

/**
 * Weather service configuration
 */
export type WeatherPipelineConfig = {
  defaultModelId: any;
  defaultMaxTokens: any;
  defaultTemperature: any;
  apiKey: string;
  baseUrl: string;
  defaultUnits: WeatherUnits;
};


/**
 * Input parameters for weather pipeline
 */
export type WeatherPipelineInput = {
  location: string;
  units?: WeatherUnits;
};

/**
 * Default configuration for WeatherPipeline
 */
export const defaultConfig: WeatherPipelineConfig = {
  apiKey: process.env.WEATHER_API_KEY || "",
  baseUrl: "https://api.openweathermap.org/data/2.5",
  defaultUnits: {
    type: "celsius",
    windSpeedUnit: "mps"
  },
  defaultModelId: "claude-3-5-sonnet",
  defaultMaxTokens: 100,
  defaultTemperature: 0.7
};


/**
 * Core weather data structure
 */
export interface WeatherData {
  readonly location: WeatherLocation;
  readonly temperature: number;
  readonly temperatureFeelsLike: number;
  readonly humidity: number;
  readonly windSpeed: number;
  readonly windDirection: number;
  readonly conditions: ReadonlyArray<WeatherCondition>;
  readonly forecast?: ReadonlyArray<{
    readonly date: string;
    readonly temperature: number;
    readonly humidity: number;
  }>;
  readonly timestamp: string;
  readonly units: WeatherUnits;
}
