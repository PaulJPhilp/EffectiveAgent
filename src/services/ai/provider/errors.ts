/**
 * @file Defines specific errors for the AI Provider configuration loading process.
 * @module services/ai/provider/errors
 */

import type {
    EntityLoadError,
    EntityParseError,
} from "@/services/core/loader/errors.js"; // Import loader error types
import type { ParseError } from "@effect/schema/ParseResult";
import { Data } from "effect";

/**
 * Represents an error occurring during the loading or parsing of the
 * provider definition file.
 */
export class ProviderConfigError extends Data.TaggedError("ProviderConfigError")<{
    readonly message: string;
    /** The underlying error (from loader or schema parsing). */
    readonly cause: EntityLoadError | EntityParseError ; // Corrected type union
}> { }
