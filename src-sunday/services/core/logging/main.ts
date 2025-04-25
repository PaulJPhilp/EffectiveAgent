/**
 * @file Live implementation of the LoggingApi service using Effect's Console logger.
 */

import { Cause, Console, Effect, Layer, LogLevel, Logger, Option } from "effect"; // Added Option
import type { JsonObject } from "../../types.js";
import { LoggingApi } from "./types.js"; // Import Tag/Interface
// Import LoggingError if needed for specific error handling

// --- Live Implementation ---

class LoggingApiLive implements LoggingApi {

    // Use Effect.log directly with options for the generic log method
    log = (level: LogLevel.LogLevel, message: string, data?: JsonObject): Effect.Effect<void> => {
        // Effect.log accepts an options object as the first argument (optional)
        // or the message directly. We pass data as the second argument.
        // The level is specified in the options.
        const options = { logLevel: Option.some(level) }; // Use Option.some for optional level
        if (data) {
            // Pass options object first, then message, then data
            return Effect.log(options, message, data);
        } else {
            return Effect.log(options, message);
        }
    };

    // Use specific log level functions for direct methods
    debug = (message: string, data?: JsonObject): Effect.Effect<void> => {
        if (data) {
            return Effect.logDebug(message, data);
        } else {
            return Effect.logDebug(message);
        }
    };

    info = (message: string, data?: JsonObject): Effect.Effect<void> => {
        if (data) {
            return Effect.logInfo(message, data);
        } else {
            return Effect.logInfo(message);
        }
    };

    warn = (message: string, data?: JsonObject): Effect.Effect<void> => {
        if (data) {
            return Effect.logWarning(message, data);
        } else {
            return Effect.logWarning(message);
        }
    };

    error = (message: string, data?: JsonObject | Error): Effect.Effect<void> => {
        if (data instanceof Error) {
            // Log the error message and the cause separately for clarity
            return Effect.logError(message, Cause.die(data));
        } else if (data) {
            return Effect.logError(message, data);
        } else {
            return Effect.logError(message);
        }
    };

    trace = (message: string, data?: JsonObject): Effect.Effect<void> => {
        if (data) {
            return Effect.logTrace(message, data);
        } else {
            return Effect.logTrace(message);
        }
    };

    // Log Cause directly using Effect.log with level option
    logCause = (level: LogLevel.LogLevel, cause: Cause.Cause<unknown>): Effect.Effect<void> => {
        const options = { logLevel: Option.some(level), cause: Option.some(cause) };
        // Log a generic message and include the cause in options
        return Effect.log(options, "Logging Cause");
    };

    // Shortcut for logging error cause
    logErrorCause = (cause: Cause.Cause<unknown>): Effect.Effect<void> => {
        // Effect.logError can directly take a Cause
        return Effect.logError("Logging Error Cause:", cause);
    };
}

// --- Layer Definition ---

/**
 * Live Layer for the LoggingApi service.
 * This basic version uses the default Effect logger (usually Console).
 * No external requirements (R = never).
 */
export const LoggingApiLiveLayer: Layer.Layer<LoggingApi> = Layer.succeed(
    LoggingApi, // The Tag
    new LoggingApiLive() // The implementation instance
);

/**
 * Layer that sets the minimum log level for the default logger.
 * Can be composed with other layers using Layer.provideMerge or Layer.provide.
 * @param level The minimum LogLevel to output.
 */
export const LoggingLevelLayer = (level: LogLevel.LogLevel): Layer.Layer<never, never, never> => // Returns Layer<never> as it modifies context
    Logger.minimumLogLevel(level);

// Example Usage:
// const myAppLayer = Layer.provideMerge(SomeServiceLayer, LoggingApiLiveLayer)
//                    .pipe(Layer.provide(LoggingLevelLayer(LogLevel.Debug))) // Provide level setting layer
