import * as NodePath from "node:path"
import { Effect, Layer, LogLevel } from "effect"
import type { LoggingServiceApi } from "../../services/core/logging/api.js"
import { FileLogger } from "../../services/core/logging/file-logger.js"

// Define the logging service using Effect.Service pattern
export class LoggingService extends Effect.Service<LoggingServiceApi>()("LoggingService", {
    effect: Effect.gen(function* () {
        // Create and initialize file logger
        const fileLogger = new FileLogger({
            logDir: NodePath.join(process.cwd(), "logs"),
            logFileBaseName: "service-app",
            maxFileSize: 10 * 1024 * 1024,
            maxBackups: 5,
            minLogLevel: LogLevel.Debug
        })

        // Initialize the logger
        yield* fileLogger.initialize()

        // Get the logging service implementation
        const loggingService = fileLogger.createLoggingService()

        // Clean up when the service is shutdown
        yield* Effect.addFinalizer(() => fileLogger.close())

        return loggingService
    })
})

// Example usage in an application
const program = Effect.gen(function* () {
    // Access the logging service
    const logger = yield* LoggingService

    // Use the logger in your application
    yield* logger.info("Application starting", {
        environment: "production",
        version: "1.0.0"
    })

    try {
        // Simulate some work
        yield* Effect.fail(new Error("Database connection failed"))
    } catch (error) {
        yield* logger.error("Failed to start application", error as Error)
    }
})

// Create a layer for your application
const AppLayer = Layer.provide(
    LoggingService,
    Layer.succeed(
        Effect.ServiceId<{ name: string }>("AppConfig"),
        { name: "MyApp" }
    )
)

// Run the program with the layer
Effect.runPromise(
    program.pipe(
        Effect.provide(AppLayer)
    )
).catch(console.error) 