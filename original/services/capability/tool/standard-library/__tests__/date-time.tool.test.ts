import { Cause, Effect, Exit, Option } from "effect"
import { describe, expect, it } from "vitest"
import { ConfigurationService } from "../../../configuration/configuration-service.js"
import type { ILoggingService } from "../../../logging/types/index.js"
import type { Logger } from "../../../logging/types/logger.js"
import { dateTimeTool } from "../date-time.tool.js"
import { CalculationError, ConversionError, FormatError, MissingParameterError, ParseError, UnsupportedOperationError, ValidationError } from "../errors/date-time-error.js"
import { CalculationType, type DateTimeInput, DateTimeOperation } from "../types/date-time.types.js"

// Mock services
const mockLogger: Logger = {
    debug: () => Effect.succeed(undefined),
    info: () => Effect.succeed(undefined),
    warn: () => Effect.succeed(undefined),
    error: () => Effect.succeed(undefined),
    log: () => Effect.succeed(undefined)
}

const mockLoggingService: ILoggingService = {
    getLogger: () => Effect.succeed(mockLogger)
}

const mockConfigurationService = new ConfigurationService()

const context = {
    loggingService: mockLoggingService,
    configurationService: mockConfigurationService
}

describe("DateTimeTool", () => {
    describe("PARSE operation", () => {
        it("should parse ISO date string", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.PARSE,
                value: "2024-03-15T14:30:00[UTC]"
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isSuccess(result)).toBe(true)
            if (Exit.isSuccess(result)) {
                expect(typeof result.value.result).toBe("string")
            }
        })

        it("should parse plain date-time string", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.PARSE,
                value: "2024-03-15 14:30:00"
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isSuccess(result)).toBe(true)
            if (Exit.isSuccess(result)) {
                expect(typeof result.value.result).toBe("string")
            }
        })

        it("should fail with invalid date string", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.PARSE,
                value: "invalid date"
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const failure = Option.getOrNull(Cause.failureOption(result.cause))
                expect(failure).toBeInstanceOf(ParseError)
            }
        })
    })

    describe("FORMAT operation", () => {
        it("should format to ISO", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.FORMAT,
                value: "2024-03-15T14:30:00[UTC]",
                params: {
                    to: "iso"
                }
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isSuccess(result)).toBe(true)
            if (Exit.isSuccess(result)) {
                expect(typeof result.value.result).toBe("string")
            }
        })

        it("should format to RFC", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.FORMAT,
                value: "2024-03-15T14:30:00[UTC]",
                params: {
                    to: "rfc"
                }
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isSuccess(result)).toBe(true)
            if (Exit.isSuccess(result)) {
                expect(typeof result.value.result).toBe("string")
            }
        })

        it("should fail with invalid format type", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.FORMAT,
                value: "2024-03-15T14:30:00[UTC]",
                params: {
                    pattern: "invalid"
                }
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const failure = Option.getOrNull(Cause.failureOption(result.cause))
                expect(failure).toBeInstanceOf(FormatError)
            }
        })
    })

    describe("CONVERT operation", () => {
        it("should convert between time zones", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.CONVERT,
                value: "2024-03-15T14:30:00[UTC]",
                params: {
                    from: "UTC",
                    to: "America/New_York"
                }
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isSuccess(result)).toBe(true)
            if (Exit.isSuccess(result)) {
                expect(typeof result.value.result).toBe("string")
            }
        })

        it("should fail with non-zoned datetime", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.CONVERT,
                value: "2024-03-15T14:30:00",
                params: {
                    from: "UTC",
                    to: "America/New_York"
                }
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const failure = Option.getOrNull(Cause.failureOption(result.cause))
                expect(failure).toBeInstanceOf(ConversionError)
            }
        })

        it("should fail with invalid time zone", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.CONVERT,
                value: "2024-03-15T14:30:00[UTC]",
                params: {
                    from: "UTC",
                    to: "Invalid/TimeZone"
                }
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const failure = Option.getOrNull(Cause.failureOption(result.cause))
                expect(failure).toBeInstanceOf(ConversionError)
            }
        })
    })

    describe("CALCULATE operation", () => {
        it("should add duration", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.CALCULATE,
                value: "2024-03-15T14:30:00[UTC]",
                params: {
                    calculation: {
                        type: CalculationType.ADD,
                        amount: 1,
                        unit: "days"
                    }
                }
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isSuccess(result)).toBe(true)
            if (Exit.isSuccess(result)) {
                expect(typeof result.value.result).toBe("string")
            }
        })

        it("should calculate difference between dates", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.CALCULATE,
                value: "2024-03-15T14:30:00[UTC]",
                params: {
                    calculation: {
                        type: CalculationType.DIFFERENCE,
                        to: "2024-03-16T14:30:00[UTC]"
                    }
                }
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isSuccess(result)).toBe(true)
            if (Exit.isSuccess(result)) {
                expect(typeof result.value.result).toBe("string")
            }
        })

        it("should fail with invalid calculation type", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.CALCULATE,
                value: "2024-03-15T14:30:00[UTC]",
                params: {
                    calculation: {
                        type: "invalid" as any
                    }
                }
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const failure = Option.getOrNull(Cause.failureOption(result.cause))
                expect(failure).toBeInstanceOf(CalculationError)
            }
        })
    })

    describe("VALIDATE operation", () => {
        it("should validate correct date string", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.VALIDATE,
                value: "2024-03-15T14:30:00[UTC]"
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isSuccess(result)).toBe(true)
            if (Exit.isSuccess(result)) {
                expect(result.value.result).toBe(true)
            }
        })

        it("should fail with incorrect date string", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.VALIDATE,
                value: "2024-02-30T14:30:00[UTC]"
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const failure = Option.getOrNull(Cause.failureOption(result.cause))
                expect(failure).toBeInstanceOf(ValidationError)
            }
        })
    })

    describe("Error handling", () => {
        it("should handle unsupported operations", async () => {
            const input: DateTimeInput = {
                operation: "invalid" as any,
                value: "2024-03-15T14:30:00[UTC]"
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const failure = Option.getOrNull(Cause.failureOption(result.cause))
                expect(failure).toBeInstanceOf(UnsupportedOperationError)
            }
        })

        it("should handle missing required parameters", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.CONVERT,
                value: "2024-03-15T14:30:00[UTC]"
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const failure = Option.getOrNull(Cause.failureOption(result.cause))
                expect(failure).toBeInstanceOf(MissingParameterError)
            }
        })

        it("should handle calculation without parameters", async () => {
            const input: DateTimeInput = {
                operation: DateTimeOperation.CALCULATE,
                value: "2024-03-15T14:30:00[UTC]"
            }

            const result = await Effect.runPromiseExit(
                dateTimeTool.execute(input, context)
            )

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const failure = Option.getOrNull(Cause.failureOption(result.cause))
                expect(failure).toBeInstanceOf(MissingParameterError)
            }
        })
    })
})