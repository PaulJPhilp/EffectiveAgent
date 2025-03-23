import { z } from "zod";
import type { BaseConfig } from '../../configuration/types/configTypes.js';
import {
    ContextWindowSizes,
    ModelCapabilities,
    ThinkingLevels
} from "../../model/schemas/modelConfig.js";
import { PromptDefinitionSchema } from "../../prompt/schemas/promptConfig.js";

/**
 * Schema for task-to-model mapping
 */
export const TaskDefinitionSchema = z.object({
    taskName: z.string().describe("Name of the task"),
    primaryModelId: z.string().describe("ID of the primary model to use for this task"),
    fallbackModelIds: z.array(z.string()).describe("IDs of fallback models to use if primary is unavailable"),
    temperature: z.number().min(0).max(1).default(0.2).describe("Temperature setting for this task"),
    requiredCapabilities: z.array(z.enum(ModelCapabilities)).describe("Required model capabilities for this task"),
    contextWindowSize: z.enum(ContextWindowSizes).describe("Required context window size"),
    thinkingLevel: z.enum(ThinkingLevels).describe("Required thinking level for reasoning tasks"),
    description: z.string().describe("Description of the task"),
    promptName: z.string().describe("Name of the prompt to use for this task"),
    prompt: PromptDefinitionSchema.optional()
});

export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;

/**
 * Schema for task configuration
 */
export const TasksConfigSchema = z.object({
    name: z.string().describe("Configuration name"),
    version: z.string().describe("Configuration version"),
    updated: z.string().describe("Last update timestamp"),
    groups: z.record(z.object({
        name: z.string().describe("Group name"),
        description: z.string().describe("Group description"),
        tasks: z.record(z.string(), TaskDefinitionSchema).describe("Tasks in this group")
    })).describe("Task groups")
});

/**
 * Task configuration type
 */
export interface TasksConfig extends BaseConfig {
    readonly updated: string;
    readonly groups: Record<string, {
        readonly name: string;
        readonly description: string;
        readonly tasks: Record<string, TaskDefinition>;
    }>;
} 