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
    "search"
] as const;

export type ModelCapability = typeof ModelCapabilities[number];

/**
 * Thinking levels for reasoning models
 */
export const ThinkingLevels = ["low", "medium", "high"] as const;
export type ThinkingLevel = typeof ThinkingLevels[number];

/**
 * Schema for a single model configuration
 */
export const ModelConfigSchema = z.object({
    id: z.string().describe("Unique identifier for the model"),
    provider: z.enum(["openai", "anthropic", "google", "local"]).describe("Model provider"),
    modelName: z.string().describe("Name of the model as recognized by the provider"),
    maxTokens: z.number().optional().describe("Maximum tokens the model can handle"),
    contextWindow: z.number().optional().describe("Context window size in tokens"),
    costPer1kTokens: z.number().optional().describe("Cost per 1k tokens in USD"),
    capabilities: z.array(z.enum(ModelCapabilities)).describe("Capabilities of the model"),
    thinkingLevel: z.enum(ThinkingLevels).optional().describe("Reasoning depth level (only applicable for models with reasoning capability)")
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>; 