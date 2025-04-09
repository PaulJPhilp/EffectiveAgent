/**
 * @file Implements the live Layer for the Persona capability service.
 * @module services/capabilities/persona/live
 */

import { Layer } from "effect";
// Correct import path for ParseError
import type { ParseError } from "effect/ParseResult";
import {
	makeCapabilityMake,
	makeCapabilityUpdate,
} from "@/services/capabilities/helpers.js"; // Adjust path if needed
import {
	PersonaDefinitionSchema,
	// PersonaDefinitionInputSchema // InputSchema might not be needed directly here
} from "./schema.js";
import { PersonaService, PersonaServiceTag } from "./types.js"; // Import interface and Tag
import { PersonaConfigError } from "./errors.js";

// Error wrapper specific to Persona configuration
const wrapPersonaError = (cause: ParseError): PersonaConfigError =>
	new PersonaConfigError({ message: "Persona validation failed", cause });

// Implementation using helpers correctly
export const PersonaServiceLiveLayer = Layer.succeed(
	PersonaServiceTag,
	// Provide a plain object literal that implements the PersonaService interface
	{
		make: makeCapabilityMake(PersonaDefinitionSchema, wrapPersonaError),
		update: makeCapabilityUpdate(PersonaDefinitionSchema, wrapPersonaError),
		// Implement any other PersonaService specific methods here if needed
	} satisfies PersonaService, // Use 'satisfies' for type checking (optional but good practice)
);
