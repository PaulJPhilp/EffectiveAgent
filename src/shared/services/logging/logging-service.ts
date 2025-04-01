import { Effect, Layer, LogLevel } from "effect"
import { type Logger, ILoggingService, LoggingService } from "./types/index.js"

/**
 * Live implementation of the LoggingService.
 * Provides logger instances that adapt Effect's logging capabilities.
 */
// Ensure this class implements the *interface* defined by the LoggingService Tag
class LoggingServiceLive implements ILoggingService {

    // We don't need to store the base logger as a property, 
    // we can access the default logger via Effect context when needed,
    // or just use the static Logger functions directly.

    readonly getLogger = (name?: string): Effect.Effect<Logger> =>
        // We don't need to fetch a logger instance. Instead, we create
        // an adapter object whose methods use Effect.log directly, potentially
        // scoped using Effect.annotateLogs.
        Effect.sync(() => {
            // Helper to apply logging effect with optional scope annotation
            const logWithScope = (
                level: LogLevel.LogLevel,
                message: unknown,
                options?: Parameters<Logger["log"]>[2]
            ): Effect.Effect<void> => { // Return type is Effect<void>
                const effect = Effect.log(level, message, options)
                return name ? Effect.annotateLogs(effect, { scope: name }) : effect
            }

            const loggerAdapter: Logger = {
                // Use the log method directly from the (potentially scoped) logger instance
                log: (level, message, options) => logWithScope(level, message, options),

                // Convenience methods also call the log method on the instance
                debug: (message, options) =>
                    logWithScope(LogLevel.Debug, message, options),
                info: (message, options) =>
                    logWithScope(LogLevel.Info, message, options),
                warn: (message, options) =>
                    logWithScope(LogLevel.Warning, message, options),
                error: (message, options) =>
                    logWithScope(LogLevel.Error, message, options)
            }
            return loggerAdapter
        })
}

/**
 * Live Layer for the LoggingService.
 * Provides the LoggingServiceLive implementation.
 */
export const LoggingServiceLiveLayer = Layer.succeed(
    LoggingService, // The Tag
    new LoggingServiceLive() // Provide the implementation directly
) 