import { z } from 'zod';
import { ThinkingLevels } from '../../model/schemas/modelConfig.js';
import { BaseConfigSchema } from '../../configuration/index.ts';

/** Task configuration schema */
export const TaskSchema = z.object({
    taskName: z.string(),
    primaryModelId: z.string(),
    fallbackModelIds: z.array(z.string()),
    temperature: z.number(),
    requiredCapabilities: z.array(z.enum(['code', 'text-generation', 'chat', 'function-calling', 'vision', 'reasoning', 'tool-use', 'embeddings', 'math'])),
    contextWindowSize: z.enum(['small-context-window', 'medium-context-window', 'large-context-window']),
    promptName: z.string(),
    name: z.string(),
    description: z.string().optional(),
    thinkingLevel: z.enum(ThinkingLevels).optional(),
    tags: z.array(z.string()).optional(),
    maxAttempts: z.number().optional(),
    timeout: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    presencePenalty: z.number().optional(),
    maxTokens: z.number().optional(),
    provider: z.string()
});

export const TaskFileSchema = BaseConfigSchema.extend({
    tasks: z.array(TaskSchema)
} )


// Export types
export type Task = z.infer<typeof TaskSchema>;
export type Tasks = z.infer<typeof TaskFileSchema>;
