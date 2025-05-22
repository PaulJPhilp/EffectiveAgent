import { Effect, LogLevel } from "effect"
import * as NodePath from "node:path"
import { FileLogger } from "../../services/core/logging/file-logger.js"

// Create a basic example of using the file logger
const program = Effect.gen(function* () {
    // Initialize the logger with custom configuration
    const fileLogger = new FileLogger({
        logDir: NodePath.join(process.cwd(), "logs"),
        logFileBaseName: "my-app",
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxBackups: 5,
        minLogLevel: LogLevel.Debug
    })

    // Initialize the logger (creates directory and opens file)
    yield* fileLogger.initialize()

    // Get the logging service interface
    const logger = fileLogger.createLoggingService().withContext({ service: "BasicUsage" })

    // Log different types of messages
    yield* logger.info("Application started", { version: "1.0.0" })
    yield* logger.debug("Configuration loaded", { config: { port: 3000 } })

    try {
        throw new Error("Something went wrong")
    } catch (error) {
        yield* logger.error("Error in application", error as Error)
    }

    // Log a complex operation with cause
    const complexOperation = Effect.gen(function* () {
        yield* Effect.fail(new Error("Operation failed"))
    })

    yield* complexOperation.pipe(
        Effect.catchAll(cause =>
            logger.logErrorCause(cause)
        )
    )

    // Clean up
    yield* fileLogger.close()
})

// Run the program
Effect.runPromise(program).catch(console.error) 