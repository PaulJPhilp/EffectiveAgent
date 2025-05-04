import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { UnitSystem, WeatherOperation, weatherImpl } from "../weather.js";

describe("Weather Tool", () => {
    describe("CURRENT operation", () => {
        it("should return current weather in metric units", () => Effect.gen(function* () {
            const result = yield* weatherImpl({
                operation: WeatherOperation.CURRENT,
                location: "London",
                units: UnitSystem.METRIC
            });

            expect(result.location).toBe("London");
            expect(result.units).toBe(UnitSystem.METRIC);
            expect(result.current).toBeDefined();
            expect(result.current?.temperature).toBe(22);
            expect(result.current?.windSpeed).toBe(12);
        }));

        it("should return current weather in imperial units", () => Effect.gen(function* () {
            const result = yield* weatherImpl({
                operation: WeatherOperation.CURRENT,
                location: "London",
                units: UnitSystem.IMPERIAL
            });

            expect(result.location).toBe("London");
            expect(result.units).toBe(UnitSystem.IMPERIAL);
            expect(result.current).toBeDefined();
            expect(result.current?.temperature).toBe(72);
            expect(result.current?.windSpeed).toBe(7);
        }));

        it("should use metric units by default", () => Effect.gen(function* () {
            const result = yield* weatherImpl({
                operation: WeatherOperation.CURRENT,
                location: "London"
            });

            expect(result.units).toBe(UnitSystem.METRIC);
            expect(result.current?.temperature).toBe(22);
        }));
    });

    describe("FORECAST operation", () => {
        it("should return forecast for specified days", () => Effect.gen(function* () {
            const result = yield* weatherImpl({
                operation: WeatherOperation.FORECAST,
                location: "London",
                days: 2,
                units: UnitSystem.METRIC
            });

            expect(result.location).toBe("London");
            expect(result.forecast).toHaveLength(2);
            expect(result.forecast?.[0].date).toBe("2024-03-21");
            expect(result.forecast?.[0].conditions.temperature).toBe(23);
        }));

        it("should limit forecast to available days", () => Effect.gen(function* () {
            const result = yield* weatherImpl({
                operation: WeatherOperation.FORECAST,
                location: "London",
                days: 5, // More than available in mock data
                units: UnitSystem.METRIC
            });

            expect(result.forecast).toHaveLength(2); // Only 2 days in mock data
        }));

        it("should return one day forecast by default", () => Effect.gen(function* () {
            const result = yield* weatherImpl({
                operation: WeatherOperation.FORECAST,
                location: "London"
            });

            expect(result.forecast).toHaveLength(1);
        }));
    });

    describe("ALERTS operation", () => {
        it("should return weather alerts", () => Effect.gen(function* () {
            const result = yield* weatherImpl({
                operation: WeatherOperation.ALERTS,
                location: "London",
                units: UnitSystem.METRIC
            });

            expect(result.location).toBe("London");
            expect(result.alerts).toBeDefined();
            expect(result.alerts).toHaveLength(1);
            expect(result.alerts?.[0].type).toBe("Rain");
            expect(result.alerts?.[0].severity).toBe("Moderate");
        }));
    });

    describe("Error handling", () => {
        it("should handle invalid input schema", () => Effect.gen(function* () {
            const result = yield* Effect.either(weatherImpl({
                operation: "INVALID" as any,
                location: "London"
            }));
            expect(Either.isLeft(result)).toBe(true);
        }));

        it("should handle missing required fields", () => Effect.gen(function* () {
            const result = yield* Effect.either(weatherImpl({
                operation: WeatherOperation.CURRENT
            } as any));
            expect(Either.isLeft(result)).toBe(true);
        }));

        it("should handle invalid operation", () => Effect.gen(function* () {
            const result = yield* Effect.either(weatherImpl({
                operation: "UNKNOWN" as any,
                location: "London"
            }));
            expect(Either.isLeft(result)).toBe(true);
        }));
    });
}); 