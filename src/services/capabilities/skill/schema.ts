/**
 * @file Defines Effect Schemas for Skill definitions.
 * @module services/capabilities/skill/schema
 */

import { Schema } from "effect";
// Import related schema types if needed for validation/references
// import { PersonaNameSchema } from "@/services/capabilities/persona/schema"; // Example
// import { IntelligenceNameSchema } from "@/services/capabilities/intelligence/schema"; // Example
// import { PromptTemplateNameSchema } from "@/services/ai/prompt/schema"; // Example

// --- SkillExecutionParams Class Schema ---
export class SkillExecutionParams extends Schema.Class<SkillExecutionParams>("SkillExecutionParams")({
	temperature: Schema.Number.pipe(Schema.optional),
	maxTokens: Schema.Number.pipe(Schema.optional),
	topP: Schema.Number.pipe(Schema.optional),
	topK: Schema.Number.pipe(Schema.optional),
	stopSequences: Schema.Array(Schema.String).pipe(Schema.optional),
	presencePenalty: Schema.Number.pipe(Schema.optional),
	frequencyPenalty: Schema.Number.pipe(Schema.optional),
}) { }

export type SkillExecutionParamsType = Schema.Schema.Type<typeof SkillExecutionParams>;

/**
 * Schema for the core definition of a Skill.
 * Describes a specific task or procedure the agent can perform,
 * linking together prompts, configuration, and execution parameters.
 */
// --- Skill Class Schema ---
export class Skill extends Schema.Class<Skill>("Skill")({
	name: Schema.String.pipe(Schema.minLength(1)),
	description: Schema.String.pipe(Schema.optional),
	intelligenceName: Schema.String.pipe(Schema.minLength(1)),
	personaName: Schema.String.pipe(Schema.minLength(1), Schema.optional),
	promptTemplateName: Schema.String.pipe(Schema.minLength(1)),
	systemPromptOverride: Schema.String.pipe(Schema.optional),
	defaultParams: SkillExecutionParams.pipe(Schema.optional),
	inputSchemaRef: Schema.String.pipe(Schema.optional),
	outputSchemaRef: Schema.String.pipe(Schema.optional),
	metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }).pipe(Schema.optional),
}) { }

/**
 * Schema for the static configuration file (e.g., skills.json).
 * Contains an array of skill definitions.
 */
// --- SkillFile Class Schema ---
export class SkillFile extends Schema.Class<SkillFile>("SkillFile")({
	skills: Schema.Array(Skill).pipe(Schema.minItems(1)),
}) { }