import { Effect, LogLevel } from "effect"
import * as NodePath from "node:path"
import { FileLogger } from "../../services/core/logging/file-logger.js"

// Create a simple program that demonstrates FileLogger usage
const program = Effect.gen(function* () {
    // Create the logger with a specific configuration
    const logger = new FileLogger({
        logDir: NodePath.join(process.cwd(), "logs"),
        logFileBaseName: "app",
        maxFileSize: 5 * 1024 * 1024, // 5MB
        maxBackups: 3,
        minLogLevel: LogLevel.Debug
    })

    // Initialize the logger (this creates the directory and log file)
    yield* logger.initialize()

    try {
        // Get the logging interface
        const loggingService = logger.createLoggingService().withContext({ service: "WorkingExample" })

        // Log some messages
        yield* loggingService.info("Application started", {
            timestamp: new Date().toISOString()
        })

        yield* loggingService.debug("Configuration loaded", {
            config: {
                environment: "development",
                port: 3000
            }
        })

        // Simulate some application work
        yield* Effect.promise(() => Promise.resolve("Some data"))
        yield* loggingService.info("Data processed successfully")

        // Simulate an error
        try {
            throw new Error("Database connection failed")
        } catch (error) {
            yield* loggingService.error(
                "Failed to connect to database",
                error as Error
            )
        }

    } finally {
        // Always close the logger to ensure proper cleanup
        yield* logger.close()
    }
})

// Run the program and handle any errors
Effect.runPromise(program)
    .then(() => console.log("Program completed successfully"))
    .catch(error => {
        console.error("Program failed:", error)
        process.exit(1)
    }) 