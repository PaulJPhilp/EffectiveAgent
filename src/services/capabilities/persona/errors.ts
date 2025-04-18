/**
 * @file Defines specific errors for the Persona capability service.
 * @module services/capabilities/persona/errors
 */

import { EntityParseError } from "@/services/core/errors.js";
import { Data } from "effect";
// Correct import path for ParseError

export class PersonaConfigError extends Data.TaggedError("PersonaConfigError")<{
	readonly message: string;
	readonly cause: EntityParseError; // Type should now resolve correctly
}> { }
