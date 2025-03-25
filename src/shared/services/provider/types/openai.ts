import { z } from 'zod';
import type { BaseConfig } from '../../configuration/types.js';

/**
 * OpenAI model configuration schema
 */
export const OpenAIModelConfigSchema = z.object({
    name: z.string().min(1),
    maxTokens: z.number().int().positive(),
    temperature: z.number().min(0).max(2).default(0.7),
    frequencyPenalty: z.number().min(-2).max(2).default(0),
    presencePenalty: z.number().min(-2).max(2).default(0),
    thinkingLevel: z.enum(['none', 'low', 'medium', 'high']).default('medium')
}).strict();

/**
 * OpenAI provider configuration schema
 */
export const OpenAIConfigSchema = z.object({
    name: z.literal('openai'),
    description: z.string().min(1),
    models: z.record(z.string().min(1), OpenAIModelConfigSchema)
}).strict();

/**
 * OpenAI model configuration type
 * @extends BaseConfig - Inherits base configuration properties
 */
export interface OpenAIModelConfig extends BaseConfig {
    readonly name: string;
    readonly maxTokens: number;
    readonly temperature: number;
    readonly frequencyPenalty: number;
    readonly presencePenalty: number;
    readonly thinkingLevel: 'none' | 'low' | 'medium' | 'high';
}

/**
 * OpenAI provider configuration type
 * @extends BaseConfig - Inherits base configuration properties
 */
export interface OpenAIConfig extends BaseConfig {
    readonly name: 'openai';
    readonly description: string;
    readonly models: Readonly<Record<string, OpenAIModelConfig>>;
}

/**
 * OpenAI model parameters for API calls
 * Represents the actual parameters sent to the OpenAI API
 */
export interface OpenAIModelParams {
    readonly model: string;
    readonly maxTokens?: number;
    readonly temperature?: number;
    readonly frequencyPenalty?: number;
    readonly presencePenalty?: number;
}
