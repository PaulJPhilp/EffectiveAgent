/**
 * @file Defines specific error types for the EntityLoader service.
 */

import { Data } from "effect";

// Base interface for context shared by loader errors
interface LoaderErrorContext {
    readonly filePath: string; // The path that was attempted to be loaded
}

/** Error indicating the entity file could not be read (not found, permissions, etc.). */
export class EntityLoadError extends Data.TaggedError("EntityLoadError")<
    LoaderErrorContext & {
        readonly message?: string; // Optional specific message
        readonly cause?: unknown; // Original error cause
    }
> {
    // Optional: Include base AppError properties if needed for compatibility downstream
    // get errorType(): string { return "EntityLoadError"; }
    // get httpStatusCode(): number { return 500; }
}

/** Error indicating the entity file content could not be parsed (e.g., invalid JSON/YAML). */
export class EntityParseError extends Data.TaggedError("EntityParseError")<
    LoaderErrorContext & {
        readonly cause?: unknown; // Original parsing error
    }
> {
    // get errorType(): string { return "EntityParseError"; }
    // get httpStatusCode(): number { return 500; }
}

/** Error indicating the parsed entity failed schema validation. */
export class EntityValidationError extends Data.TaggedError(
    "EntityValidationError",
)<
    LoaderErrorContext & {
        readonly cause?: unknown; // Original validation error (e.g., ZodError, ParseError)
    }
> {
    // get errorType(): string { return "EntityValidationError"; }
    // get httpStatusCode(): number { return 500; }
}

// Type alias for any error the loader service can produce
export type LoaderError =
    | EntityLoadError
    | EntityParseError
    | EntityValidationError;
