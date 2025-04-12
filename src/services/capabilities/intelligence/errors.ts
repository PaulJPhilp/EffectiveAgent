/**
 * @file Defines specific errors for the Intelligence capability service.
 * @module services/capabilities/intelligence/errors
 */

import { Data } from "effect";
// Correct import path for ParseError
import type { ParseError } from "effect/ParseResult";

/**
 * Represents an error occurring during the validation or update
 * of an Intelligence definition against its schema.
 */
export class IntelligenceConfigError extends Data.TaggedError(
	"IntelligenceConfigError",
)<{
	readonly message: string;
	/** The underlying error (could be loading, parsing, etc.). */
	readonly cause: unknown;
}> { }
