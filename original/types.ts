// File: src/types.ts (Global Shared Types - Final Version)

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
    [key: string]: JSONValue; // Corrected: Use JSONValue
}

export type JSONArray = JSONValue[]; // Corrected: Use JSONValue

// --- Model Completion Related Types ---

/** Defines the intended format or type of output expected from a model. */
export type ModelCompletionFormat = 'text' | 'json' | 'image' | 'embedding';

/** Defines potential size parameters, likely for image generation. */
export type ModelCompletionSize = 'small' | 'medium' | 'large' | '1024x1024' | '1792x1024' | '1024x1792' | string;

/** Defines potential quality parameters, likely for image generation. */
export type ModelCompletionQuality = 'standard' | 'hd' | 'low' | 'medium' | 'high' | string;

/** Defines potential style parameters, likely for image generation. */
export type ModelCompletionStyle = 'natural' | 'vivid' | 'photorealistic' | 'cinematic' | 'anime' | string;

// REMOVED: ModelCompletionProvider type (redundant with provider schema enum)

/** Defines the structure for token usage reporting. */
export interface ModelCompletionUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
};

/**
 * Options passed to request a completion from a model provider.
 * Used by ModelService and passed down to IModelProvider implementations.
 */
export interface ModelCompletionOptions<T extends JSONValue = JSONValue> {
    /** The specific model ID to use for this request (e.g., 'gpt-4-turbo'). */
    modelId: string;
    /** The main input prompt string. */
    prompt: string;
    /** Optional system prompt or instructions. */
    systemPrompt?: string;
    /** Sampling temperature (0-2). Higher values = more random. */
    temperature?: number;
    /** Maximum number of tokens to generate in the completion. */
    maxTokens?: number;
    /** Nucleus sampling probability (0-1). */
    topP?: number;
    /** Consider only top K tokens. Used by some models like Google/Anthropic. */
    topK?: number;
    /** Penalize new tokens based on their frequency so far (-2 to 2). */
    frequencyPenalty?: number;
    /** Penalize new tokens based on their presence so far (-2 to 2). */
    presencePenalty?: number;
    /** Sequence(s) where the API will stop generating further tokens. */
    stopSequences?: string[];

    // --- Format/Type Specific Options ---
    /** Hint for the desired output format (text, json, image, embedding). */
    format?: ModelCompletionFormat;
    /** Optional validator function used by ModelService.generateObject when format is 'json'. */
    validator?: (data: unknown) => data is T; // Validator for JSON objects

    // --- Image Generation Specific Options ---
    /** Desired size for image generation (e.g., '1024x1024'). */
    size?: ModelCompletionSize; // Removed string union for clarity, use specific values or handle string separately
    /** Desired quality for image generation. */
    quality?: ModelCompletionQuality; // Removed string union
    /** Desired style for image generation. */
    style?: ModelCompletionStyle; // Removed string union

    // Add other potential options like user ID, etc.
}

export const ModelProviderSchema = z.enum(["openai", "anthropic", "google", "local", "groq", "deepseek", "perplexity", "grok"])
    .describe("The type of provider implementation");

export type ModelProviderType = z.infer<typeof ModelProviderSchema>;