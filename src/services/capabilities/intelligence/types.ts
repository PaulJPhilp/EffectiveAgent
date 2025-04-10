/**
 * @file Defines types and Context Tags for the Intelligence capability service.
 * @module services/capabilities/intelligence/types
 */

import { Context, Data, HashMap, Schema } from "effect";
import type { CapabilityService } from "@/services/capabilities/types.js"; // Generic service interface
import type { IntelligenceConfigError } from "./errors.js"; // Specific error type
import type {
	IntelligenceDefinitionSchema,
	IntelligenceDefinitionInputSchema,
	IntelligencesConfigFileSchema,
} from "./schema.js"; // Import schemas

// --- Inferred Types from Schema ---

/** Type inferred from {@link IntelligenceDefinitionSchema}. */
export type IntelligenceDefinition = Schema.Schema.Type<
	typeof IntelligenceDefinitionSchema
>;


/** Type inferred from {@link IntelligenceDefinitionInputSchema}. */
export type IntelligenceDefinitionInput = Schema.Schema.Type<
	typeof IntelligenceDefinitionInputSchema
>;

/** Type inferred from {@link IntelligencesConfigFileSchema}. */
export type IntelligencesConfigFile = Schema.Schema.Type<
	typeof IntelligencesConfigFileSchema
>;

// --- Capability Service Definition ---

/**
 * Interface for the Intelligence capability service, providing
 * validation and update logic for Intelligence definitions.
 */
export interface IntelligenceService
	extends CapabilityService<
		IntelligenceDefinition,
		IntelligenceDefinitionInput,
		IntelligenceConfigError // Specific error type
	> {
	// Add any Intelligence-specific methods here if needed in the future
}

/**
 * Context Tag for the {@link IntelligenceService}. Used to access
 * the make/update operations for Intelligence definitions.
 */
export const IntelligenceServiceTag = Context.GenericTag<IntelligenceService>(
	"@services/IntelligenceService",
);

// --- Static Loaded Data Definition ---

/** Unique name/identifier for an Intelligence profile. */
export type IntelligenceName = IntelligenceDefinition["name"]; // Extract name type

/**
 * Represents the loaded and processed static Intelligence definitions,
 * structured as a HashMap for efficient lookup by name.
 */
export class IntelligenceData extends Data.TaggedClass("IntelligenceData")<{
	readonly intelligences: HashMap.HashMap<
		IntelligenceName,
		IntelligenceDefinition
	>;
}> { }

/**
 * Context Tag for accessing the loaded static Intelligence definitions.
 * Services needing access to the predefined intelligence profiles will use this Tag.
 */
export const IntelligenceDataTag = Context.GenericTag<IntelligenceData>(
	"@services/IntelligenceData",
);
