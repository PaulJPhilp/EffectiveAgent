/**
 * @file Live implementation of the LoggingApi service using Effect's Console logger.
 */

import type { JsonObject } from "@/types.js"; // Use path alias
import { LoggingApi } from "@core/logging/types.js"; // Use path alias
import { Cause, Effect, Layer, LogLevel, Logger, Option } from "effect";

// --- Implementation Factory ---

/**
 * Factory function for creating the LoggingApi service implementation.
 * This implementation uses the default Effect logger.
 */
export const make = () => {
    // Use Effect.log directly with options for the generic log method
    const log = (
        level: LogLevel.LogLevel,
        message: string,
        data?: JsonObject,
    ): Effect.Effect<void> => {
        const options = { logLevel: Option.some(level) };
        if (data) {
            return Effect.log(options, message, data);
        } else {
            return Effect.log(options, message);
        }
    };

    // Use specific log level functions for direct methods
    const debug = (
        message: string,
        data?: JsonObject,
    ): Effect.Effect<void> => {
        if (data) {
            return Effect.logDebug(message, data);
        } else {
            return Effect.logDebug(message);
        }
    };

    const info = (message: string, data?: JsonObject): Effect.Effect<void> => {
        if (data) {
            return Effect.logInfo(message, data);
        } else {
            return Effect.logInfo(message);
        }
    };

    const warn = (message: string, data?: JsonObject): Effect.Effect<void> => {
        if (data) {
            return Effect.logWarning(message, data);
        } else {
            return Effect.logWarning(message);
        }
    };

    const error = (
        message: string,
        data?: JsonObject | Error,
    ): Effect.Effect<void> => {
        if (data instanceof Error) {
            return Effect.logError(message, Cause.die(data));
        } else if (data) {
            return Effect.logError(message, data);
        } else {
            return Effect.logError(message);
        }
    };

    const trace = (
        message: string,
        data?: JsonObject,
    ): Effect.Effect<void> => {
        if (data) {
            return Effect.logTrace(message, data);
        } else {
            return Effect.logTrace(message);
        }
    };

    // Log Cause directly using Effect.log with level option
    const logCause = (
        level: LogLevel.LogLevel,
        cause: Cause.Cause<unknown>,
    ): Effect.Effect<void> => {
        const options = { logLevel: Option.some(level), cause: Option.some(cause) };
        return Effect.log(options, "Logging Cause");
    };

    // Shortcut for logging error cause
    const logErrorCause = (
        cause: Cause.Cause<unknown>,
    ): Effect.Effect<void> => {
        return Effect.logError("Logging Error Cause:", cause);
    };

    // Return the service implementation object
    return {
        log,
        debug,
        info,
        warn,
        error,
        trace,
        logCause,
        logErrorCause,
    };
};

// --- Layer Definition ---

/**
 * Live Layer for the LoggingApi service.
 * Provides the default logging implementation.
 */
export const LoggingApiLiveLayer: Layer.Layer<LoggingApi> = Layer.succeed(
    LoggingApi, // The Tag
    make(), // The implementation instance created by the factory
);

/**
 * Layer that sets the minimum log level for the default logger.
 * Can be composed with other layers using Layer.provideMerge or Layer.provide.
 * @param level The minimum LogLevel to output.
 */
export const LoggingLevelLayer = (
    level: LogLevel.LogLevel,
): Layer.Layer<never, never, never> => Logger.minimumLogLevel(level);
