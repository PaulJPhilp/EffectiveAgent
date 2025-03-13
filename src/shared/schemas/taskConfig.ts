import { z } from "zod";
import { ModelCapabilities, ThinkingLevels } from "./modelConfig.js";

/**
 * Context window size requirements for tasks
 */
export const ContextWindowSizes = ["small-context-window", "medium-context-window", "large-context-window"] as const;
export type ContextWindowSize = typeof ContextWindowSizes[number];

/**
 * Schema for task-to-model mapping
 */
export const TaskModelMappingSchema = z.object({
    taskName: z.string().describe("Name of the task"),
    primaryModelId: z.string().describe("ID of the primary model to use for this task"),
    fallbackModelIds: z.array(z.string()).optional().describe("IDs of fallback models to use if primary is unavailable"),
    temperature: z.number().min(0).max(1).default(0.2).describe("Temperature setting for this task"),
    requiredCapabilities: z.array(z.enum(ModelCapabilities)).describe("Required model capabilities for this task"),
    contextWindowSize: z.enum(ContextWindowSizes).default("small-context-window").describe("Required context window size"),
    thinkingLevel: z.enum(ThinkingLevels).optional().describe("Required thinking level for reasoning tasks"),
    description: z.string().optional().describe("Description of the task")
});

export type TaskModelMapping = z.infer<typeof TaskModelMappingSchema>; 