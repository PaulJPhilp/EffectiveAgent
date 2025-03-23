import { z } from 'zod';
import { BaseConfigSchema } from '../../configuration/schemas/baseSchemas';

/** Task configuration schema */
export const TaskSchema = BaseConfigSchema.extend({
    promptName: z.string(),
    primaryModelId: z.string(),
    temperature: z.number().optional(),
    thinkingLevel: z.enum(['none', 'low', 'medium', 'high']).optional(),
});

/** Tasks configuration schema */
export const TasksSchema = z.record(z.string(), TaskSchema);

// Export types
export type Task = z.infer<typeof TaskSchema>;
export type Tasks = z.infer<typeof TasksSchema>;
