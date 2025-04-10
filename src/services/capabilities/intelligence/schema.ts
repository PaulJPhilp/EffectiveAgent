/**
 * @file Defines Effect Schemas for Intelligence definitions.
 * @module services/capabilities/intelligence/schema
 */

import { Schema } from "effect";
// Assuming ProviderNameSchema is exported from the provider service schema
// Adjust the import path as necessary
import { ProviderNameSchema } from "@/services/ai/provider/schema.js";

/**
 * Schema for defining preferences for a specific AI model.
 */
const ModelPreferenceSchema = Schema.Struct({
	/** Name of the provider service (e.g., "openai", "anthropic"). */
	provider: ProviderNameSchema,
	/** Specific model identifier (e.g., "gpt-4-turbo"). */
	model: Schema.String.pipe(Schema.minLength(1)),
	/** Optional priority (lower number means higher priority). */
	priority: Schema.Number.pipe(Schema.int(), Schema.optional),
	/** Optional default parameters for this model. */
	parameters: Schema.Record({ key: Schema.String, value: Schema.Unknown }).pipe(
		Schema.optional,
	), // Allows any structure for parameters for now
});

/**
 * Type inferred from {@link ModelPreferenceSchema}.
 */
export type ModelPreference = Schema.Schema.Type<typeof ModelPreferenceSchema>;

// Define allowed values for enum-like fields
const AllowedMemoryAccessLevel = Schema.Literal(
	"none",
	"short_term",
	"full",
);

/**
 * Schema for the core definition of an Intelligence profile.
 * Specifies model preferences, RAG, memory, and tool usage.
 */
export const IntelligenceDefinitionSchema = Schema.Struct({
	/** Unique identifier for the intelligence profile. */
	name: Schema.String.pipe(Schema.minLength(1)),
	/** Optional user-friendly description. */
	description: Schema.String.pipe(Schema.optional),
	/** Array of preferred models, ordered by preference or priority field. Must have at least one. */
	modelPreferences: Schema.Array(ModelPreferenceSchema).pipe(
		Schema.minItems(1),
	),
	/** Whether Retrieval-Augmented Generation is enabled. Defaults conceptually to false if absent. */
	ragEnabled: Schema.Boolean.pipe(Schema.optional), // Optional, default handled by consumer
	/** Level of memory access allowed. Defaults conceptually to 'none' if absent. */
	memoryAccessLevel: AllowedMemoryAccessLevel.pipe(Schema.optional), // Optional, default handled by consumer
	/** Optional list of allowed tool/skill names. If absent, interpretation depends on consumer (e.g., allow all or none). */
	allowedTools: Schema.Array(Schema.String).pipe(Schema.optional),
});

/**
 * Type inferred from {@link IntelligenceDefinitionSchema}.
 * Represents the validated data structure for an intelligence definition.
 */
export type IntelligenceDefinition = Schema.Schema.Type<
	typeof IntelligenceDefinitionSchema
>;

/**
 * Schema for the input data used when creating or updating an Intelligence profile.
 * Aliased for now, assuming input matches the definition structure.
 */
export const IntelligenceDefinitionInputSchema = IntelligenceDefinitionSchema;

/**
 * Type inferred from {@link IntelligenceDefinitionInputSchema}.
 * Represents the expected input structure for creating/updating intelligence profiles.
 */
export type IntelligenceDefinitionInput = Schema.Schema.Type<
	typeof IntelligenceDefinitionInputSchema
>;

/**
 * Schema for the static configuration file (e.g., intelligences.json).
 * Contains an array of intelligence definitions.
 */
export const IntelligencesConfigFileSchema = Schema.Struct({
	intelligences: Schema.Array(IntelligenceDefinitionSchema).pipe(
		Schema.minItems(1),
	),
});

/**
 * Type inferred from {@link IntelligencesConfigFileSchema}.
 * Represents the structure of the intelligences configuration file after validation.
 */
export type IntelligencesConfigFile = Schema.Schema.Type<
	typeof IntelligencesConfigFileSchema
>;
