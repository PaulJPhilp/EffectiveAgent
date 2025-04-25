import { Effect, Layer, LogLevel } from "effect"
import { ILoggingService, type Logger, LoggingService } from "./types/index.js"

/**
 * Live implementation of the LoggingService.
 * Provides logger instances that adapt Effect's logging capabilities.
 * 
 * This service provides a unified logging interface that:
 * - Supports multiple log levels (debug, info, warn, error)
 * - Allows scoped logging with annotations
 * - Integrates with Effect's logging system
 * - Handles structured logging with metadata
 * 
 * @implements {ILoggingService}
 */
class LoggingServiceLive implements ILoggingService {
    /**
     * Creates a logger instance that can be used for logging messages at different levels.
     * The logger adapts Effect's logging capabilities and provides a simplified interface.
     * 
     * @param {string} [name] - Optional name to scope the logger. When provided, all logs from this logger
     *                          will be annotated with this scope.
     * @returns {Effect.Effect<Logger>} An Effect that resolves to a Logger instance.
     * 
     * @example
     * ```typescript
     * const logger = await Effect.runPromise(loggingService.getLogger("MyService"))
     * await Effect.runPromise(logger.info("Service started"))
     * ```
     */
    readonly getLogger = (name?: string): Effect.Effect<Logger> =>
        // We don't need to fetch a logger instance. Instead, we create
        // an adapter object whose methods use Effect.log directly, potentially
        // scoped using Effect.annotateLogs.
        Effect.sync(() => {
            /**
             * Helper function to create a logging effect with optional scope annotation.
             * 
             * @param {LogLevel.LogLevel} level - The log level to use
             * @param {unknown} message - The message to log
             * @param {object} [options] - Additional options for the log entry
             * @param {Cause.Cause<unknown>} [options.cause] - Error cause if logging an error
             * @param {Record<string, unknown>} [options.annotations] - Additional annotations to include
             * @param {ReadonlyArray<string>} [options.spans] - Spans for tracing
             * @param {Record<string, unknown>} [options.context] - Additional context
             * @param {Date} [options.timestamp] - Custom timestamp
             * @param {FiberId.FiberId} [options.fiberId] - Fiber ID for async operations
             * @returns {Effect.Effect<void>} An Effect that performs the logging operation
             */
            const logWithScope = (
                level: LogLevel.LogLevel,
                message: unknown,
                options?: Parameters<Logger["log"]>[2]
            ): Effect.Effect<void> => { // Return type is Effect<void>
                const effect = Effect.log(level, message, options)
                return name ? Effect.annotateLogs(effect, { scope: name }) : effect
            }

            const loggerAdapter: Logger = {
                /**
                 * Log a message at a specific level with optional metadata.
                 */
                log: (level, message, options) => logWithScope(level, message, options),

                /**
                 * Log a debug message. Use for detailed information about application flow.
                 * @param {unknown} message - The message to log
                 * @param {object} [options] - Additional options (excluding cause)
                 */
                debug: (message, options) =>
                    logWithScope(LogLevel.Debug, message, options),

                /**
                 * Log an info message. Use for general information about application state.
                 * @param {unknown} message - The message to log
                 * @param {object} [options] - Additional options (excluding cause)
                 */
                info: (message, options) =>
                    logWithScope(LogLevel.Info, message, options),

                /**
                 * Log a warning message. Use for potentially harmful situations.
                 * @param {unknown} message - The message to log
                 * @param {object} [options] - Additional options including potential cause
                 */
                warn: (message, options) =>
                    logWithScope(LogLevel.Warning, message, options),

                /**
                 * Log an error message. Use for error conditions that affect functionality.
                 * @param {unknown} message - The message to log
                 * @param {object} [options] - Additional options including error cause
                 */
                error: (message, options) =>
                    logWithScope(LogLevel.Error, message, options)
            }
            return loggerAdapter
        })
}

/**
 * Live Layer for the LoggingService.
 * Provides the LoggingServiceLive implementation for dependency injection.
 * 
 * @example
 * ```typescript
 * const program = Effect.gen(function*(_) {
 *   const logger = yield* _(LoggingService).getLogger("MyService")
 *   yield* _(logger.info("Service initialized"))
 * })
 * 
 * await Effect.runPromise(
 *   Effect.provide(program, LoggingServiceLiveLayer)
 * )
 * ```
 */
export const LoggingServiceLiveLayer = Layer.succeed(
    LoggingService, // The Tag
    new LoggingServiceLive() // Provide the implementation directly
) 