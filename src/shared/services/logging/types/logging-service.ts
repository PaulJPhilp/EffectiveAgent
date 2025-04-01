import { Context, type Effect } from "effect"
import { type Logger } from "./logger.js"

/**
 * Defines the contract for the LoggingService.
 */
export interface ILoggingService {
    /**
     * Retrieves a logger instance, potentially scoped by a name or context.
     * @param name - An optional name to associate with the logger (e.g., service name, module name).
     * @returns An Effect that resolves with a Logger instance.
     */
    readonly getLogger: (name?: string) => Effect.Effect<Logger>
}

/**
 * The Effect Context Tag for the LoggingService.
 */
export class LoggingService extends Context.Tag("LoggingService")<ILoggingService, ILoggingService>() { } 