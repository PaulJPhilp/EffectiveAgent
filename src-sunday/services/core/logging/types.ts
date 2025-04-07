/**
 * @file Defines the interface and Tag for the Logging service.
 */

import { Context, Effect, LogLevel } from "effect";
import type { JsonObject } from "../../types.js"; // Import global JsonObject
import { Cause } from "effect/Cause";

// Define LogLevel type based on Effect's LogLevel if needed, or use it directly
export type { LogLevel } from "effect";

/** Service interface for logging messages and structured data. */
export interface LoggingApi {
    // Log methods accepting a message and optional structured context
    readonly log: (level: LogLevel.LogLevel, message: string, data?: JsonObject) => Effect.Effect<void>;
    readonly debug: (message: string, data?: JsonObject) => Effect.Effect<void>;
    readonly info: (message: string, data?: JsonObject) => Effect.Effect<void>;
    readonly warn: (message: string, data?: JsonObject) => Effect.Effect<void>;
    readonly error: (message: string, data?: JsonObject | Error) => Effect.Effect<void>; // Allow passing Error directly
    readonly trace: (message: string, data?: JsonObject) => Effect.Effect<void>;

    // Log methods accepting any data type (less structured)
    // readonly logData: (level: LogLevel.LogLevel, ...data: unknown[]) => Effect.Effect<void>;

    // Method to log an Effect's Cause directly
    readonly logCause: (level: LogLevel.LogLevel, cause: Cause<unknown>) => Effect.Effect<void>;
    readonly logErrorCause: (cause: Cause<unknown>) => Effect.Effect<void>; // Shortcut for error level
}

/** Tag for the LoggingApi service. */
export const LoggingApi = Context.GenericTag<LoggingApi>("LoggingApi");
