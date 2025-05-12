/**
 * @file Types for the Logging service.
 */

import type { LogLevel } from "effect"

/** Type representing a JSON-serializable object */
export interface JsonObject {
    [key: string]: string | number | boolean | null | JsonObject | JsonObject[]
}

/** Type for structured error data */
export interface ErrorData {
    readonly message: string
    readonly stack?: string
    readonly code?: string
    readonly [key: string]: unknown
}

/** Configuration for the logging service */
export interface LoggerConfig {
    readonly minLevel?: LogLevel.LogLevel
    readonly prettyPrint?: boolean
    readonly includeTimestamp?: boolean
}

/** Type for log entry metadata */
export interface LogMetadata {
    readonly timestamp?: string
    readonly context?: Record<string, unknown>
    readonly span?: string
}

export type { LogLevel } from "effect"
