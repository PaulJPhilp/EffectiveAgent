import type { CapabilityService } from "@/services/capabilities/types.js";
// In src/services/capabilities/persona/types.ts
import { Context, Effect, Schema } from "effect"; 
import type { PersonaConfigError } from "./errors.js";
import { PersonaDefinitionInputSchema, PersonaDefinitionSchema } from "./schema.js"; 

// Define types from Schema first
export type PersonaDefinition = Schema.Schema.Type<typeof PersonaDefinitionSchema>;
export type PersonaDefinitionInput = Schema.Schema.Type<
  typeof PersonaDefinitionInputSchema
>;

export interface PersonaService
	extends CapabilityService<
		PersonaDefinition,
		PersonaDefinitionInput, // Input type for updates
		PersonaConfigError // Specific error type
	> {
	// Add any Persona-specific methods here if needed in the future
}

// Use GenericTag for interfaces
export const PersonaServiceTag = Context.GenericTag<PersonaService>("@services/PersonaService"); 

// Similar definitions would exist for SkillService, IntelligenceService...
