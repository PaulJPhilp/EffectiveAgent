import { z } from "zod";

/**
 * Model capabilities supported by the system
 */
export const ModelCapability = {
    TEXT_GENERATION: "text-generation",
    CHAT: "chat",
    FUNCTION_CALLING: "function-calling",
    VISION: "vision",
    AUDIO: "audio",
    REASONING: "reasoning",
    CODE_GENERATION: "code-generation",
    TOOL_USE: "tool-use",
    IMAGE_GENERATION: "image-generation",
    EMBEDDINGS: "embeddings"
} as const;

export type ModelCapability = typeof ModelCapability[keyof typeof ModelCapability];

/**
 * Context window sizes supported by models
 */
export const ContextWindowSize = {
    SMALL: "small",
    MEDIUM: "medium",
    LARGE: "large"
} as const;

export type ContextWindowSize = typeof ContextWindowSize[keyof typeof ContextWindowSize];

/**
 * Rate limit configuration for a model
 */
export interface RateLimit {
    readonly requestsPerMinute: number;
    readonly tokensPerMinute?: number;
}

/**
 * Model metadata containing additional information
 */
export interface ModelMetadata {
    readonly description: string;
    readonly [key: string]: unknown;
}

/**
 * Configuration for a single model
 */
export interface ModelConfig {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly provider: string;
    readonly modelName: string;
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly contextWindowSize: ContextWindowSize;
    readonly costPer1kInputTokens: number;
    readonly costPer1kOutputTokens: number;
    readonly capabilities: ModelCapability[];
    readonly metadata: ModelMetadata;
    readonly rateLimit: RateLimit;
    readonly tags?: string[];
}

/**
 * Root configuration containing all models
 */
export interface ModelConfigFile {
    readonly name: string;
    readonly version: string;
    readonly models: ModelConfig[];
    readonly tags?: string[];
}

// Zod Schemas

export const RateLimitSchema = z.object({
    requestsPerMinute: z.number().positive(),
    tokensPerMinute: z.number().positive().optional()
});

export const ModelMetadataSchema = z.object({
    description: z.string()
}).catchall(z.unknown());

export const ModelCapabilitySchema = z.enum([
    ModelCapability.TEXT_GENERATION,
    ModelCapability.CHAT,
    ModelCapability.FUNCTION_CALLING,
    ModelCapability.VISION,
    ModelCapability.AUDIO,
    ModelCapability.REASONING,
    ModelCapability.CODE_GENERATION,
    ModelCapability.TOOL_USE,
    ModelCapability.IMAGE_GENERATION,
    ModelCapability.EMBEDDINGS
]);

export const ContextWindowSizeSchema = z.enum([
    ContextWindowSize.SMALL,
    ContextWindowSize.MEDIUM,
    ContextWindowSize.LARGE
]);

export const ModelConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    provider: z.string(),
    modelName: z.string(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
    contextWindowSize: ContextWindowSizeSchema,
    costPer1kInputTokens: z.number().min(0),
    costPer1kOutputTokens: z.number().min(0),
    capabilities: z.array(ModelCapabilitySchema),
    metadata: ModelMetadataSchema,
    rateLimit: RateLimitSchema,
    tags: z.array(z.string()).optional()
});

export const ModelConfigFileSchema = z.object({
    name: z.string(),
    version: z.string(),
    models: z.array(ModelConfigSchema),
    tags: z.array(z.string()).optional()
}); 