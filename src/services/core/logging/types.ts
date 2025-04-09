/**
 * @file Defines the type and Tag for the Logging service.
 * The LoggingApi type is derived from the implementation in live.ts.
 */

import type { JsonObject } from "@/types.js"; // Use path alias
import type { make } from "@core/logging/live.js"; // Use path alias
import { Cause, Context, Effect, LogLevel } from "effect";

/**
 * Service interface for logging messages and structured data.
 * Derived from the `make` function in `live.ts`.
 */
export type LoggingApi = ReturnType<typeof make>;

/** Tag for the LoggingApi service. */
export const LoggingApi = Context.GenericTag<LoggingApi>("LoggingApi");

// Re-export LogLevel for convenience
export type { LogLevel } from "effect";
