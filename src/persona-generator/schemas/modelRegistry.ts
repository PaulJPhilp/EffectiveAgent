import { z } from "zod";

/**
 * Schema for a single model configuration
 */
export const ModelConfigSchema = z.object({
    id: z.string().describe("Unique identifier for the model"),
    provider: z.enum(["openai", "anthropic", "ollama", "local"]).describe("Model provider"),
    modelName: z.string().describe("Name of the model as recognized by the provider"),
    maxTokens: z.number().optional().describe("Maximum tokens the model can handle"),
    temperature: z.number().min(0).max(1).default(0.2).describe("Temperature setting for the model"),
    contextWindow: z.number().optional().describe("Context window size in tokens"),
    costPer1kTokens: z.number().optional().describe("Cost per 1k tokens in USD"),
    capabilities: z.array(z.enum([
        "text-generation",
        "chat",
        "embeddings",
        "function-calling",
        "vision",
        "audio"
    ])).describe("Capabilities of the model")
});

/**
 * Schema for task-to-model mapping
 */
export const TaskModelMappingSchema = z.object({
    taskName: z.string().describe("Name of the task"),
    primaryModelId: z.string().describe("ID of the primary model to use for this task"),
    fallbackModelIds: z.array(z.string()).optional().describe("IDs of fallback models to use if primary is unavailable"),
    description: z.string().optional().describe("Description of the task")
});

/**
 * Schema for the complete model registry configuration
 */
export const ModelRegistryConfigSchema = z.object({
    models: z.array(ModelConfigSchema).describe("List of available models"),
    taskMappings: z.array(TaskModelMappingSchema).describe("Mapping of tasks to models"),
    defaultModelId: z.string().describe("Default model ID to use when no task is specified")
});

/**
 * Type definitions derived from the schemas
 */
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type TaskModelMapping = z.infer<typeof TaskModelMappingSchema>;
export type ModelRegistryConfig = z.infer<typeof ModelRegistryConfigSchema>; 