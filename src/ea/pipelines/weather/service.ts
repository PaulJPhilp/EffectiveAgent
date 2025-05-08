/**
 * @file Service implementation for Weather Service
 * @module ea/pipelines/weather/service
 */

import { Effect, Layer } from "effect";
import {
    WeatherCondition,
    WeatherData,
    WeatherPipelineConfig,
    WeatherPipelineError,
    WeatherPipelineInput,
    WeatherService,
    WeatherServiceApi
} from "./contract.js";

// Helper function to convert temperature units
const convertTemperature = (temp: number, toUnit: "celsius" | "fahrenheit"): number => {
    if (toUnit === "celsius") {
        return Math.round((temp - 32) * 5 / 9);
    } else {
        return Math.round((temp * 9 / 5) + 32);
    }
};

/**
 * Implementation of the WeatherService
 */
export const makeWeatherService = (config: WeatherPipelineConfig): WeatherServiceApi => {
    /**
     * Implementation of getWeather method
     */
    const getWeather = (input: WeatherPipelineInput): Effect.Effect<WeatherData, WeatherPipelineError, never> =>
        Effect.try({
            try: () => {
                const units = input.units || config.defaultUnits;
                const baseUrl = config.baseUrl;
                const apiKey = config.apiKey;

                // Configure the API request
                const params = {
                    q: input.location,
                    appid: apiKey,
                    units: units === "celsius" ? "metric" : "imperial",
                    ...(input.includeForecast ? { forecast: "daily" } : {})
                };

                // This would normally be an async call, but for now we'll mock it
                // In a real implementation we'd use Effect.tryPromise with axios

                // Mock response data
                const mockData = {
                    name: input.location,
                    sys: { country: "US" },
                    coord: { lat: 40.7128, lon: -74.0060 },
                    main: {
                        temp: 22.5,
                        feels_like: 23.0,
                        humidity: 65
                    },
                    wind: {
                        speed: 5.5,
                        deg: 180
                    },
                    weather: [
                        {
                            main: "Clear",
                            description: "clear sky",
                            icon: "01d"
                        }
                    ],
                    forecast: input.includeForecast ? {
                        list: [
                            {
                                dt: Date.now() / 1000 + 86400,
                                temp: { max: 24.5, min: 18.2 },
                                weather: [{ main: "Clear", description: "clear sky", icon: "01d" }]
                            }
                        ]
                    } : undefined
                };

                // Transform API response to our data model
                const weatherData: WeatherData = {
                    location: {
                        name: mockData.name,
                        country: mockData.sys.country,
                        coordinates: {
                            latitude: mockData.coord.lat,
                            longitude: mockData.coord.lon
                        }
                    },
                    temperature: mockData.main.temp,
                    temperatureFeelsLike: mockData.main.feels_like,
                    humidity: mockData.main.humidity,
                    windSpeed: mockData.wind.speed,
                    windDirection: mockData.wind.deg,
                    conditions: mockData.weather.map((w: any): WeatherCondition => ({
                        condition: w.main,
                        description: w.description,
                        icon: w.icon
                    })),
                    timestamp: new Date().toISOString(),
                    units
                };

                // Add forecast data if requested and available
                if (input.includeForecast && mockData.forecast) {
                    weatherData.forecast = mockData.forecast.list.map((item: any) => ({
                        date: new Date(item.dt * 1000).toISOString().split('T')[0],
                        highTemperature: item.temp.max,
                        lowTemperature: item.temp.min,
                        conditions: {
                            condition: item.weather[0].main,
                            description: item.weather[0].description,
                            icon: item.weather[0].icon
                        }
                    }));
                }

                return weatherData;
            },
            catch: (error) => new WeatherPipelineError({
                message: "Error processing weather data",
                cause: error
            })
        });

    /**
     * Implementation of getWeatherSummary method
     */
    const getWeatherSummary = (input: WeatherPipelineInput): Effect.Effect<string, WeatherPipelineError, never> =>
        Effect.flatMap(
            getWeather(input),
            (weatherData) => Effect.try({
                try: () => {
                    // Generate a natural language summary
                    const conditions = weatherData.conditions[0]?.description || "unknown conditions";
                    const tempUnit = weatherData.units === "celsius" ? "°C" : "°F";

                    let summary = `The current weather in ${weatherData.location.name}, ${weatherData.location.country} is ${conditions} with a temperature of ${weatherData.temperature}${tempUnit} (feels like ${weatherData.temperatureFeelsLike}${tempUnit}). `;
                    summary += `Wind is blowing at ${weatherData.windSpeed} ${weatherData.units === "celsius" ? "m/s" : "mph"} with humidity at ${weatherData.humidity}%.`;

                    // Add forecast summary if available
                    if (weatherData.forecast && weatherData.forecast.length > 0) {
                        const tomorrow = weatherData.forecast[0];
                        summary += ` Tomorrow will be ${tomorrow.conditions.description} with highs of ${tomorrow.highTemperature}${tempUnit} and lows of ${tomorrow.lowTemperature}${tempUnit}.`;
                    }

                    return summary;
                },
                catch: (error) => new WeatherPipelineError({
                    message: "Error generating weather summary",
                    cause: error
                })
            })
        );

    // Return service implementation
    return {
        getWeather,
        getWeatherSummary
    };
};

/**
 * Mock implementation of the Weather Service
 */
export const makeMockWeatherService = (): WeatherServiceApi => ({
    getWeather: (input: WeatherPipelineInput): Effect.Effect<WeatherData, WeatherPipelineError, never> =>
        Effect.succeed({
            location: {
                name: input.location || "Test City",
                country: "Test Country",
                coordinates: { latitude: 40.7128, longitude: -74.0060 }
            },
            temperature: 22.5,
            temperatureFeelsLike: 23.0,
            humidity: 65,
            windSpeed: 5.5,
            windDirection: 180,
            conditions: [{
                condition: "Clear",
                description: "clear sky",
                icon: "01d"
            }],
            timestamp: new Date().toISOString(),
            units: input.units || "celsius",
            forecast: input.includeForecast ? [{
                date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                highTemperature: 24.5,
                lowTemperature: 18.2,
                conditions: {
                    condition: "Clear",
                    description: "clear sky",
                    icon: "01d"
                }
            }] : undefined
        }),

    getWeatherSummary: (input: WeatherPipelineInput): Effect.Effect<string, WeatherPipelineError, never> =>
        Effect.succeed(`The current weather in ${input.location || "Test City"}, Test Country is clear sky with a temperature of 22.5°C (feels like 23.0°C). Wind is blowing at 5.5 m/s with humidity at 65%.`)
});

/**
 * Live Layer for the Weather Service
 */
export const WeatherServiceLive = (config: WeatherPipelineConfig): Layer.Layer<WeatherService> =>
    Layer.succeed(WeatherService, makeWeatherService(config));

/**
 * Test Layer for the Weather Service with mock implementation
 */
export const WeatherServiceTest = Layer.succeed(
    WeatherService,
    makeMockWeatherService()
);