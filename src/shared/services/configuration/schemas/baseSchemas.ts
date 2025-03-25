import { z } from 'zod';

/** Base configuration schema */
export const BaseConfigSchema = z.object({
    name: z.string().min(1),
    version: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional()
}).strict();

/** Base model schema */
export const BaseModelSchema = z.object({
    provider: z.string(),
    model: z.string(),
    maxTokens: z.number().optional(),
    temperature: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    presencePenalty: z.number().optional()
});

/** Environment configuration schema */
export const EnvironmentConfigSchema = BaseConfigSchema.extend({
    environment: z.enum(['development', 'production', 'test']),
    debug: z.boolean().optional()
});

// Export types
export type BaseConfig = z.infer<typeof BaseConfigSchema>;
export type BaseModel = z.infer<typeof BaseModelSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;