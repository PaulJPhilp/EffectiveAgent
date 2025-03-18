import { z } from "zod";
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