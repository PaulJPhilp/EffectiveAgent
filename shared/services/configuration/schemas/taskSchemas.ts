import { z } from 'zod';
import type { TaskDefinition } from '../types/taskConfig.js';
import { BaseConfigSchema } from './baseSchemas.ts';

/** Task configuration schema */
export const TaskSchema = BaseConfigSchema.extend({
    model: z.string(),
    prompt: z.string(),
    maxTokens: z.number().optional(),
    temperature: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    presencePenalty: z.number().optional(),
    tools: z.array(z.string()).optional(),
    resources: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

/** Tasks configuration schema */
export const TasksSchema = z.record(z.string(), TaskSchema);

// Export types
export type Task = z.infer<typeof TaskSchema>;
export type Tasks = z.infer<typeof TasksSchema>;
