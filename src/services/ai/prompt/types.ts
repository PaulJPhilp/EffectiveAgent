/**
 * @file Defines Tags and supporting types for the Prompt service.
 * Service implementation types are inferred from 'make' objects.
 */

import type { JsonObject } from "@/types.js";
import type {
    PromptConfigError,
    PromptError,
    RenderingError,
    TemplateNotFoundError,
} from "@services/ai/prompt/errors.js"; // Use path alias
import type { PromptDefinition } from "@services/ai/prompt/schema.js"; // Use path alias
// EntityLoaderApi is needed by PromptConfigLiveLayer defined in live.ts
import type { EntityLoaderApi } from "@services/core/loader/types.js";
import { Context, Effect, HashMap } from "effect";

// Import make function for PromptApi to infer type
// Assuming the synchronous 'make' for PromptApi is in live.ts
import type { make as makePromptApi } from "@services/ai/prompt/live.js";

// --- Service Data Type ---

/** The data structure holding loaded prompt definitions. */
export type PromptConfigData = HashMap.HashMap<string, PromptDefinition>;

// --- Service API Type (Inferred) ---

/** Service providing prompt rendering capabilities. */
// Use ReturnType as makePromptApi is expected to be synchronous
export type PromptApi = ReturnType<typeof makePromptApi>;

// --- Service Tags ---

/** Tag for the PromptConfig service (provides PromptConfigData). */
export const PromptConfig = Context.GenericTag<PromptConfigData>("PromptConfig");

/** Tag for the PromptApi service. */
export const PromptApi = Context.GenericTag<PromptApi>("PromptApi");

// --- Supporting Types ---

export interface RenderTemplateParams {
    readonly templateName: string;
    readonly context: JsonObject;
}

export interface RenderStringParams {
    readonly templateString: string;
    readonly context: JsonObject;
}
