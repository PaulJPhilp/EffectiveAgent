import { BaseConfigSchema } from "@services/configuration/schemas/baseSchemas.js";
import { TaskSchema, type Task } from "@services/task/schemas/taskSchemas.js";
import { z } from "zod";
import { ModelConfigSchema, type ModelConfig } from "./modelConfig.js";

/**
 * Schema for the complete model registry configuration
 */
export const ModelRegistryConfigSchema = BaseConfigSchema.extend({
    models: z.array(ModelConfigSchema).describe("List of available models"),
    taskMappings: z.array(TaskSchema).describe("Mapping of tasks to models"),
    defaultModelId: z.string().describe("Default model ID to use when no task is specified"),
    defaultTemperature: z.number().min(0).max(1).default(0.2).describe("Default temperature to use when no task is specified")
});

export type ModelRegistryConfig = z.infer<typeof ModelRegistryConfigSchema>;

// Re-export types that are commonly used together
export type { ModelConfig, Task };
