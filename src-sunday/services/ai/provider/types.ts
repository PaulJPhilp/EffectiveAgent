/**
 * @file Defines interfaces, Tags, and types for the Skill service.
 * Skills are the primary abstraction for invoking AI capabilities.
 */

import { Context, Effect, Layer } from "effect";
import type { ConfigError } from "effect/ConfigError";
import type { JsonObject, Id } from "../../types.js";
import type { LoggingApi } from "../../core/logging/types.js";
// --- CORRECTED AI Import ---
import type { Completions } from "@effect/ai"; // Use Completions interface/Tag
// --- End AI Import ---
import type { HttpClient } from "@effect/platform";
import type { ConfigLoaderApi, ConfigLoaderOptions } from "../../core/configuration/types.js";
import type { FileSystem } from "@effect/platform/FileSystem";
import type { Path } from "@effect/platform/Path";
import type { IntelligenceConfiguration } from "../../core/intelligence/types.js";
import type { PersonaConfiguration } from "../../core/persona/types.js";
import type { SkillError } from "./errors.js";
import type { SkillDefinition, SkillExecutionParams } from "./schema.js";

// --- Service Interfaces & Tags ---

/** Service interface for accessing loaded Skill definitions. */
export interface SkillConfiguration {
    readonly getSkillDefinitionByName: (name: string) => Effect.Effect<SkillDefinition, SkillError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions>;
    readonly listSkillDefinitions: () => Effect.Effect<ReadonlyArray<SkillDefinition>, SkillError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions>;
}
/** Tag for the SkillConfiguration service. */
export const SkillConfiguration = Context.GenericTag<SkillConfiguration>("SkillConfiguration");


/** Service interface for invoking Skills. */
export interface SkillApi {
    /** Invokes a configured Skill by name. */
    readonly invokeSkill: (params: {
        skillName: string;
        input: SkillInput;
        overrideParams?: Partial<SkillExecutionParams>;
        // threadId?: Id;
    }) => Effect.Effect<
        SkillOutput,
        SkillError | ConfigError,
        // --- Requirements (R) ---
        SkillConfiguration |
        IntelligenceConfiguration |
        PersonaConfiguration |
        Completions | // <--- CORRECTED: Use Completions Tag/Interface
        LoggingApi |
        HttpClient.HttpClient |
        ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions
    // Add PromptApi, Memory services etc. later
    >;
}
/** Tag for the SkillApi service. */
export const SkillApi = Context.GenericTag<SkillApi>("SkillApi");


// --- Supporting Types ---
export type SkillOutput = JsonObject | string;
export type SkillInput = JsonObject;
