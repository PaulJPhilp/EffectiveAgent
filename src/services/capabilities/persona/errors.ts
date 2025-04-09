/**
 * @file Defines specific errors for the Persona capability service.
 * @module services/capabilities/persona/errors
 */

import { Data } from "effect";
// Correct import path for ParseError
import type { ParseError } from "effect/ParseResult";

export class PersonaConfigError extends Data.TaggedError("PersonaConfigError")<{
	readonly message: string;
	readonly cause: ParseError; // Type should now resolve correctly
}> { }
