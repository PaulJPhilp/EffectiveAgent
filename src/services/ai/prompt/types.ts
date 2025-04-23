/**
 * @file Defines Tags and supporting types for the Prompt service.
 * Service implementation types are inferred from 'make' objects.
 */

import type { JsonObject } from "@/types.js";
import type { Prompt } from "@services/ai/prompt/schema.js"; // Use path alias
// EntityLoaderApi is needed by PromptConfigLiveLayer defined in live.ts
import { Context, Effect, HashMap } from "effect";
import { RenderingError, TemplateNotFoundError } from "../errors.js";

// Import make function for PromptApi to infer type

// --- Service Data Type ---

/** The data structure holding loaded prompt definitions. */
export type PromptConfigData = HashMap.HashMap<string, Prompt>;

// --- Service API Type (Inferred) ---

/** Service providing prompt rendering capabilities. */
export interface PromptApi {
    readonly renderTemplate: (params: RenderTemplateParams) => Effect.Effect<string, RenderingError | TemplateNotFoundError>;
    readonly renderString: (params: RenderStringParams) => Effect.Effect<string, RenderingError>;
}

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