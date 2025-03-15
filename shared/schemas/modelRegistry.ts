import { z } from "zod";
import { ModelConfigSchema, type ModelConfig } from "./modelConfig.js";
import { TaskModelMappingSchema, type TaskModelMapping } from "./taskConfig.js";

/**
 * Schema for the complete model registry configuration
 */
export const ModelRegistryConfigSchema = z.object({
    models: z.array(ModelConfigSchema).describe("List of available models"),
    taskMappings: z.array(TaskModelMappingSchema).describe("Mapping of tasks to models"),
    defaultModelId: z.string().describe("Default model ID to use when no task is specified"),
    defaultTemperature: z.number().min(0).max(1).default(0.2).describe("Default temperature to use when no task is specified")
});

export type ModelRegistryConfig = z.infer<typeof ModelRegistryConfigSchema>;

// Re-export types that are commonly used together
export type { ModelConfig, TaskModelMapping };
