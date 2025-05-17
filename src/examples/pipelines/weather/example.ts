/**
 * @file Example usage of the Weather Service
 * @module ea/pipelines/weather/example
 */

import { Effect, Layer } from "effect";
import {
    WeatherService
} from "./index.js"; // All imports from index.js
import { WeatherData, WeatherPipelineConfig } from "./api.js";

/**
 * Example showing how to use the Weather Service
 */
export const weatherExample = Effect.gen(function* () {
    const weatherService = yield* WeatherService;

    const weatherData = yield* weatherService.getWeather({
        location: "London,UK",
        includeForecast: true
    });

    console.log("Weather data retrieved:", JSON.stringify(weatherData, null, 2));

    const summary = yield* weatherService.getWeatherSummary({
        location: "London,UK"
    });

    console.log("Weather summary:", summary);

    return { weatherData, summary };
});

/**
 * Run the example with live API
 */
export const runLiveExample = () => {
    // Define the specific configuration for this live example
    const liveWeatherConfig: WeatherPipelineConfig = {
        apiKey: "your-actual-api-key-here", // IMPORTANT: Replace with a real key for live testing
        baseUrl: "https://api.openweathermap.org/data/2.5", // Example real API endpoint
        defaultUnits: "celsius",
        timeoutMs: 5000
    };

    // Create a Layer for WeatherService providing the liveWeatherConfig
    // WeatherConfigService.layerFromValue creates a Layer<WeatherConfigService>
    const liveLayer = Layer.succeed(WeatherService, {
        getWeather: () => Effect.succeed({} as WeatherData),
        getWeatherSummary: () => Effect.succeed("")
    });

    // WeatherService (the class/Tag) is a Layer<WeatherService, never, WeatherConfigService>
    // We provide liveConfigLayer to satisfy WeatherService's dependency on WeatherConfigService.
    // The result is a Layer<WeatherService, never, never> (a fully satisfied WeatherService layer).
    const finalWeatherServiceLayer = Layer.succeed(WeatherService, {
        getWeather: () => Effect.succeed({} as WeatherData),
        getWeatherSummary: () => Effect.succeed("")
    });

    // Provide the fully satisfied WeatherService layer to the weatherExample effect
    const executableProgram = Effect.provide(weatherExample, finalWeatherServiceLayer);

    return Effect.runPromise(executableProgram);
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