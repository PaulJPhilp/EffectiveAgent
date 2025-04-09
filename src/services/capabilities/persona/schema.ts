/**
 * @file Defines Effect Schemas for Persona definitions.
 * @module services/capabilities/persona/schema
 */

import { Schema } from "effect";

// Define allowed values for enum-like fields
const AllowedTones = Schema.Literal(
	"formal",
	"casual",
	"professional",
	"witty",
	"empathetic",
);
const AllowedVerbosity = Schema.Literal("concise", "normal", "verbose");
const AllowedOutputFormat = Schema.Literal("text", "markdown", "json");

// Schema for a single example dialogue pair
const ExampleDialogueSchema = Schema.Struct({
	request: Schema.String,
	response: Schema.String,
});

/**
 * Schema for the core definition of a Persona.
 * Used both for static files and potentially dynamic entities (minus base fields).
 */
export const PersonaDefinitionSchema = Schema.Struct({
	/** Unique identifier for the persona. */
	name: Schema.String.pipe(Schema.minLength(1)),
	/** Optional user-friendly description. */
	description: Schema.String.pipe(Schema.optional), // Optional, no default call needed
	/** Core instructions defining the persona's behavior and style. */
	instructions: Schema.String.pipe(Schema.minLength(1)),
	/** Optional tone specification. */
	tone: AllowedTones.pipe(Schema.optional), // Optional, no default call needed
	/** Optional verbosity specification. */
	verbosity: AllowedVerbosity.pipe(Schema.optional), // Optional, no default call needed
	/** Optional output format specification. */
	outputFormat: AllowedOutputFormat.pipe(Schema.optional), // Optional, no default call needed
	/** Optional few-shot examples. */
	exampleDialogues: Schema.Array(ExampleDialogueSchema).pipe(Schema.optional), // Optional, no default call needed
});

/**
 * Type inferred from {@link PersonaDefinitionSchema}.
 * Represents the validated data structure for a persona definition.
 */
export type PersonaDefinition = Schema.Schema.Type<
	typeof PersonaDefinitionSchema
>;

/**
 * Schema for the input data used when creating or updating a Persona.
 * Often similar to the DefinitionSchema but might differ slightly (e.g., for updates).
 * For now, let's assume it's the same as the definition for simplicity.
 * We can refine this if update logic requires different input structure.
 */
export const PersonaDefinitionInputSchema = PersonaDefinitionSchema; // Alias for now

/**
 * Type inferred from {@link PersonaDefinitionInputSchema}.
 * Represents the expected input structure for creating/updating personas.
 */
export type PersonaDefinitionInput = Schema.Schema.Type<
	typeof PersonaDefinitionInputSchema
>;

/**
 * Schema for the static configuration file (e.g., personas.json).
 * Contains an array of persona definitions.
 */
export const PersonasConfigFileSchema = Schema.Struct({
	personas: Schema.Array(PersonaDefinitionSchema).pipe(Schema.minItems(1)),
});

/**
 * Type inferred from {@link PersonasConfigFileSchema}.
 * Represents the structure of the personas configuration file after validation.
 */
export type PersonasConfigFile = Schema.Schema.Type<
	typeof PersonasConfigFileSchema
>;
