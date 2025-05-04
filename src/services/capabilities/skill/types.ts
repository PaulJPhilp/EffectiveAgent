/**
 * @file Defines types, interfaces, and Context Tags for the Skill capability service.
 * @module services/capabilities/skill/types
 */

import type {
	SkillConfigError,
	SkillExecutionError,
	SkillInputValidationError,
	SkillNotFoundError,
	SkillOutputValidationError
} from "@/services/capabilities/skill/errors.js";
import {
	Skill,
	SkillExecutionParams,
	SkillFile
} from "@/services/capabilities/skill/schema.js";
import type { CapabilityService } from "@/services/capabilities/types.js";
import { Context, Data, Effect, HashMap, Schema } from "effect";

// --- Inferred Types from Schema ---
export type SkillExecutionParamsType = Schema.Schema.Type<typeof SkillExecutionParams>;
export type SkillDefinition = Schema.Schema.Type<typeof Skill>;
export type SkillsFile = Schema.Schema.Type<typeof SkillFile>;

// --- Runtime Skill Representation ---
export type SkillName = SkillDefinition["name"];

/** 
 * Represents a fully processed Skill definition with resolved schemas.
 * Used as the runtime representation of a Skill.
 */
export interface RegisteredSkill<Input = any, Output = any> {
	readonly definition: SkillDefinition;
	readonly inputSchema: Schema.Schema<Input>;
	readonly outputSchema: Schema.Schema<Output>;
}

// --- Capability Service Definition ---

/**
 * Interface for the Skill capability service, providing
 * validation and update logic for Skill definitions.
 */
export interface SkillService
	extends CapabilityService<
		SkillDefinition,
		SkillDefinition, // Use the same type since we don't have a separate input type
		SkillConfigError
	> {
	// Add any Skill-specific methods here if needed (e.g., validateReferences?)
}

/** Context Tag for the {@link SkillService}. */
export const SkillServiceTag = Context.GenericTag<SkillService>(
	"@services/SkillService",
);

// --- Static Loaded Data Definition ---

/**
 * Represents the loaded and processed static Skill definitions,
 * structured as a HashMap for efficient lookup by name.
 * Includes resolved input/output schemas.
 */
export class SkillData extends Data.TaggedClass("SkillData")<{
	// Map SkillName to the fully processed RegisteredSkill structure
	readonly skills: HashMap.HashMap<SkillName, RegisteredSkill>;
}> { }

/**
 * Context Tag for accessing the loaded static Skill definitions (including resolved schemas).
 * Services needing access to the predefined skills will use this Tag.
 */
export const SkillDataTag = Context.GenericTag<SkillData>(
	"@services/SkillData",
);

// --- Skill Execution API Definition ---

/** Represents the input data provided to a Skill invocation by the caller. */
export type SkillInput = unknown; // Input is unknown before validation

/** Represents the output data produced by a successful Skill invocation. */
export type SkillOutput = unknown; // Output is unknown until validated

/** Combined error type for SkillApi.invokeSkill */
export type InvokeSkillError =
	| SkillNotFoundError
	| SkillConfigError // e.g., referenced Persona/Intelligence not found during lookup
	| SkillInputValidationError
	| SkillOutputValidationError
	| SkillExecutionError; // Includes AI errors, Tool errors etc.

/** Service interface for invoking Skills. */
export interface SkillApi {
	/**
	 * Invokes a configured Skill by name with the given input.
	 * This is the primary method for agents/workflows to execute skills.
	 * It handles fetching definitions, validating input/output, applying
	 * Persona/Intelligence settings, executing the core logic (LLM call, tool use),
	 * and managing errors.
	 */
	readonly invokeSkill: (params: {
		skillName: SkillName;
		input: SkillInput; // Raw input, validated internally
		// Optional overrides for execution parameters
		overrideParams?: Partial<SkillExecutionParams>;
		// Optional context for stateful operations (e.g., memory, session)
		// threadId?: string;
	}) => Effect.Effect<
		SkillOutput, // Validated output (unknown until runtime)
		InvokeSkillError, // Union of possible skill-related errors
		// --- Requirements (R) ---
		| typeof SkillDataTag // To get the RegisteredSkill (including schemas)
	>;
}

/** Context Tag for the SkillApi service. */
export const SkillApiTag = Context.GenericTag<SkillApi>("@services/SkillApi");
