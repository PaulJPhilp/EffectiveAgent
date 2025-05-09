/**
 * @file DateTime tool implementation
 * @module services/tools/implementations/datetime
 */

import { Temporal } from "@js-temporal/polyfill";
import { Effect, Schema as S } from "effect";

// --- Input Schema ---

export const DateTimeOperation = {
    NOW: "NOW",
    PARSE: "PARSE",
    FORMAT: "FORMAT",
    ADD: "ADD",
    SUBTRACT: "SUBTRACT",
    DIFF: "DIFF"
} as const;

export const DateTimeUnit = {
    YEARS: "years",
    MONTHS: "months",
    WEEKS: "weeks",
    DAYS: "days",
    HOURS: "hours",
    MINUTES: "minutes",
    SECONDS: "seconds"
} as const;

export const DateTimeFormat = {
    ISO: "ISO",
    RFC: "RFC",
    LONG: "LONG",
    SHORT: "SHORT"
} as const;

export const DateTimeInputSchema = S.Union(
    // NOW operation
    S.Struct({
        operation: S.Literal(DateTimeOperation.NOW),
        format: S.optional(S.Enums(DateTimeFormat))
    }),
    // PARSE operation
    S.Struct({
        operation: S.Literal(DateTimeOperation.PARSE),
        dateString: S.String
    }),
    // FORMAT operation
    S.Struct({
        operation: S.Literal(DateTimeOperation.FORMAT),
        date: S.String,
        format: S.Enums(DateTimeFormat),
        locale: S.optional(S.String)
    }),
    // ADD operation
    S.Struct({
        operation: S.Literal(DateTimeOperation.ADD),
        date: S.String,
        amount: S.Number,
        unit: S.Enums(DateTimeUnit)
    }),
    // SUBTRACT operation
    S.Struct({
        operation: S.Literal(DateTimeOperation.SUBTRACT),
        date: S.String,
        amount: S.Number,
        unit: S.Enums(DateTimeUnit)
    }),
    // DIFF operation
    S.Struct({
        operation: S.Literal(DateTimeOperation.DIFF),
        date1: S.String,
        date2: S.String,
        unit: S.Enums(DateTimeUnit)
    })
);

export type DateTimeInput = S.Schema.Type<typeof DateTimeInputSchema>;

// --- Output Schema ---

export const TimeZoneInfoSchema = S.Struct({
    name: S.String,
    offset: S.String
});

export const DateTimeOutputSchema = S.Struct({
    result: S.String,
    details: S.optional(S.Struct({
        parsed: S.Unknown,
        timeZone: S.optional(TimeZoneInfoSchema),
        calculation: S.optional(S.Struct({
            start: S.String,
            end: S.String,
            duration: S.String
        }))
    }))
});

export type DateTimeOutput = S.Schema.Type<typeof DateTimeOutputSchema>;

// --- Helper Functions ---

function isZonedDateTime(value: unknown): value is Temporal.ZonedDateTime {
    return value instanceof Temporal.ZonedDateTime;
}

function parseDateTime(value: string): Effect.Effect<Temporal.ZonedDateTime | Temporal.PlainDateTime, Error> {
    return Effect.try({
        try: () => {
            try {
                return Temporal.ZonedDateTime.from(value);
            } catch {
                return Temporal.PlainDateTime.from(value);
            }
        },
        catch: (error) => new Error(`Failed to parse date/time value: ${value}`, { cause: error })
    });
}

function formatDateTime(
    datetime: Temporal.ZonedDateTime | Temporal.PlainDateTime,
    format: keyof typeof DateTimeFormat = DateTimeFormat.ISO,
    locale?: string
): string {
    switch (format) {
        case DateTimeFormat.ISO:
            return datetime.toString();
        case DateTimeFormat.RFC:
            return datetime.toLocaleString(locale || "en-US", {
                weekday: "short",
                month: "short",
                day: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZoneName: "short"
            });
        case DateTimeFormat.LONG:
            return datetime.toLocaleString(locale || "en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
                timeZoneName: "long"
            });
        case DateTimeFormat.SHORT:
            return datetime.toLocaleString(locale || "en-US", {
                dateStyle: "short",
                timeStyle: "short"
            });
        default:
            return datetime.toString();
    }
}

// --- Implementation ---

export const dateTimeImpl = (input: unknown): Effect.Effect<DateTimeOutput, Error> =>
    Effect.gen(function* () {
        const data = yield* Effect.succeed(input).pipe(
            Effect.flatMap(i => S.decodeUnknown(DateTimeInputSchema)(i)),
            Effect.mapError((e): Error => new Error(`Invalid input: ${String(e)}`))
        );

        switch (data.operation) {
            case DateTimeOperation.NOW: {
                const now = Temporal.Now.zonedDateTimeISO();
                const result = {
                    result: data.format ? formatDateTime(now, data.format) : now.toString(),
                    details: {
                        parsed: now,
                        timeZone: {
                            name: now.timeZoneId,
                            offset: now.offset
                        }
                    }
                };
                return yield* Effect.succeed(result);
            }

            case DateTimeOperation.PARSE: {
                const parsed = yield* parseDateTime(data.dateString);
                const result = {
                    result: parsed.toString(),
                    details: {
                        parsed,
                        timeZone: isZonedDateTime(parsed) ? {
                            name: parsed.timeZoneId,
                            offset: parsed.offset
                        } : undefined
                    }
                };
                return yield* Effect.succeed(result);
            }

            case DateTimeOperation.FORMAT: {
                const parsed = yield* parseDateTime(data.date);
                const result = {
                    result: formatDateTime(parsed, data.format, data.locale),
                    details: {
                        parsed,
                        timeZone: isZonedDateTime(parsed) ? {
                            name: parsed.timeZoneId,
                            offset: parsed.offset
                        } : undefined
                    }
                };
                return yield* Effect.succeed(result);
            }

            case DateTimeOperation.ADD: {
                const parsed = yield* parseDateTime(data.date);
                const duration = Temporal.Duration.from({ [data.unit]: data.amount });
                const added = parsed.add(duration);
                const result = {
                    result: added.toString(),
                    details: {
                        parsed,
                        timeZone: isZonedDateTime(parsed) ? {
                            name: parsed.timeZoneId,
                            offset: parsed.offset
                        } : undefined,
                        calculation: {
                            start: parsed.toString(),
                            end: added.toString(),
                            duration: duration.toString()
                        }
                    }
                };
                return yield* Effect.succeed(result);
            }

            case DateTimeOperation.SUBTRACT: {
                const parsed = yield* parseDateTime(data.date);
                const duration = Temporal.Duration.from({ [data.unit]: data.amount });
                const subtracted = parsed.subtract(duration);
                const result = {
                    result: subtracted.toString(),
                    details: {
                        parsed,
                        timeZone: isZonedDateTime(parsed) ? {
                            name: parsed.timeZoneId,
                            offset: parsed.offset
                        } : undefined,
                        calculation: {
                            start: parsed.toString(),
                            end: subtracted.toString(),
                            duration: duration.toString()
                        }
                    }
                };
                return yield* Effect.succeed(result);
            }

            case DateTimeOperation.DIFF: {
                const [date1, date2] = yield* Effect.all([
                    parseDateTime(data.date1),
                    parseDateTime(data.date2)
                ]);
                const difference = date1.until(date2, { largestUnit: data.unit });
                const result = {
                    result: difference.toString(),
                    details: {
                        parsed: date1,
                        timeZone: isZonedDateTime(date1) ? {
                            name: date1.timeZoneId,
                            offset: date1.offset
                        } : undefined,
                        calculation: {
                            start: date1.toString(),
                            end: date2.toString(),
                            duration: difference.toString()
                        }
                    }
                };
                return yield* Effect.succeed(result);
            }

            default: {
                const operation = (data as { operation: string }).operation;
                return yield* Effect.fail(new Error(`Unsupported operation: ${operation}`));
            }
        }
    }); 