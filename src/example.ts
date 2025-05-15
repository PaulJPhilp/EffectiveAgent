import { Effect, Layer } from "effect"
import {
    WeatherConfigService,
    WeatherPipelineError,
    WeatherService
} from "./services/weather/index.js"

// Define the program using Effect.gen
const program = Effect.gen(function* () {
    // Yield the WeatherService Tag to get the service instance from the context
    const weatherService = yield* WeatherService

    console.log("Fetching weather forecast for default city...")
    // Call the getForecast method on the service instance
    const forecast = yield* weatherService.getForecast()

    // Log the forecast details
    console.log(
        `Weather in ${forecast.name}: ${forecast.weather[0]?.description} with temp ${forecast.main.temp}`,
    )

    // Example: Fetching for a specific city
    const city = "Paris"
    console.log(`Fetching weather forecast for ${city}...`)
    const parisForecast = yield* weatherService.getForecast(city)
    console.log(
        `Weather in ${parisForecast.name}: ${parisForecast.weather[0]?.description} with temp ${parisForecast.main.temp}`,
    )
}).pipe(
    Effect.catchTags({
        WeatherPipelineError: (caughtError: WeatherPipelineError) => {
            console.error(`Weather Service Error: ${caughtError.message}`, caughtError.cause ? { cause: caughtError.cause } : {})
            return Effect.void
        }
    }),
    Effect.catchAll((remainingError: unknown) => {
        console.error("An unexpected error occurred:", remainingError)
        return Effect.void
    })
)

// Create a layer that provides WeatherConfigService to WeatherService
// This assumes WeatherService (class) is Layer<WeatherService, E1, WeatherConfigService>
// and WeatherConfigService (class) is Layer<WeatherConfigService, E2, never>
const finalLayer = Layer.provide(WeatherService, WeatherConfigService)

// Provide the fully resolved finalLayer to the program
const runnable = Effect.provide(program, finalLayer)

// Execute the program
Effect.runPromise(runnable as Effect<void, unknown, never>)
    .then(() => console.log("Weather forecast example finished."))
    .catch(error => {
        // This catch is for errors during Effect.runPromise itself,
        // program errors should be handled within the 'program' Effect if possible.
        console.error("Critical error executing Effect program:", error)
    }) 