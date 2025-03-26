import { TaskCapabilities } from '@/types.ts';
import { z } from 'zod';



/**
 * Schema for context window sizes
 * Defines the range of context window sizes a model must support
 */
export const ContextWindowSizes = [
    'small-context-window',
    'medium-context-window',
    'large-context-window'
] as const;

/**
 * Schema for thinking levels
 * Defines the cognitive complexity a model must support
 */
export const ThinkingLevels = [
    'basic',
    'medium',
    'advanced'
] as const;

/**
 * Schema for individual task configuration
 */
export const TaskConfigSchema = z.object({
    taskName: z.string().min(1, 'Task name is required'),
    name: z.string().min(1, 'Display name is required'),
    description: z.string().optional(),
    primaryModelId: z.string().min(1, 'Primary model ID is required'),
    fallbackModelIds: z.array(z.string()).default([]),
    temperature: z.number().min(0).max(1).default(0.7),
    requiredCapabilities: z.array(z.enum(TaskCapabilities))
        .min(1, 'At least one capability is required'),
    contextWindowSize: z.enum(ContextWindowSizes),
    promptName: z.string().min(1, 'Prompt name is required'),
    thinkingLevel: z.enum(ThinkingLevels).optional(),
    tags: z.array(z.string()).optional(),
    maxAttempts: z.number().int().positive().optional(),
    timeout: z.number().int().positive().optional(),
    frequencyPenalty: z.number().min(0).max(2).optional(),
    presencePenalty: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    provider: z.string().optional()
});

/**
 * Schema for task configuration file
 */
export const TaskConfigFileSchema = z.object({
    name: z.string().min(1),
    version: z.string(),
    description: z.string().optional(),
    tasks: z.array(TaskConfigSchema)
}).strict();

// Export types derived from schemas
export type TaskConfig = z.infer<typeof TaskConfigSchema>;
export type TaskConfigFile = z.infer<typeof TaskConfigFileSchema>; 