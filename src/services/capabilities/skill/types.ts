/**
 * @file Type definitions for the Skill capability service.
 */

import type { Schema } from "effect";
import type { Skill, SkillExecutionParams } from "./schema.js";

// Inferred Types from Schema
export type SkillDefinition = Schema.Schema.Type<typeof Skill>;
export type SkillExecutionParamsType = Schema.Schema.Type<typeof SkillExecutionParams>;

// Runtime Types
export type SkillName = SkillDefinition["name"];
export type SkillInput = unknown; // Type determined at runtime by skill's inputSchema
export type SkillOutput = unknown; // Type determined at runtime by skill's outputSchema

/**
 * Represents a fully processed Skill definition with resolved schemas.
 * Used as the runtime representation of a Skill.
 */
export interface RegisteredSkill<Input = unknown, Output = unknown> {
    readonly definition: SkillDefinition;
    readonly inputSchema: Schema.Schema<Input>;
    readonly outputSchema: Schema.Schema<Output>;
} 