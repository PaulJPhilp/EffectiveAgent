import { Data, Effect, Layer } from "effect"
type OpenWeatherRawResponse = any

// --- Configuration Service ---
export interface WeatherPipelineConfig {
    readonly apiKey: string
    readonly city: string
    readonly units: "metric" | "imperial"
    readonly lang: "en" | "es" | "fr" // Add more languages as needed
}

export class WeatherConfigService extends Effect.Service<WeatherPipelineConfig>()(
    "WeatherConfigService", // Service name used as a tag identifier
    {
        // The effect that constructs and returns the WeatherPipelineConfig object
        effect: Effect.sync((): WeatherPipelineConfig => {
            // In a real application, load these from environment variables or a configuration file
            // Fallback to defaults if environment variables are not set
            const apiKey =
                (typeof process !== "undefined" && process.env?.OPENWEATHER_API_KEY) ||
                "__default_api_key_please_replace__"
            const city =
                (typeof process !== "undefined" && process.env?.OPENWEATHER_CITY) ||
                "London"
            return {
                apiKey,
                city,
                units: "metric", // Default units
                lang: "en", // Default language
            }
        }),
    },
) { }

// --- Weather Service ---
export class WeatherPipelineError extends Data.TaggedError("WeatherPipelineError")<{
    readonly cause?: unknown // The original error, if any
    readonly message: string // A human-readable error message
}> { }

export interface WeatherCondition {
    readonly id: number // Weather condition id
    readonly main: string // Group of weather parameters (Rain, Snow, Extreme etc.)
    readonly description: string // Weather condition within the group
    readonly icon: string // Weather icon id
}

export interface WeatherResponse {
    readonly weather: ReadonlyArray<WeatherCondition> // List of weather conditions
    readonly main: {
        readonly temp: number
        readonly feels_like: number
        readonly temp_min: number
        readonly temp_max: number
        readonly pressure: number
        readonly humidity: number
    }
    readonly wind: {
        readonly speed: number
        readonly deg: number
    }
    readonly name: string // City name
    readonly dt: number // Time of data calculation, unix, UTC
}

export interface WeatherServiceApi {
    readonly getForecast: (
        city?: string,
    ) => Effect.Effect<WeatherResponse, WeatherPipelineError, never> // Context 'R' is never as dependencies are handled by Layers
}

export class WeatherService extends Effect.Service<WeatherServiceApi>()(
    "WeatherService", // Service name used as a tag identifier
    {
  
        effect: Effect.gen(function* ($) {
            const config = yield* $(WeatherConfigService) // Yield the Tag to get the WeatherConfigService instance

            const getForecast = (
                cityOverride?: string,
            ): Effect.Effect<WeatherResponse, WeatherPipelineError> =>
                Effect.gen(function* () {
                    const currentConfig = config // config is the resolved WeatherPipelineConfig object
                    const city = cityOverride ?? currentConfig.city
                    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${currentConfig.apiKey}&units=${currentConfig.units}&lang=${currentConfig.lang}`

                    const responsePayload = yield* Effect.tryPromise({
                        try: () =>
                            fetch(url).then(res => {
                                if (!res.ok) {
                                    // Attempt to parse error message from OpenWeather API if possible
                                    return res
                                        .json()
                                        .then(errorBody => {
                                            throw new Error(
                                                `API request failed with status ${res.status}: ${errorBody?.message || res.statusText
                                                }`,
                                            )
                                        })
                                        .catch(() => {
                                            // If error body parsing fails, throw generic error
                                            throw new Error(
                                                `API request failed with status ${res.status}: ${res.statusText}`,
                                            )
                                        })
                                }
                                return res.json() as Promise<OpenWeatherRawResponse>
                            }),
                        catch: error => {
                            const message =
                                error instanceof Error ? error.message : "Network or parsing error"
                            return new WeatherPipelineError({
                                message: `Failed to fetch weather data for city ${city}: ${message}`,
                                cause: error,
                            })
                        },
                    })

                    // Validate response structure (OpenWeather specific)
                    if (String(responsePayload.cod) !== "200") {
                        return yield* Effect.fail(
                            new WeatherPipelineError({
                                message: `API Error for ${city}: ${responsePayload.message ||
                                    `Received code ${responsePayload.cod}`
                                    }`,
                                cause: responsePayload,
                            }),
                        )
                    }

                    if (
                        !responsePayload.main ||
                        !Array.isArray(responsePayload.weather) ||
                        responsePayload.weather.length === 0
                    ) {
                        return yield* Effect.fail(
                            new WeatherPipelineError({
                                message: `Unexpected API response structure for city ${city}.`,
                                cause: responsePayload,
                            }),
                        )
                    }

                    // Transform the raw API response to the WeatherResponse interface
                    const transformedResponse: WeatherResponse = {
                        weather: responsePayload.weather.map((w: OpenWeatherRawResponse) => ({
                            id: w.id,
                            main: w.main,
                            description: w.description,
                            icon: w.icon,
                        })),
                        main: {
                            temp: responsePayload.main.temp,
                            feels_like: responsePayload.main.feels_like,
                            temp_min: responsePayload.main.temp_min,
                            temp_max: responsePayload.main.temp_max,
                            pressure: responsePayload.main.pressure,
                            humidity: responsePayload.main.humidity,
                        },
                        wind: responsePayload.wind, // Assuming wind structure matches WeatherResponse
                        name: responsePayload.name,
                        dt: responsePayload.dt,
                    }
                    return transformedResponse
                }).pipe(
                    // Ensure all errors are WeatherPipelineError and log them
                    Effect.catchAll(error => {
                        if (error instanceof WeatherPipelineError) return Effect.fail(error)
                        return Effect.fail(new WeatherPipelineError({ message: "An unexpected error occurred in getForecast", cause: error }))
                    }),
                    Effect.tapError(error => Effect.logDebug("getForecast processing failed", { city: cityOverride ?? config.city, error })),
                )

            // Return the implementation of WeatherServiceApi
            return { getForecast }
        }),
        dependencies: [WeatherConfigService.Default], // Declare dependency on the WeatherConfigService class (Tag)
    },
) { }

// --- Layers ---

// Live Layers: These provide the actual service implementations
// The .layer static property is automatically provided by Effect.Service
export const WeatherConfigLiveLayer: Layer.Layer<WeatherConfigService> =
    WeatherConfigService.Default

// WeatherService.layer is Layer<WeatherService, never, WeatherConfigService>
// We provide WeatherConfigLiveLayer to satisfy its dependency.
export const WeatherServiceLiveLayer: Layer.Layer<WeatherService> = Layer.provide(
    WeatherService.Default,
    WeatherConfigLiveLayer,
)

// --- Mocks & Test Layers ---

export const MOCK_WEATHER_PIPELINE_CONFIG: WeatherPipelineConfig = {
    apiKey: "mockApiKey",
    city: "MockCity",
    units: "metric",
    lang: "en",
}

export const MOCK_WEATHER_RESPONSE: WeatherResponse = {
    weather: [{ id: 800, main: "Clear", description: "clear sky", icon: "01d" }],
    main: {
        temp: 25,
        feels_like: 25,
        temp_min: 20,
        temp_max: 30,
        pressure: 1012,
        humidity: 50,
    },
    wind: { speed: 1.5, deg: 350 },
    name: "MockCity",
    dt: Math.floor(Date.now() / 1000),
}

// Mock Implementations for testing: These are objects that conform to the service interfaces
export const MockWeatherConfigTestImplementation: WeatherPipelineConfig =
    MOCK_WEATHER_PIPELINE_CONFIG

export const MockWeatherServiceTestImplementation: WeatherServiceApi = {
    getForecast: (_city?: string) => Effect.succeed(MOCK_WEATHER_RESPONSE),
}

// Test Service Implementations using Effect.Service pattern
export class TestWeatherConfigService extends Effect.Service<WeatherPipelineConfig>()(
    "TestWeatherConfigService",
    {
        effect: Effect.sync(() => MOCK_WEATHER_PIPELINE_CONFIG)
    }
) { }

export class TestWeatherService extends Effect.Service<WeatherServiceApi>()(
    "TestWeatherService",
    {
        effect: Effect.sync(() => ({
            getForecast: (_city?: string) => Effect.succeed(MOCK_WEATHER_RESPONSE)
        }))
    }
) { }

// Test Layers: These provide the test service implementations
export const WeatherConfigTestLayer = TestWeatherConfigService.Default

// Provides a mock WeatherService that uses a mock WeatherConfigService
export const WeatherServiceTestLayer = Layer.provide(
    TestWeatherService.Default,
    WeatherConfigTestLayer
)

// Alternative Test Layer: Uses the real WeatherService logic but with a mocked WeatherConfigService
// This is useful for testing the WeatherService's transformation logic without hitting the actual API.
export const WeatherServiceWithMockConfigTestLayer = Layer.provide(
    WeatherService.Default,
    WeatherConfigTestLayer
)