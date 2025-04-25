/**
 * @file Defines interfaces, Tags, and types for the Skill service.
 * Skills are the primary abstraction for invoking AI capabilities.
 */

// Import AI service types needed for R signature
 // Assuming ChatModel is the Tag/Interface from @effect/ai root
import type { HttpClient } from "@effect/platform";
import type { FileSystem } from "@effect/platform/FileSystem";
import type { Path } from "@effect/platform/Path";
import { Context, Effect, Layer } from "effect";
import type { ConfigError } from "effect/ConfigError";
// Import Config dependencies needed by Configuration services
import type { ConfigLoaderApi, ConfigLoaderOptions } from "../../core/configuration/types.js";
// Import other required service Tags/Interfaces for R signature
import type { IntelligenceConfiguration } from "../../core/intelligence/types.js";
import type { LoggingApi } from "../../core/logging/types.js";
import type { PersonaConfiguration } from "../../core/persona/types.js";
import type { Id, JsonObject } from "../../types.js"; // Global types
// Import Skill-specific errors and schema types
import type { SkillError } from "./errors.js";
import type {SkillDefinition, SkillExecutionParams } from "./schema.js";
export { SkillDefinition, SkillExecutionParams };
// Import PromptApi type when defined
// import type { PromptApi } from "../../ai/prompt/types.js";
// Import Memory types when defined
// import type { ChatMemoryApi } from "../../memory/chat/types.js";
// import type { LongTermMemoryApi } from "../../memory/longterm/types.js";


// --- Service Interfaces & Tags ---

/** Service interface for accessing loaded Skill definitions. */
export interface SkillConfiguration {
    /** Retrieves a specific SkillDefinition by its unique name. */
    readonly getSkillDefinitionByName: (
        name: string
    ) => Effect.Effect<SkillDefinition, SkillError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions>; // Requires ConfigLoader + deps
    /** Retrieves all loaded Skill definitions. */
    readonly listSkillDefinitions: () => Effect.Effect<ReadonlyArray<SkillDefinition>, SkillError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions>; // Requires ConfigLoader + deps
}
/** Tag for the SkillConfiguration service. */
export const SkillConfiguration = Context.GenericTag<SkillConfiguration>("SkillConfiguration");


/** Service interface for invoking Skills. */
export interface SkillApi {
    /**
     * Invokes a configured Skill by name.
     * This is the primary method for developers to interact with AI capabilities.
     */
    readonly invokeSkill: (params: {
        skillName: string;
        input: SkillInput; // Input data for the skill's prompt/template
        // Optional overrides for parameters defined in the SkillDefinition
        overrideParams?: Partial<SkillExecutionParams>;
        // Optional context like threadId if needed for memory/history
        // threadId?: Id;
    }) => Effect.Effect<
        SkillOutput, // Success type (string | JsonObject)
        SkillError | ConfigError, // Skill errors or ConfigErrors from API key loading
        // --- Requirements (R) ---
        SkillConfiguration | // To get the skill definition
        IntelligenceConfiguration | // To get intelligence profile
        PersonaConfiguration | // To get persona def// The underlying AI service from @effect/ai
        LoggingApi | // For logging
        HttpClient.HttpClient | // Needed by @effect/ai provider layers
        ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions // Needed by Config services
    // Add PromptApi, Memory services etc. later
    >;
}
/** Tag for the SkillApi service. */
export const SkillApi = Context.GenericTag<SkillApi>("SkillApi");


// --- Supporting Types ---

/** Represents the output of a Skill invocation. */
export type SkillOutput = JsonObject | string; // Keep flexible initially

/** Represents the input data provided to a Skill invocation. */
export type SkillInput = JsonObject; // Use JsonObject for structured input
