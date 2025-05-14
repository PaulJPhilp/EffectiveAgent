/**
 * @file Defines Effect Schemas for Skill definitions.
 * @module services/capabilities/skill/schema
 */

import { Schema as S } from "effect";

// --- SkillExecutionParams Class Schema ---
export class SkillExecutionParams extends S.Class<SkillExecutionParams>("SkillExecutionParams")({
	temperature: S.Number.pipe(S.optional),
	maxTokens: S.Number.pipe(S.optional),
	topP: S.Number.pipe(S.optional),
	topK: S.Number.pipe(S.optional),
	stopSequences: S.Array(S.String).pipe(S.optional),
	presencePenalty: S.Number.pipe(S.optional),
	frequencyPenalty: S.Number.pipe(S.optional),
}) { }

export type SkillExecutionParamsType = Schema.Schema.Type<typeof SkillExecutionParams>;

/**
 * Schema for the core definition of a Skill.
 * Describes a specific task or procedure the agent can perform,
 * linking together prompts, configuration, and execution parameters.
 */
export class Skill extends S.Class<Skill>("Skill")({
	name: S.String.pipe(S.minLength(1)),
	description: S.String.pipe(S.optional),
	intelligenceName: S.String.pipe(S.minLength(1)),
	personaName: S.String.pipe(S.minLength(1), S.optional),
	promptTemplateName: S.String.pipe(S.minLength(1)),
	systemPromptOverride: S.String.pipe(S.optional),
	defaultParams: SkillExecutionParams.pipe(S.optional),
	inputSchemaRef: S.String.pipe(S.optional),
	outputSchemaRef: S.String.pipe(S.optional),
	metadata: S.Record({ key: S.String, value: S.Unknown }).pipe(S.optional),
}) { }

/**
 * Schema for the static configuration file (e.g., skills.json).
 * Contains an array of skill definitions.
 */
export class SkillFile extends S.Class<SkillFile>("SkillFile")({
	skills: S.Array(Skill).pipe(S.minItems(1)),
}) { }