import { z } from 'zod';
import { BaseConfigSchema } from './baseSchemas.js';
import type { ModelsConfig, TextModelConfig, EmbeddingModelConfig } from '../types/modelConfig.js';

/** Model parameters schema - matches the format from models.json */
export const ModelParametersSchema = z.object({
    maxTokens: z.number().optional(),
    temperature: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    presencePenalty: z.number().optional()
});

/** Text model configuration schema */
export const TextModelSchema = ModelParametersSchema.extend({
    provider: z.string(),
    model: z.string()
});

/** Embedding model configuration schema */
export const EmbeddingModelSchema = z.object({
    provider: z.string(),
    model: z.string(),
    dimensions: z.number()
});

/** Models configuration schema */
export const ModelsSchema = z.object({
    text: z.record(z.string(), TextModelSchema),
    embedding: z.record(z.string(), EmbeddingModelSchema)
});

/** Provider model configuration schema */
export const ProviderModelSchema = ModelParametersSchema.extend({
    name: z.string()
});

/** Provider configuration schema */
export const ProviderSchema = BaseConfigSchema.extend({
    models: z.record(z.string(), ProviderModelSchema)
});

/** Providers configuration schema */
export const ProvidersSchema = z.record(z.string(), ProviderSchema);

// Export types
export type TextModel = TextModelConfig;
export type EmbeddingModel = EmbeddingModelConfig;
export type Models = ModelsConfig;
export type ProviderModel = z.infer<typeof ProviderModelSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type Providers = z.infer<typeof ProvidersSchema>;
