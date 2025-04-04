import { type Cause, type Effect, type FiberId, type LogLevel } from "effect"

/**
 * Interface for a logger instance used within the application.
 * Modeled after Effect's Logger, allowing for structured logging.
 */
export interface Logger {
    readonly log: (
        level: LogLevel.LogLevel,
        message: unknown,
        options?: {
            readonly cause?: Cause.Cause<unknown>
            readonly annotations?: Record<string, unknown>
            readonly spans?: ReadonlyArray<string>
            readonly context?: Record<string, unknown>
            readonly timestamp?: Date
            readonly fiberId?: FiberId.FiberId
        }
    ) => Effect.Effect<void>

    // Convenience methods
    readonly debug: (
        message: unknown,
        options?: Omit<Parameters<Logger["log"]>[2], "cause"> // Exclude cause for simple methods
    ) => Effect.Effect<void>
    readonly info: (
        message: unknown,
        options?: Omit<Parameters<Logger["log"]>[2], "cause">
    ) => Effect.Effect<void>
    readonly warn: (
        message: unknown,
        options?: Parameters<Logger["log"]>[2]
    ) => Effect.Effect<void>
    readonly error: (
        message: unknown,
        options?: Parameters<Logger["log"]>[2]
    ) => Effect.Effect<void>
} 