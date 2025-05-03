/**
 * @file Defines types, interfaces, and Context Tags for the Skill capability service.
 * @module services/capabilities/skill/types
 */

import type { CapabilityService } from "@/services/capabilities/types.js"; // Generic service interface
import { Context, Data, Effect, HashMap, Layer, Schema } from "effect"; // Added Data
// Import all specific skill errors
import type {
	SkillConfigError,
	SkillExecutionError,
	SkillInputValidationError,
	SkillNotFoundError,
	SkillOutputValidationError
} from "./errors.js";
import type {
	SkillDefinitionInputSchema,
	SkillDefinitionSchema,
	SkillExecutionParamsSchema,
	SkillsConfigFileSchema,
} from "./schema.js"; // Import schemas

import type { PromptApi, PromptApiTag } from "@/services/ai/prompt/types"; // Adjust path
import type { ToolExecutorService, ToolExecutorServiceTag } from "@/services/ai/tools/types"; // Adjust path
import type { IntelligenceData, IntelligenceDataTag } from "@/services/capabilities/intelligence/types"; // Adjust path
// Import types needed for SkillApi requirements (R channel)
import type { PersonaData, PersonaDataTag } from "@/services/capabilities/persona/types"; // Adjust path
import type { LoggingApi, LoggingApiTag } from "@/services/core/logging/types"; // Adjust path
// Import Config if needed for API keys etc.
// import type { Config } from "effect";
// Import specific @effect/ai provider layers/tags if needed directly
// import type { OpenAiCompletions } from "@effect/ai-openai"; // Example

// --- Inferred Types from Schema ---

/** Type inferred from {@link SkillExecutionParamsSchema}. */
export type SkillExecutionParams = Schema.Schema.Type<typeof SkillExecutionParamsSchema>;

/** Type inferred from {@link SkillDefinitionSchema}. */
export type SkillDefinition = Schema.Schema.Type<typeof SkillDefinitionSchema>;

/** Type inferred from {@link SkillDefinitionInputSchema}. */
export type SkillDefinitionInput = Schema.Schema.Type<typeof SkillDefinitionInputSchema>;

/** Type inferred from {@link SkillsConfigFileSchema}. */
export type SkillsConfigFile = Schema.Schema.Type<typeof SkillsConfigFileSchema>;

// --- Runtime Skill Representation ---

/** Unique name/identifier for a Skill (potentially namespaced). */
export type SkillName = SkillDefinition["name"]; // Extract name type

/**
 * Represents a fully processed Skill, combining its definition metadata
 * with resolved references to its actual input/output schemas.
 * This is the structure likely used internally by SkillApi.
 * The actual Schema objects are associated during loading/registration.
 */
export interface RegisteredSkill<Input = any, Output = any> {
	readonly definition: SkillDefinition;
	// Actual Effect Schema objects linked during registration/loading
	readonly inputSchema: Schema.Schema<Input>;
	readonly outputSchema: Schema.Schema<Output>;
	// Optional: Could link the resolved PromptTemplate function here too
}

// --- Capability Service Definition (for make/update) ---

/**
 * Interface for the Skill capability service, providing
 * validation and update logic for Skill definitions.
 */
export interface SkillService
	extends CapabilityService<
		SkillDefinition,
		SkillDefinitionInput,
		SkillConfigError // Specific validation/config error type
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
		| typeof PersonaDataTag // To get PersonaDefinition
		| typeof IntelligenceDataTag // To get IntelligenceDefinition
		| typeof PromptApiTag // To render prompts
		| typeof ToolExecutorServiceTag // If skills can use tools
		| typeof LoggingApiTag // For logging
		// Required by specific implementations (e.g., @effect/ai, tool implementations)
		// These might be provided by a base platform layer or specific provider layers
		| HttpClient // Example: Needed by @effect/ai and potentially tools
	// | OpenAiCompletions.OpenAiCompletions // Example: Specific AI provider service
	// | GoogleAuthTag // Example: Needed by specific tools
	>;
}

/** Context Tag for the SkillApi service. */
export const SkillApiTag = Context.GenericTag<SkillApi>("@services/SkillApi");
