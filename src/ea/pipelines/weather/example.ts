/**
 * @file Example usage of the Weather Service
 * @module ea/pipelines/weather/example
 */

import { Effect } from "effect";
import {
    WeatherPipelineConfig,
    WeatherService,
    WeatherServiceLive
} from "./index.js";

/**
 * Example showing how to use the Weather Service
 * Using pipe pattern instead of generator syntax
 */
export const weatherExample = Effect.Do.pipe(
    Effect.bind("weatherService", () => WeatherService),
    Effect.bind("weatherData", ({ weatherService }) =>
        weatherService.getWeather({
            location: "London,UK",
            includeForecast: true
        })
    ),
    Effect.tap(({ weatherData }) =>
        Effect.sync(() => {
            console.log("Weather data retrieved:", JSON.stringify(weatherData, null, 2));
        })
    ),
    Effect.bind("summary", ({ weatherService }) =>
        weatherService.getWeatherSummary({
            location: "London,UK"
        })
    ),
    Effect.tap(({ summary }) =>
        Effect.sync(() => {
            console.log("Weather summary:", summary);
        })
    ),
    Effect.map(({ weatherData, summary }) => ({ weatherData, summary }))
);

/**
 * Run the example with live API
 */
export const runLiveExample = () => {
    const weatherConfig: WeatherPipelineConfig = {
        apiKey: "your-api-key-here",
        baseUrl: "https://api.openweathermap.org/data/2.5",
        defaultUnits: "celsius",
        timeoutMs: 5000
    };

    // Create the service layer with the config
    const weatherServiceLayer = WeatherServiceLive(weatherConfig);

    // Run the program with the live implementation
    return Effect.runPromise(Effect.provide(weatherExample, weatherServiceLayer));
};

/**
 * Execute the example when this file is run directly
 */
if (typeof require !== 'undefined' && require.main === module) {
    runLiveExample()
        .then(result => {
            console.log("Example completed successfully:", result);
        })
        .catch(error => {
            console.error("Example failed:", error);
        });
}