/**
 * @file Weather tool implementation
 * @module services/tools/implementations/weather
 */

import { Effect, Schema as S } from "effect";

// --- Input Schema ---

export const WeatherOperation = {
    CURRENT: "CURRENT",
    FORECAST: "FORECAST",
    ALERTS: "ALERTS"
} as const;

export const UnitSystem = {
    METRIC: "metric",
    IMPERIAL: "imperial"
} as const;

export const WeatherInputSchema = S.Struct({
    operation: S.Union(
        ...Object.values(WeatherOperation).map(op => S.Literal(op))
    ),
    location: S.String,
    units: S.optional(
        S.Union(...Object.values(UnitSystem).map(unit => S.Literal(unit))),
        { default: UnitSystem.METRIC }
    ),
    days: S.optional(S.Number, { default: 1 }) // For forecast operation
});

export type WeatherInput = S.Schema.Type<typeof WeatherInputSchema>;

// --- Output Schema ---

export const WeatherConditionSchema = S.Struct({
    temperature: S.Number,
    feelsLike: S.Number,
    humidity: S.Number,
    windSpeed: S.Number,
    description: S.String
});

export const WeatherAlertSchema = S.Struct({
    type: S.String,
    severity: S.String,
    description: S.String,
    start: S.String,
    end: S.String
});

export const WeatherOutputSchema = S.Struct({
    location: S.String,
    units: S.Union(...Object.values(UnitSystem).map(unit => S.Literal(unit))),
    current: S.optional(WeatherConditionSchema),
    forecast: S.optional(S.Array(S.Struct({
        date: S.String,
        conditions: WeatherConditionSchema
    }))),
    alerts: S.optional(S.Array(WeatherAlertSchema))
});

export type WeatherOutput = S.Schema.Type<typeof WeatherOutputSchema>;

// --- Mock Data ---

const mockWeatherData = {
    metric: {
        current: {
            temperature: 22,
            feelsLike: 23,
            humidity: 65,
            windSpeed: 12,
            description: "Partly cloudy"
        },
        forecast: [
            {
                date: "2024-03-21",
                conditions: {
                    temperature: 23,
                    feelsLike: 24,
                    humidity: 60,
                    windSpeed: 10,
                    description: "Sunny"
                }
            },
            {
                date: "2024-03-22",
                conditions: {
                    temperature: 20,
                    feelsLike: 19,
                    humidity: 75,
                    windSpeed: 15,
                    description: "Light rain"
                }
            }
        ],
        alerts: [
            {
                type: "Rain",
                severity: "Moderate",
                description: "Periods of rain expected",
                start: "2024-03-22T00:00:00Z",
                end: "2024-03-22T12:00:00Z"
            }
        ]
    },
    imperial: {
        current: {
            temperature: 72,
            feelsLike: 73,
            humidity: 65,
            windSpeed: 7,
            description: "Partly cloudy"
        },
        forecast: [
            {
                date: "2024-03-21",
                conditions: {
                    temperature: 73,
                    feelsLike: 75,
                    humidity: 60,
                    windSpeed: 6,
                    description: "Sunny"
                }
            },
            {
                date: "2024-03-22",
                conditions: {
                    temperature: 68,
                    feelsLike: 66,
                    humidity: 75,
                    windSpeed: 9,
                    description: "Light rain"
                }
            }
        ],
        alerts: [
            {
                type: "Rain",
                severity: "Moderate",
                description: "Periods of rain expected",
                start: "2024-03-22T00:00:00Z",
                end: "2024-03-22T12:00:00Z"
            }
        ]
    }
};

// --- Implementation ---

export const weatherImpl = (input: unknown): Effect.Effect<WeatherOutput, Error> =>
    Effect.gen(function* () {
        // Validate input
        const data = yield* Effect.succeed(input).pipe(
            Effect.flatMap(i => S.decodeUnknown(WeatherInputSchema)(i)),
            Effect.mapError((e): Error => new Error(`Invalid input: ${String(e)}`))
        );

        // Get mock data for the selected unit system
        const weatherData = mockWeatherData[data.units];

        // Base output with location and units
        const baseOutput: WeatherOutput = {
            location: data.location,
            units: data.units
        };

        switch (data.operation) {
            case WeatherOperation.CURRENT:
                return {
                    ...baseOutput,
                    current: weatherData.current
                };

            case WeatherOperation.FORECAST:
                return {
                    ...baseOutput,
                    forecast: weatherData.forecast.slice(0, data.days)
                };

            case WeatherOperation.ALERTS:
                return {
                    ...baseOutput,
                    alerts: weatherData.alerts
                };

            default:
                return yield* Effect.fail(new Error(`Unsupported operation: ${data.operation}`));
        }
    }); 