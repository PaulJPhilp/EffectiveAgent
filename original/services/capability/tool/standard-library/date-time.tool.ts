/**
 * TODO: Future Enhancements
 * 1. Add Daylight Saving Time (DST) functionality:
 *    - Implement isDST checking using Temporal API
 *    - Add DST transition information to TimeZoneInfo
 *    - Handle DST edge cases (transitions, ambiguous times)
 * 
 * 2. Improve Temporal API Type Safety:
 *    - Create proper TypeScript types for Temporal objects
 *    - Add type definitions for Temporal methods and properties
 *    - Consider creating a custom type-safe wrapper for Temporal
 *    - Update Zod schemas to properly validate Temporal objects
 */

import { Temporal } from "@js-temporal/polyfill"
import { Effect } from "effect"
import { z } from "zod"
import { type Tool, type ToolExecutionContext } from "../types/index.ts"
import {
    CalculationError,
    ConversionError,
    FormatError,
    MissingParameterError,
    ParseError,
    UnsupportedOperationError,
    ValidationError
} from "./errors/date-time-error.ts"
import {
    type DateTimeInput,
    type DateTimeOutput,
    CalculationType,
    DateTimeOperation,
    FormatType
} from "./types/date-time.types.ts"

// Add type declarations for Temporal objects
declare module "@js-temporal/polyfill" {
    namespace Temporal {
        interface ZonedDateTime {
            timeZoneId: string
            offset: string
            toString(): string
            toLocaleString(locale: string, options?: Intl.DateTimeFormatOptions): string
            withTimeZone(timeZone: string): ZonedDateTime
            add(duration: Duration): ZonedDateTime
            subtract(duration: Duration): ZonedDateTime
            until(other: ZonedDateTime | PlainDateTime): Duration
        }

        interface PlainDateTime {
            toString(): string
            toLocaleString(locale: string, options?: Intl.DateTimeFormatOptions): string
            add(duration: Duration): PlainDateTime
            subtract(duration: Duration): PlainDateTime
            until(other: ZonedDateTime | PlainDateTime): Duration
        }

        interface Duration {
            toString(): string
            total(unit: string): number
        }

        namespace Now {
            function zonedDateTimeISO(timeZone: string): ZonedDateTime
        }
    }
}

// Input schema validation using Zod
const DateTimeInputSchema = z.object({
    operation: z.nativeEnum(DateTimeOperation),
    value: z.string().min(1),
    params: z
        .object({
            from: z.string().optional(),
            to: z.string().optional(),
            locale: z.string().optional(),
            calendar: z.string().optional(),
            calculation: z
                .object({
                    type: z.nativeEnum(CalculationType),
                    amount: z.number().optional(),
                    unit: z.string().optional(),
                    to: z.string().optional(),
                    roundingMode: z.string().optional(),
                    businessDays: z
                        .object({
                            holidays: z.array(z.string()).optional(),
                            weekendDays: z.array(z.number()).optional()
                        })
                        .optional()
                })
                .optional(),
            pattern: z.string().optional()
        })
        .optional()
})

const DateTimeOutputSchema = z.object({
    result: z.union([z.string(), z.boolean(), z.number()]),
    details: z
        .object({
            parsed: z.any().optional(), // Temporal objects can't be validated by Zod directly
            timeZone: z
                .object({
                    name: z.string(),
                    offset: z.string()
                })
                .optional(),
            calculation: z
                .object({
                    start: z.string(),
                    end: z.string(),
                    duration: z.string()
                })
                .optional()
        })
        .optional(),
    meta: z
        .object({
            warnings: z.array(z.string()).optional(),
            alternatives: z.array(z.string()).optional()
        })
        .optional()
})

/**
 * Date/Time Tool implementation
 */
export const dateTimeTool: Tool<typeof DateTimeInputSchema, typeof DateTimeOutputSchema> = {
    id: "date-time",
    name: "Date/Time Tool",
    description:
        "A comprehensive tool for date/time parsing, formatting, conversion, and calculations using the Temporal API.",
    toolPrompt: `Use this tool for any date/time related operations. The tool supports:

1. PARSE: Convert string dates into structured temporal objects
   - Use for parsing any date/time string into a standardized format
   - Handles both zoned and unzoned date/times
   - Example: "2024-03-15T14:30:00Z" or "2024-03-15 14:30"

2. FORMAT: Convert dates into specific string formats
   - ISO: Standard ISO 8601 format
   - RFC: RFC 2822 format
   - LONG: Full date and time with locale support
   - SHORT: Abbreviated date and time
   - CUSTOM: Custom format using pattern (if supported)
   - Example: Convert to user-friendly format or specific standard

3. CONVERT: Change time zones
   - Convert between any IANA time zones
   - Handles DST transitions automatically
   - Example: Convert from UTC to America/New_York

4. CALCULATE: Perform date/time calculations
   - ADD/SUBTRACT: Modify dates by duration
   - DIFFERENCE: Calculate duration between dates
   - Supports various units (years, months, days, hours, etc.)
   - Example: Add 2 days to a date or find time between dates

5. VALIDATE: Check if a date string is valid
   - Verify date/time string format
   - Returns validation status and details
   - Example: Check if "2024-02-30" is a valid date

Input always requires:
- operation: The type of operation to perform
- value: The date/time string to process
- params: Optional parameters specific to the operation

The tool handles all edge cases and time zone complexities using the Temporal API.`,
    inputSchema: DateTimeInputSchema,
    outputSchema: DateTimeOutputSchema,
    tags: ["date", "time", "temporal", "utility"],

    execute: (input: DateTimeInput, context: ToolExecutionContext) =>
        Effect.gen(function* () {
            const log = yield* context.loggingService.getLogger("DateTimeTool")
            yield* log.debug("Executing date/time tool", { input })

            switch (input.operation) {
                case DateTimeOperation.PARSE:
                    return yield* handleParse(input, log)
                case DateTimeOperation.FORMAT:
                    return yield* handleFormat(input, log)
                case DateTimeOperation.CONVERT:
                    return yield* handleConvert(input, log)
                case DateTimeOperation.CALCULATE:
                    return yield* handleCalculate(input, log)
                case DateTimeOperation.VALIDATE:
                    return yield* handleValidate(input, log)
                default:
                    return yield* Effect.fail(new UnsupportedOperationError(`Unsupported operation: ${input.operation}`, {
                        toolId: dateTimeTool.id
                    }))
            }
        })
}

// Helper function to parse input into a Temporal object
function parseDateTime(value: string, format?: string): Effect.Effect<Temporal.ZonedDateTime | Temporal.PlainDateTime, ParseError> {
    return Effect.gen(function* () {
        try {
            return Temporal.ZonedDateTime.from(value)
        } catch (error) {
            try {
                return Temporal.PlainDateTime.from(value)
            } catch (innerError) {
                return yield* Effect.fail(new ParseError(`Failed to parse date/time value: ${value}`, {
                    toolId: dateTimeTool.id,
                    cause: error instanceof Error ? error : new Error(String(error))
                }))
            }
        }
    })
}

// Helper function to check if a value is a ZonedDateTime
function isZonedDateTime(value: unknown): value is Temporal.ZonedDateTime {
    return value instanceof Object && 'timeZoneId' in value && 'offset' in value
}

// Helper function to check if a value is a PlainDateTime
function isPlainDateTime(value: unknown): value is Temporal.PlainDateTime {
    return value instanceof Object && 'toLocaleString' in value && !('timeZoneId' in value)
}

// Handler for parse operation
function handleParse(
    input: DateTimeInput,
    log: any
): Effect.Effect<DateTimeOutput, ParseError> {
    return Effect.gen(function* () {
        yield* log.debug("Parsing date/time", { value: input.value })

        const parsed = yield* Effect.try({
            try: () => {
                try {
                    return Temporal.ZonedDateTime.from(input.value)
                } catch (error) {
                    return Temporal.PlainDateTime.from(input.value)
                }
            },
            catch: (error): ParseError => new ParseError(`Failed to parse date/time value: ${input.value}`, {
                toolId: dateTimeTool.id,
                cause: error instanceof Error ? error : new Error(String(error))
            })
        })

        return {
            result: parsed.toString(),
            details: {
                parsed,
                timeZone: isZonedDateTime(parsed) ? {
                    name: parsed.timeZoneId,
                    offset: parsed.offset
                } : undefined
            }
        }
    }) as Effect.Effect<DateTimeOutput, ParseError>
}

// Handler for format operation
function handleFormat(
    input: DateTimeInput,
    log: any
): Effect.Effect<DateTimeOutput, FormatError | ParseError> {
    return Effect.gen(function* () {
        yield* log.debug("Formatting date/time", { value: input.value, params: input.params })

        const parsed = yield* parseDateTime(input.value)
        const format = input.params?.pattern || FormatType.ISO

        if (!Object.values(FormatType).includes(format as FormatType)) {
            return yield* Effect.fail(new FormatError(`Unsupported format type: ${format}`, {
                toolId: dateTimeTool.id
            }))
        }

        let formattedResult: string
        switch (format) {
            case FormatType.ISO:
                formattedResult = parsed.toString()
                break
            case FormatType.RFC:
                formattedResult = parsed.toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                })
                break
            case FormatType.LONG:
                formattedResult = parsed.toLocaleString(input.params?.locale || 'en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric',
                    timeZoneName: 'long'
                })
                break
            case FormatType.SHORT:
                formattedResult = parsed.toLocaleString(input.params?.locale || 'en-US', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                })
                break
            default:
                return yield* Effect.fail(new FormatError(`Unsupported format type: ${format}`, {
                    toolId: dateTimeTool.id
                }))
        }

        return {
            result: formattedResult,
            details: {
                parsed,
                timeZone: isZonedDateTime(parsed) ? {
                    name: parsed.timeZoneId,
                    offset: parsed.offset
                } : undefined
            }
        }
    }).pipe(
        Effect.mapError((e): FormatError | ParseError =>
            e instanceof FormatError || e instanceof ParseError ? e :
                new FormatError("Unexpected format error", { cause: e instanceof Error ? e : new Error(String(e)) })
        )
    ) as Effect.Effect<DateTimeOutput, FormatError | ParseError>
}

// Handler for convert operation
function handleConvert(
    input: DateTimeInput,
    log: any
): Effect.Effect<DateTimeOutput, ConversionError | ParseError> {
    return Effect.gen(function* () {
        yield* log.debug("Converting date/time", { value: input.value, params: input.params })

        if (!input.params?.to) {
            return yield* Effect.fail(new MissingParameterError("Convert operation requires 'to' parameter", {
                toolId: dateTimeTool.id
            }))
        }

        const parsed = yield* parseDateTime(input.value)

        if (!isZonedDateTime(parsed)) {
            return yield* Effect.fail(new ConversionError("Time zone conversion requires a zoned date time", {
                toolId: dateTimeTool.id
            }))
        }

        const converted = yield* Effect.try({
            try: () => parsed.withTimeZone(input.params!.to!),
            catch: (error): ConversionError => new ConversionError("Failed to convert timezone", {
                toolId: dateTimeTool.id,
                cause: error instanceof Error ? error : new Error(String(error))
            })
        })

        return {
            result: converted.toString(),
            details: {
                parsed: converted,
                timeZone: {
                    name: converted.timeZoneId,
                    offset: converted.offset
                }
            }
        }
    }) as Effect.Effect<DateTimeOutput, ConversionError | ParseError>
}

// Handler for calculate operation
function handleCalculate(
    input: DateTimeInput,
    log: any
): Effect.Effect<DateTimeOutput, CalculationError | ParseError> {
    return Effect.gen(function* () {
        yield* log.debug("Calculating date/time", { value: input.value, params: input.params })

        if (!input.params?.calculation) {
            return yield* Effect.fail(new MissingParameterError("Calculate operation requires calculation parameters", {
                toolId: dateTimeTool.id
            }))
        }

        const { type } = input.params.calculation
        if (!Object.values(CalculationType).includes(type as CalculationType)) {
            return yield* Effect.fail(new CalculationError(`Unsupported calculation type: ${type}`, {
                toolId: dateTimeTool.id
            }))
        }

        const parsed = yield* parseDateTime(input.value)
        const { amount = 0, unit = 'days' } = input.params.calculation

        switch (type) {
            case CalculationType.ADD: {
                if (amount === undefined) {
                    return yield* Effect.fail(new CalculationError("Add operation requires an amount", {
                        toolId: dateTimeTool.id
                    }))
                }
                const duration = Temporal.Duration.from({ [unit]: amount })
                const added = parsed.add(duration)
                return {
                    result: added.toString(),
                    details: {
                        parsed,
                        calculation: {
                            start: parsed.toString(),
                            end: added.toString(),
                            duration: duration.toString()
                        }
                    }
                }
            }
            case CalculationType.SUBTRACT: {
                if (amount === undefined) {
                    return yield* Effect.fail(new CalculationError("Subtract operation requires an amount", {
                        toolId: dateTimeTool.id
                    }))
                }
                const duration = Temporal.Duration.from({ [unit]: amount })
                const subtracted = parsed.subtract(duration)
                return {
                    result: subtracted.toString(),
                    details: {
                        parsed,
                        calculation: {
                            start: parsed.toString(),
                            end: subtracted.toString(),
                            duration: duration.toString()
                        }
                    }
                }
            }
            case CalculationType.DIFFERENCE: {
                if (!input.params?.calculation?.to) {
                    return yield* Effect.fail(new CalculationError("Difference calculation requires 'to' parameter", {
                        toolId: dateTimeTool.id
                    }))
                }
                const endDate = Temporal.ZonedDateTime.from(input.params.calculation.to)
                const difference = parsed.until(endDate)
                return {
                    result: difference.toString(),
                    details: {
                        parsed,
                        calculation: {
                            start: parsed.toString(),
                            end: endDate.toString(),
                            duration: difference.toString()
                        }
                    }
                }
            }
            default:
                return yield* Effect.fail(new CalculationError(`Unsupported calculation type: ${type}`, {
                    toolId: dateTimeTool.id
                }))
        }
    }).pipe(
        Effect.mapError((e): CalculationError | ParseError =>
            e instanceof CalculationError || e instanceof ParseError || e instanceof MissingParameterError ? e :
                new CalculationError("Unexpected calculation error", { cause: e instanceof Error ? e : new Error(String(e)) })
        )
    ) as Effect.Effect<DateTimeOutput, CalculationError | ParseError>
}

function validateZonedDateTime(value: string): Effect.Effect<boolean, ValidationError> {
    return Effect.try(() => {
        Temporal.ZonedDateTime.from(value)
        return true
    }).pipe(
        Effect.mapError(() => new ValidationError("Invalid zoned date time format", {
            toolId: dateTimeTool.id
        }))
    )
}

function validatePlainDateTime(value: string): Effect.Effect<boolean, ValidationError> {
    return Effect.try(() => {
        Temporal.PlainDateTime.from(value)
        return true
    }).pipe(
        Effect.mapError(() => new ValidationError("Invalid plain date time format", {
            toolId: dateTimeTool.id
        }))
    )
}

function handleValidate(
    input: DateTimeInput,
    log: any
): Effect.Effect<DateTimeOutput, ValidationError> {
    return validateZonedDateTime(input.value).pipe(
        Effect.orElse(() => validatePlainDateTime(input.value)),
        Effect.map(isValid => ({
            result: isValid,
            details: {
                parsed: input.value
            }
        }))
    )
} 