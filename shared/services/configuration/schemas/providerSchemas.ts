import { z } from 'zod';
import { BaseConfigSchema } from './baseSchemas.js';
import { ModelParametersSchema } from './modelSchemas.js';

/**
 * Provider model configuration schema
 */
export const ProviderModelSchema = ModelParametersSchema.extend({
    name: z.string().min(1),
});

/**
 * Provider configuration schema
 */
export const ProviderConfigSchema = BaseConfigSchema.extend({
    models: z.record(z.string().min(1), ProviderModelSchema)
});

/**
 * Providers configuration schema
 */
export const ProvidersConfigSchema = z.record(
    z.string().min(1),
    ProviderConfigSchema
)

/**
 * Provider model configuration type
 */
export type ProviderModelConfig = z.infer<typeof ProviderModelSchema>;

/**
 * Provider configuration type
 */
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

/**
 * Providers configuration type
 */
export type ProvidersConfig = z.infer<typeof ProvidersConfigSchema>;

/**
 * Model parameters for API calls
 */
export interface ModelParameters {
    readonly model: string;
    readonly maxTokens?: number;
    readonly temperature?: number;
    readonly frequencyPenalty?: number;
    readonly presencePenalty?: number;
}
