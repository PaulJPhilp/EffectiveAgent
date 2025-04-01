import { Cause, Effect, Layer, LogLevel } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { LoggingError } from "../errors/logging-error.js";
import { LoggingServiceLiveLayer } from "../logging-service.js";
import { ILoggingService, LoggingService } from "../types/index.js";
import type { Logger } from "../types/logger.js";

// 1. Mock EffectLogger Implementation
const mockEffectLogs: any[] = [] // Array to store log calls

// 2. Create Mock LoggingService Implementation
const mockLogger: Logger = {
    log: (level: LogLevel.LogLevel, message: unknown, options?: any) => Effect.sync(() => {
        mockEffectLogs.push({ level, message, ...options })
    }),
    debug: (message: unknown, options?: any) => Effect.sync(() => {
        mockEffectLogs.push({ level: LogLevel.Debug, message, ...options })
    }),
    info: (message: unknown, options?: any) => Effect.sync(() => {
        mockEffectLogs.push({ level: LogLevel.Info, message, ...options })
    }),
    warn: (message: unknown, options?: any) => Effect.sync(() => {
        mockEffectLogs.push({ level: LogLevel.Warning, message, ...options })
    }),
    error: (message: unknown, options?: any) => Effect.sync(() => {
        mockEffectLogs.push({ level: LogLevel.Error, message, ...options })
    })
}

const mockLoggingService: ILoggingService = {
    getLogger: () => Effect.succeed(mockLogger)
}

// Create Test Layer providing the mock LoggingService implementation
const TestLoggerLayer = Layer.succeed(LoggingService, mockLoggingService)

describe("LoggingServiceLive", () => {
    let loggingService: ILoggingService

    beforeEach(async () => {
        mockEffectLogs.length = 0
        // Get the service from the layer
        const program = Effect.gen(function* (_) {
            const service = yield* _(LoggingService)
            return service
        })
        loggingService = (await Effect.runPromise(Effect.provide(program, LoggingServiceLiveLayer))) as ILoggingService
    })

    describe("getLogger", () => {
        it("should return a logger instance", async () => {
            const getLoggerEffect = loggingService.getLogger("TestScope")
            const logger = await Effect.runPromise(getLoggerEffect) as Logger

            expect(logger).toBeDefined()
            expect(logger.log).toBeInstanceOf(Function)
            expect(logger.info).toBeInstanceOf(Function)
            expect(logger.debug).toBeInstanceOf(Function)
            expect(logger.warn).toBeInstanceOf(Function)
            expect(logger.error).toBeInstanceOf(Function)
        })

        it("should return a logger without scope when no name is provided", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger())
            const logEffect = logger.info("Test message")

            await Effect.runPromise(logEffect.pipe(Effect.provide(TestLoggerLayer)))

            expect(mockEffectLogs[0]).not.toHaveProperty("annotations.scope")
        })
    })

    describe("log levels", () => {
        it("should log at all levels with correct level assignment", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger("TestScope"))
            const levels = [
                { method: "debug", level: LogLevel.Debug },
                { method: "info", level: LogLevel.Info },
                { method: "warn", level: LogLevel.Warning },
                { method: "error", level: LogLevel.Error }
            ]

            for (const { method, level } of levels) {
                await Effect.runPromise(
                    (logger[method] as Function)(`${method} message test`).pipe(
                        Effect.provide(TestLoggerLayer)
                    )
                )
            }

            expect(mockEffectLogs).toHaveLength(4)
            levels.forEach(({ level }, index) => {
                expect(mockEffectLogs[index].level).toBe(level)
            })
        })

        it("should handle direct log method calls with level parameter", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger("TestScope"))
            const message = "Direct log test"

            await Effect.runPromise(
                logger.log(LogLevel.Info, message).pipe(
                    Effect.provide(TestLoggerLayer)
                )
            )

            expect(mockEffectLogs).toHaveLength(1)
            expect(mockEffectLogs[0]).toEqual(
                expect.objectContaining({
                    level: LogLevel.Info,
                    message,
                    annotations: { scope: "TestScope" }
                })
            )
        })
    })

    describe("annotations and metadata", () => {
        it("should include scope in annotations when provided", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger("TestScope"))
            const message = "Test with scope"

            await Effect.runPromise(
                logger.info(message).pipe(Effect.provide(TestLoggerLayer))
            )

            expect(mockEffectLogs[0].annotations).toEqual(
                expect.objectContaining({ scope: "TestScope" })
            )
        })

        it("should merge custom annotations with scope", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger("TestScope"))
            const message = "Test with custom annotations"
            const customAnnotations = { requestId: "123", userId: "456" }

            await Effect.runPromise(
                logger.info(message, { annotations: customAnnotations }).pipe(
                    Effect.provide(TestLoggerLayer)
                )
            )

            expect(mockEffectLogs[0].annotations).toEqual(
                expect.objectContaining({
                    scope: "TestScope",
                    ...customAnnotations
                })
            )
        })
    })

    describe("error handling", () => {
        it("should properly handle error logging with cause", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger("ErrorScope"))
            const message = "Error message test"
            const error = new Error("Test Error Cause")
            const cause = Cause.die(error)

            await Effect.runPromise(
                logger.error(message, { cause }).pipe(Effect.provide(TestLoggerLayer))
            )

            expect(mockEffectLogs[0]).toEqual(
                expect.objectContaining({
                    level: LogLevel.Error,
                    message,
                    cause,
                    annotations: expect.objectContaining({ scope: "ErrorScope" })
                })
            )
        })

        it("should handle logging service specific errors", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger("ErrorScope"))
            const loggingError = new LoggingError("Test logging error")
            const cause = Cause.die(loggingError)

            await Effect.runPromise(
                logger.error("Error occurred", {
                    cause,
                    annotations: { errorType: "LoggingError" }
                }).pipe(Effect.provide(TestLoggerLayer))
            )

            expect(mockEffectLogs[0]).toEqual(
                expect.objectContaining({
                    level: LogLevel.Error,
                    cause,
                    annotations: expect.objectContaining({
                        scope: "ErrorScope",
                        errorType: "LoggingError"
                    })
                })
            )
        })

        it("should handle complex error objects with nested causes", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger("ErrorScope"))
            const innerError = new Error("Inner error")
            const outerError = new LoggingError("Outer error", { cause: innerError })
            const cause = Cause.die(outerError)

            await Effect.runPromise(
                logger.error("Complex error", {
                    cause,
                    annotations: { errorType: "ComplexError" }
                }).pipe(Effect.provide(TestLoggerLayer))
            )

            expect(mockEffectLogs[0]).toEqual(
                expect.objectContaining({
                    level: LogLevel.Error,
                    cause,
                    annotations: expect.objectContaining({
                        scope: "ErrorScope",
                        errorType: "ComplexError"
                    })
                })
            )
            // Verify the nested error structure
            expect(outerError).toHaveProperty("cause", innerError)
        })
    })
}) 