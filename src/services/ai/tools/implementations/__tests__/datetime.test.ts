import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { DateTimeFormat, DateTimeOperation, DateTimeUnit, dateTimeImpl } from "../datetime.js";

describe("DateTime Tool", () => {
    describe("NOW operation", () => {
        it("should return current time in ISO format", () => Effect.gen(function* () {
            const result = yield* dateTimeImpl({
                operation: DateTimeOperation.NOW
            });
            expect(result.result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            expect(result.details?.timeZone).toBeDefined();
            expect(result.details?.timeZone?.name).toBeDefined();
            expect(result.details?.timeZone?.offset).toBeDefined();
        }));

        it("should format current time in different formats", () => Effect.gen(function* () {
            const formats = [DateTimeFormat.ISO, DateTimeFormat.RFC, DateTimeFormat.LONG, DateTimeFormat.SHORT];
            for (const format of formats) {
                const result = yield* dateTimeImpl({
                    operation: DateTimeOperation.NOW,
                    format
                });
                expect(result.result).toBeDefined();
                expect(typeof result.result).toBe("string");
            }
        }));
    });

    describe("PARSE operation", () => {
        it("should parse zoned date-time string", () => Effect.gen(function* () {
            const result = yield* dateTimeImpl({
                operation: DateTimeOperation.PARSE,
                dateString: "2024-03-20T12:00:00[UTC]"
            });
            expect(result.result).toBe("2024-03-20T12:00:00+00:00[UTC]");
            expect(result.details?.timeZone?.name).toBe("UTC");
        }));

        it("should parse plain date-time string", () => Effect.gen(function* () {
            const result = yield* dateTimeImpl({
                operation: DateTimeOperation.PARSE,
                dateString: "2024-03-20T12:00:00"
            });
            expect(result.result).toBe("2024-03-20T12:00:00");
            expect(result.details?.timeZone).toBeUndefined();
        }));

        it("should fail with invalid date string", () => Effect.gen(function* () {
            const result = yield* Effect.either(dateTimeImpl({
                operation: DateTimeOperation.PARSE,
                dateString: "invalid"
            }));
            expect(Either.isLeft(result)).toBe(true);
        }));
    });

    describe("FORMAT operation", () => {
        it("should format date in different formats", () => Effect.gen(function* () {
            const formats = [DateTimeFormat.ISO, DateTimeFormat.RFC, DateTimeFormat.LONG, DateTimeFormat.SHORT];
            for (const format of formats) {
                const result = yield* dateTimeImpl({
                    operation: DateTimeOperation.FORMAT,
                    date: "2024-03-20T12:00:00[UTC]",
                    format
                });
                expect(result.result).toBeDefined();
                expect(typeof result.result).toBe("string");
            }
        }));

        it("should format with custom locale", () => Effect.gen(function* () {
            const result = yield* dateTimeImpl({
                operation: DateTimeOperation.FORMAT,
                date: "2024-03-20T12:00:00[UTC]",
                format: DateTimeFormat.LONG,
                locale: "fr-FR"
            });
            expect(result.result).toContain("2024");
        }));
    });

    describe("ADD operation", () => {
        it("should add various units", () => Effect.gen(function* () {
            const units = Object.values(DateTimeUnit);
            for (const unit of units) {
                const result = yield* dateTimeImpl({
                    operation: DateTimeOperation.ADD,
                    date: "2024-03-20T12:00:00[UTC]",
                    amount: 1,
                    unit
                });
                expect(result.result).toBeDefined();
                expect(result.details?.calculation).toBeDefined();
                expect(result.details?.calculation?.start).toBe("2024-03-20T12:00:00+00:00[UTC]");
                expect(result.details?.calculation?.duration).toBe(`P${unit === "weeks" ? "7D" : `1${unit.toUpperCase()}`}`);
            }
        }));

        it("should handle negative amounts", () => Effect.gen(function* () {
            const result = yield* dateTimeImpl({
                operation: DateTimeOperation.ADD,
                date: "2024-03-20T12:00:00[UTC]",
                amount: -1,
                unit: DateTimeUnit.DAYS
            });
            expect(result.result).toBe("2024-03-19T12:00:00+00:00[UTC]");
        }));
    });

    describe("SUBTRACT operation", () => {
        it("should subtract various units", () => Effect.gen(function* () {
            const units = Object.values(DateTimeUnit);
            for (const unit of units) {
                const result = yield* dateTimeImpl({
                    operation: DateTimeOperation.SUBTRACT,
                    date: "2024-03-20T12:00:00[UTC]",
                    amount: 1,
                    unit
                });
                expect(result.result).toBeDefined();
                expect(result.details?.calculation).toBeDefined();
                expect(result.details?.calculation?.start).toBe("2024-03-20T12:00:00+00:00[UTC]");
                expect(result.details?.calculation?.duration).toBe(`P${unit === "weeks" ? "7D" : `1${unit.toUpperCase()}`}`);
            }
        }));
    });

    describe("DIFF operation", () => {
        it("should calculate difference in various units", () => Effect.gen(function* () {
            const units = Object.values(DateTimeUnit);
            for (const unit of units) {
                const result = yield* dateTimeImpl({
                    operation: DateTimeOperation.DIFF,
                    date1: "2024-03-20T12:00:00[UTC]",
                    date2: "2024-03-21T12:00:00[UTC]",
                    unit
                });
                expect(result.result).toBeDefined();
                expect(result.details?.calculation).toBeDefined();
                expect(result.details?.calculation?.start).toBe("2024-03-20T12:00:00+00:00[UTC]");
                expect(result.details?.calculation?.end).toBe("2024-03-21T12:00:00+00:00[UTC]");
            }
        }));

        it("should handle negative differences", () => Effect.gen(function* () {
            const result = yield* dateTimeImpl({
                operation: DateTimeOperation.DIFF,
                date1: "2024-03-21T12:00:00[UTC]",
                date2: "2024-03-20T12:00:00[UTC]",
                unit: DateTimeUnit.DAYS
            });
            expect(result.result).toBe("P-1D");
        }));
    });

    describe("Error handling", () => {
        it("should handle invalid input schema", () => Effect.gen(function* () {
            const result = yield* Effect.either(dateTimeImpl({
                operation: "INVALID" as any
            }));
            expect(Either.isLeft(result)).toBe(true);
        }));

        it("should handle invalid dates", () => Effect.gen(function* () {
            const result = yield* Effect.either(dateTimeImpl({
                operation: DateTimeOperation.FORMAT,
                date: "invalid",
                format: DateTimeFormat.ISO
            }));
            expect(Either.isLeft(result)).toBe(true);
        }));

        it("should handle invalid operation", () => Effect.gen(function* () {
            const result = yield* Effect.either(dateTimeImpl({
                operation: "UNKNOWN" as any,
                date: "2024-03-20T12:00:00[UTC]"
            }));
            expect(Either.isLeft(result)).toBe(true);
        }));
    });
}); 