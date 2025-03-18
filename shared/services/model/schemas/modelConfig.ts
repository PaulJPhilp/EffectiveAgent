import { z } from "zod";

/**
 * Model capability types
 */
export const ModelCapabilities = [
    "text-generation",
    "chat",
    "function-calling",
    "vision",
    "audio",
    "reasoning",
    "text-to-image",
    "code-generation",
    "embeddings",
    "tool-use",
    "ocr",
    "search",
    "math",
    "code"
] as const;

export type ModelCapability = typeof ModelCapabilities[number];

/**
 * Thinking levels for reasoning models
 */
export const ThinkingLevels = ["none", "low", "medium", "high"] as const;
export type ThinkingLevel = typeof ThinkingLevels[number];

/**
 * Context window size categories
 */
export const ContextWindowSizes = [
    "small-context-window",
    "medium-context-window",
    "large-context-window",
    "extra-large-context-window"
] as const;
export type ContextWindowSize = typeof ContextWindowSizes[number];

/**
 * Schema for a single model configuration
 */
export const ModelConfigSchema = z.object({
    id: z.string().describe("Unique identifier for the model"),
    provider: z.enum(["openai", "anthropic", "google", "local", "grok", "deepseek"]).describe("Model provider"),
    modelName: z.string().describe("Name of the model as recognized by the provider"),
    maxTokens: z.number().optional().describe("Maximum tokens the model can handle"),
    rateLimit: z.object({
        requestsPerMinute: z.number(),
        tokensPerMinute: z.number().optional()
    }).optional().describe("Rate limiting configuration"),
    contextWindowSize: z.enum(ContextWindowSizes).describe("Context window size category"),
    costPer1kTokens: z.number().optional().describe("Cost per 1k tokens in USD"),
    capabilities: z.array(z.enum(ModelCapabilities)).describe("Capabilities of the model")
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>; 