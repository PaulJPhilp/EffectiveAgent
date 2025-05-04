import type { PersonaConfigError } from "@/services/capabilities/persona/errors.js";
import { Persona } from "@/services/capabilities/persona/schema.js";
import type { CapabilityService } from "@/services/capabilities/types.js";
import { Context, Schema } from "effect";

// Define types from Schema first
export type PersonaDefinition = Schema.Schema.Type<typeof Persona>;
export type PersonaDefinitionInput = Schema.Schema.Type<typeof Persona>;

export interface PersonaService
	extends CapabilityService<
		PersonaDefinition,
		PersonaDefinitionInput,
		PersonaConfigError
	> {
	// Add any Persona-specific methods here if needed in the future
}

// Use GenericTag for interfaces
export const PersonaServiceTag = Context.GenericTag<PersonaService>("@services/PersonaService");
