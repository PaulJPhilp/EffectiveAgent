/**
 * @file Defines Effect Schemas for Skill definitions.
 * @module services/capabilities/skill/schema
 */

import { Schema } from "effect";
// Import related schema types if needed for validation/references
// import { PersonaNameSchema } from "@/services/capabilities/persona/schema"; // Example
// import { IntelligenceNameSchema } from "@/services/capabilities/intelligence/schema"; // Example
// import { PromptTemplateNameSchema } from "@/services/ai/prompt/schema"; // Example

// Define SkillExecutionParamsSchema locally or import if shared
// Assuming local definition for now
const SkillExecutionParamsSchema = Schema.Struct({
	temperature: Schema.Number,
	maxTokens: Schema.Number, // Assuming positive() fixed
	topP: Schema.Number,
	topK: Schema.Number,
	stopSequences: Schema.Array(Schema.String).pipe(Schema.optional),
	presencePenalty: Schema.Number,
	frequencyPenalty: Schema.Number,
}).pipe(Schema.partial); // Use partial to make all fields optional by default? Or define individually. Let's use optional per field.

export type SkillExecutionParams = Schema.Schema.Type<typeof SkillExecutionParamsSchema>;


/**
 * Schema for the core definition of a Skill.
 * Describes a specific task or procedure the agent can perform,
 * linking together prompts, configuration, and execution parameters.
 */
export const SkillDefinitionSchema = Schema.Struct({
	/** Unique identifier for the skill. */
	name: Schema.String.pipe(Schema.minLength(1)), // TODO: Consider namespacing like tools?

	/** User-friendly description of what the skill does. */
	description: Schema.String.pipe(Schema.optional),

	/** Reference to the Intelligence profile governing execution (model choice, tool permissions, etc.). */
	intelligenceName: Schema.String.pipe(Schema.minLength(1)), // Required reference

	/** Optional reference to a Persona profile to guide communication style. */
	personaName: Schema.String.pipe(Schema.minLength(1), Schema.optional), // Optional reference

	/** Reference to the core prompt template used by this skill. */
	promptTemplateName: Schema.String.pipe(Schema.minLength(1)), // Required reference

	/** Optional: Specific system prompt text to override or augment the Persona's instructions. */
	systemPromptOverride: Schema.String.pipe(Schema.optional),

	/**
	 * Optional: Default execution parameters specific to this skill.
	 * These override defaults from the Intelligence profile but can be
	 * overridden by invocation-specific parameters.
	 */
	defaultParams: SkillExecutionParamsSchema.pipe(Schema.optional), // Optional block

	/**
	 * Optional: Reference (e.g., name/ID) to the Effect Schema defining the expected input structure.
	 * Used for runtime validation within SkillApi.invokeSkill.
	 * The actual Schema object is linked during registration/loading.
	 */
	inputSchemaRef: Schema.String.pipe(Schema.optional),

	/**
	 * Optional: Reference (e.g., name/ID) to the Effect Schema defining the expected output structure.
	 * Used for runtime validation within SkillApi.invokeSkill.
	 * The actual Schema object is linked during registration/loading.
	 */
	outputSchemaRef: Schema.String.pipe(Schema.optional),

	/** Optional metadata field for extensions. */
	metadata: Schema.Record({key: Schema.String, value: Schema.Unknown}).pipe(Schema.optional), // Changed key to String
});

/**
 * Type inferred from {@link SkillDefinitionSchema}.
 * Represents the validated data structure for a skill definition.
 */
export type SkillDefinition = Schema.Schema.Type<typeof SkillDefinitionSchema>;

/**
 * Schema for the input data used when creating or updating a Skill.
 * Aliased for now.
 */
export const SkillDefinitionInputSchema = SkillDefinitionSchema;
export type SkillDefinitionInput = Schema.Schema.Type<typeof SkillDefinitionInputSchema>;

/**
 * Schema for the static configuration file (e.g., skills.json).
 * Contains an array of skill definitions.
 */
export const SkillsConfigFileSchema = Schema.Struct({
	skills: Schema.Array(SkillDefinitionSchema).pipe(Schema.minItems(1)),
});
export type SkillsConfigFile = Schema.Schema.Type<typeof SkillsConfigFileSchema>;

