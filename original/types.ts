// File: src/types.ts (Global Shared Types)

import { z } from "zod";

// --- JSON Types ---
// Standard and correct definitions.
export type JSONValue =
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined
    | JSONObject
    | JSONArray;

export interface JSONObject {
    [key: string]: JSONValue;
}

export type JSONArray = JSONValue[];

// --- Model Completion Related Types ---
/** Defines the intended format or type of output expected from a model. */
export type ModelCompletionFormat = 'text' | 'json' | 'image' | 'embedding';

/** Defines potential size parameters for image generation. */
export type ModelCompletionSize = 'small' | 'medium' | 'large' | '1024x1024' | '1792x1024' | '1024x1792' | string;

/** Defines potential quality parameters for image generation. */
export type ModelCompletionQuality = 'standard' | 'hd' | 'low' | 'medium' | 'high' | string;

/** Options that can be passed to any model completion request. */
export interface ModelCompletionOptions {
    format?: ModelCompletionFormat;
    size?: ModelCompletionSize;
    quality?: ModelCompletionQuality;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    stop?: string[];
    seed?: number;
}

export const ModelProviderSchema = z.enum(["openai", "anthropic", "google", "local", "groq", "deepseek", "perplexity", "grok"])
    .describe("The type of provider implementation");

export type ModelProviderType = z.infer<typeof ModelProviderSchema>;