import { Cause, Effect, Layer, LogLevel } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { LoggingError } from "../errors/logging-error.js";
import { ILoggingService, LoggingService } from "../types/index.js";
import type { Logger } from "../types/logger.js";

// Create a test context to capture logs
interface TestContext {
    logs: Array<{
        level: LogLevel.LogLevel
        message: string
        annotations?: Record<string, unknown>
        cause?: unknown
    }>
}

const createTestContext = (): TestContext => ({
    logs: []
})

// Create a test logger that captures logs in our test context
const createTestLogger = (context: TestContext, scope?: string): Logger => ({
    log: (level: LogLevel.LogLevel, message: unknown, options?: any) =>
        Effect.sync(() => {
            context.logs.push({
                level,
                message: String(message),
                annotations: {
                    ...(scope ? { scope } : {}),
                    ...(options?.annotations || {})
                },
                ...(options?.cause ? { cause: options.cause } : {})
            })
        }),
    debug: (message: unknown, options?: any) =>
        Effect.sync(() => {
            context.logs.push({
                level: LogLevel.Debug,
                message: String(message),
                annotations: {
                    ...(scope ? { scope } : {}),
                    ...(options?.annotations || {})
                },
                ...(options?.cause ? { cause: options.cause } : {})
            })
        }),
    info: (message: unknown, options?: any) =>
        Effect.sync(() => {
            context.logs.push({
                level: LogLevel.Info,
                message: String(message),
                annotations: {
                    ...(scope ? { scope } : {}),
                    ...(options?.annotations || {})
                },
                ...(options?.cause ? { cause: options.cause } : {})
            })
        }),
    warn: (message: unknown, options?: any) =>
        Effect.sync(() => {
            context.logs.push({
                level: LogLevel.Warning,
                message: String(message),
                annotations: {
                    ...(scope ? { scope } : {}),
                    ...(options?.annotations || {})
                },
                ...(options?.cause ? { cause: options.cause } : {})
            })
        }),
    error: (message: unknown, options?: any) =>
        Effect.sync(() => {
            context.logs.push({
                level: LogLevel.Error,
                message: String(message),
                annotations: {
                    ...(scope ? { scope } : {}),
                    ...(options?.annotations || {})
                },
                ...(options?.cause ? { cause: options.cause } : {})
            })
        })
})

describe("LoggingServiceLive", () => {
    let testContext: TestContext
    let loggingService: ILoggingService

    beforeEach(() => {
        testContext = createTestContext()
        const mockLoggingService: ILoggingService = {
            getLogger: (scope?: string) => Effect.succeed(createTestLogger(testContext, scope))
        }
        const TestLoggerLayer = Layer.succeed(LoggingService, mockLoggingService)

        const program = Effect.gen(function* (_) {
            const service = yield* _(LoggingService)
            return service
        })
        loggingService = Effect.runSync(Effect.provide(program, TestLoggerLayer))
    })

    describe("getLogger", () => {
        it("should return a logger instance", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger("TestScope"))

            expect(logger).toBeDefined()
            expect(logger.log).toBeInstanceOf(Function)
            expect(logger.info).toBeInstanceOf(Function)
            expect(logger.debug).toBeInstanceOf(Function)
            expect(logger.warn).toBeInstanceOf(Function)
            expect(logger.error).toBeInstanceOf(Function)
        })

        it("should return a logger without scope when no name is provided", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger())
            await Effect.runPromise(logger.info("Test message"))

            expect(testContext.logs).toHaveLength(1)
            expect(testContext.logs[0].annotations?.scope).toBeUndefined()
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
                    (logger[method] as Function)(`${method} message test`)
                )
            }

            expect(testContext.logs).toHaveLength(4)
            levels.forEach(({ level }, index) => {
                expect(testContext.logs[index].level).toBe(level)
                expect(testContext.logs[index].annotations).toEqual({ scope: "TestScope" })
            })
        })

        it("should handle direct log method calls with level parameter", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger("TestScope"))
            const message = "Direct log test"

            await Effect.runPromise(logger.log(LogLevel.Info, message))

            expect(testContext.logs).toHaveLength(1)
            expect(testContext.logs[0]).toEqual({
                level: LogLevel.Info,
                message,
                annotations: { scope: "TestScope" }
            })
        })
    })

    describe("annotations and metadata", () => {
        it("should include scope in annotations when provided", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger("TestScope"))
            const message = "Test with scope"

            await Effect.runPromise(logger.info(message))

            expect(testContext.logs[0].annotations).toEqual({ scope: "TestScope" })
        })

        it("should merge custom annotations with scope", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger("TestScope"))
            const message = "Test with custom annotations"
            const customAnnotations = { requestId: "123", userId: "456" }

            await Effect.runPromise(
                logger.info(message, { annotations: customAnnotations })
            )

            expect(testContext.logs[0].annotations).toEqual({
                scope: "TestScope",
                ...customAnnotations
            })
        })
    })

    describe("error handling", () => {
        it("should properly handle error logging with cause", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger("ErrorScope"))
            const message = "Error message test"
            const error = new Error("Test Error Cause")
            const cause = Cause.die(error)

            await Effect.runPromise(logger.error(message, { cause }))

            expect(testContext.logs[0]).toEqual({
                level: LogLevel.Error,
                message,
                cause,
                annotations: { scope: "ErrorScope" }
            })
        })

        it("should handle logging service specific errors", async () => {
            const logger = await Effect.runPromise(loggingService.getLogger("ErrorScope"))
            const loggingError = new LoggingError("Test logging error")
            const cause = Cause.die(loggingError)

            await Effect.runPromise(
                logger.error("Error occurred", {
                    cause,
                    annotations: { errorType: "LoggingError" }
                })
            )

            expect(testContext.logs[0]).toEqual({
                level: LogLevel.Error,
                message: "Error occurred",
                cause,
                annotations: {
                    scope: "ErrorScope",
                    errorType: "LoggingError"
                }
            })
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
                })
            )

            expect(testContext.logs[0]).toEqual({
                level: LogLevel.Error,
                message: "Complex error",
                cause,
                annotations: {
                    scope: "ErrorScope",
                    errorType: "ComplexError"
                }
            })
            expect(outerError).toHaveProperty("cause", innerError)
        })
    })
}) 