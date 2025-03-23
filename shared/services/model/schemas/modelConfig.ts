import { z } from "zod";
import type { BaseConfig } from '../../configuration/types/configTypes.js';

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
 * Model metadata schema
 */
export const ModelMetadataSchema = z.object({
    thinkingLevel: z.enum(ThinkingLevels).optional()
        .describe("Thinking level for reasoning models"),
    description: z.string().optional()
        .describe("Additional model description"),
    tags: z.array(z.string()).optional()
        .describe("Custom tags for model categorization")
});

/**
 * Schema for a single model configuration
 */
export const ModelConfigSchema = z.object({
    id: z.string().describe("Unique identifier for the model"),
    provider: z.enum(["openai", "anthropic", "google", "local", "grok", 
        "deepseek"]).describe("Model provider"),
    modelName: z.string().describe("Name of the model as recognized by provider"),
    maxTokens: z.number().optional()
        .describe("Maximum tokens the model can handle"),
    rateLimit: z.object({
        requestsPerMinute: z.number(),
        tokensPerMinute: z.number().optional()
    }).optional().describe("Rate limiting configuration"),
    contextWindowSize: z.enum(ContextWindowSizes)
        .describe("Context window size category"),
    costPer1kTokens: z.number().optional()
        .describe("Cost per 1k tokens in USD"),
    capabilities: z.array(z.enum(ModelCapabilities))
        .describe("Capabilities of the model"),
    metadata: ModelMetadataSchema.optional()
        .describe("Additional model metadata")
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/**
 * Model group schema
 */
export const ModelGroupSchema = z.object({
    name: z.string().describe("Group name"),
    description: z.string().describe("Group description"),
    models: z.record(z.string(), ModelConfigSchema)
        .describe("Models in this group")
});

/**
 * Models configuration schema
 */
export const ModelsConfigSchema = z.object({
    name: z.string().describe("Configuration name"),
    version: z.string().describe("Configuration version"),
    updated: z.string().describe("Last update timestamp"),
    groups: z.record(z.string(), ModelGroupSchema)
        .describe("Model groups")
}).strict();

/**
 * Models configuration type that extends BaseConfig
 */
export interface ModelsConfig extends BaseConfig {
    readonly updated: string;
    readonly groups: Record<string, z.infer<typeof ModelGroupSchema>>;
} 