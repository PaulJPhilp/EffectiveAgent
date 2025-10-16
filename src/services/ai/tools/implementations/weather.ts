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
        S.Union(...Object.values(UnitSystem).map(unit => S.Literal(unit)))
    ).pipe(S.withDefaults({ constructor: () => UnitSystem.METRIC, decoding: () => UnitSystem.METRIC })),
    days: S.optional(S.Number).pipe(S.withDefaults({ constructor: () => 1, decoding: () => 1 })) // For forecast operation
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

// --- Implementation ---

export const weatherImpl = (input: unknown): Effect.Effect<WeatherOutput, Error> =>
    Effect.gen(function* () {
        // Validate input
        const data = yield* Effect.succeed(input).pipe(
            Effect.flatMap(i => S.decodeUnknown(WeatherInputSchema)(i)),
            Effect.mapError((e): Error => new Error(`Invalid input: ${String(e)}`))
        );

        // Weather API integration is not implemented yet
        // This tool requires a weather service provider (e.g., OpenWeatherMap, WeatherAPI, etc.)
        // to be integrated with the agent runtime configuration
        return yield* Effect.fail(new Error(
            `Weather API integration not available. Requested ${data.operation} weather for ${data.location} in ${data.units} units. Please configure a weather service provider in the agent runtime.`
        ));
    }); 