/**
 * @file Defines Effect Schemas for Intelligence definitions.
 * @module services/capabilities/intelligence/schema
 */

import { Schema as S } from "effect";
import { Description, Metadata, Name, Version } from "@/schema.js";

// Allowed values for enum-like fields
const AllowedMemoryAccessLevel = S.Literal(
	"none",
	"short_term",
	"full",
);

/**
 * Schema.Class for defining preferences for a specific AI model.
 */
export class ModelPreference extends S.Class<ModelPreference>("ModelPreference")({
	/** Name of the provider service (e.g., "openai", "anthropic"). */
	provider: Name,
	/** Specific model identifier (e.g., "gpt-4-turbo"). */
	model: S.String.pipe(S.minLength(1)),
	/** Optional priority (lower number means higher priority). */
	priority: S.Number.pipe(S.int(), S.optional),
	/** Optional default parameters for this model. */
	parameters: S.Record({ key: S.String, value: S.Unknown }).pipe(S.optional),
}) { }


/**
 * Schema.Class for the core definition of an Intelligence profile.
 * Specifies model preferences, RAG, memory, and tool usage.
 */
export class Intelligence extends S.Class<Intelligence>("Intelligence")({
	/** Unique identifier for the intelligence profile. */
	name: S.String.pipe(S.minLength(1)),
	/** Optional user-friendly description. */
	description: S.String.pipe(S.optional),
	/** Array of preferred models, ordered by preference or priority field. Must have at least one. */
	modelPreferences: S.Array(ModelPreference).pipe(S.minItems(1)),
	/** Whether Retrieval-Augmented Generation is enabled. Defaults conceptually to false if absent. */
	ragEnabled: S.Boolean.pipe(S.optional),
	/** Level of memory access allowed. Defaults conceptually to 'none' if absent. */
	memoryAccessLevel: AllowedMemoryAccessLevel.pipe(S.optional),
	/** Optional list of allowed tool/skill names. If absent, interpretation depends on consumer (e.g., allow all or none). */
	allowedTools: S.Array(S.String).pipe(S.optional),
}) { }

/**
 * Type alias for Intelligence model
 */
export type IntelligenceType = S.Schema.Type<typeof Intelligence>;

/**
 * Schema for the input data used when creating or updating an Intelligence profile.
 * Aliased for now, assuming input matches the definition structure.
 */
export const IntelligenceInput = Intelligence;

/**
 * Schema for the static configuration file (e.g., intelligences.json).
 * Contains an array of intelligence definitions.
 */
export class IntelligenceFile extends S.Class<IntelligenceFile>("IntelligenceFile")({
	name: Name,
	description: Description.pipe(S.optional),
	intelligences: S.Array(Intelligence).pipe(S.minItems(1)),
	version: Version.pipe(S.optional),
	metadata: Metadata.pipe(S.optional),
}) { }
