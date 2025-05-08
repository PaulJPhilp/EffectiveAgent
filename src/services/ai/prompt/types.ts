/**
 * @file Defines types and services for the Prompt service.
 * @module services/ai/prompt/types
 */

import type { JsonObject } from "@/types.js";
import type { Prompt } from "@services/ai/prompt/schema.js";
import { Effect, HashMap, Layer } from "effect";
import { RenderingError, TemplateNotFoundError } from "../errors.js";

/** The data structure holding loaded prompt definitions. */
export type PromptConfigData = HashMap.HashMap<string, Prompt>;

/**
 * Service for managing prompt configurations
 */
export interface PromptConfigApi {
    readonly getPrompts: () => Effect.Effect<PromptConfigData, never>;
    readonly getPrompt: (name: string) => Effect.Effect<Prompt, TemplateNotFoundError>;
    readonly addPrompt: (name: string, prompt: Prompt) => Effect.Effect<void, never>;
}


/**
 * Service for prompt rendering
 */
export interface PromptApi {
    readonly renderTemplate: (params: RenderTemplateParams) => Effect.Effect<string, RenderingError | TemplateNotFoundError>;
    readonly renderString: (params: RenderStringParams) => Effect.Effect<string, RenderingError>;
}



// --- Supporting Types ---

export interface RenderTemplateParams {
    readonly templateName: string;
    readonly context: JsonObject;
}

export interface RenderStringParams {
    readonly templateString: string;
    readonly context: JsonObject;
}