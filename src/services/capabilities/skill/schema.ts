/**
 * @file Defines Effect Schemas for Skill definitions.
 * @module services/capabilities/skill/schema
 */

import { Schema as S } from "effect";

// --- SkillExecutionParams Class Schema ---
export class SkillExecutionParams extends S.Class<SkillExecutionParams>("SkillExecutionParams")({
	temperature: Schema.Number.pipe(S.optional),
	maxTokens: Schema.Number.pipe(S.optional),
	topP: Schema.Number.pipe(S.optional),
	topK: Schema.Number.pipe(S.optional),
	stopSequences: Schema.Array(Schema.String).pipe(S.optional),
	presencePenalty: Schema.Number.pipe(S.optional),
	frequencyPenalty: Schema.Number.pipe(S.optional),
}) { }

export type SkillExecutionParamsType = Schema.Schema.Type<typeof SkillExecutionParams>;

/**
 * Schema for the core definition of a Skill.
 * Describes a specific task or procedure the agent can perform,
 * linking together prompts, configuration, and execution parameters.
 */
export class Skill extends S.Class<Skill>("Skill")({
	name: Schema.String.pipe(Schema.minLength(1)),
	description: Schema.String.pipe(S.optional),
	intelligenceName: Schema.String.pipe(Schema.minLength(1)),
	personaName: Schema.String.pipe(Schema.minLength(1), S.optional),
	promptTemplateName: Schema.String.pipe(Schema.minLength(1)),
	systemPromptOverride: Schema.String.pipe(S.optional),
	defaultParams: SkillExecutionParams.pipe(S.optional),
	inputSchemaRef: Schema.String.pipe(S.optional),
	outputSchemaRef: Schema.String.pipe(S.optional),
	metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }).pipe(S.optional),
}) { }

/**
 * Schema for the static configuration file (e.g., skills.json).
 * Contains an array of skill definitions.
 */
export class SkillFile extends S.Class<SkillFile>("SkillFile")({
	skills: Schema.Array(Skill).pipe(Schema.minItems(1)),
}) { }