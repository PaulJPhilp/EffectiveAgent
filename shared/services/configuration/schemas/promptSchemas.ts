import { z } from 'zod';
import { BaseConfigSchema } from './baseSchemas.js';
import type {
    PromptConfig,
    PromptsConfig,
    SystemPromptDefinition,
    SubpromptDefinition
} from '../types/promptConfig.js';

/** System prompt definition schema */
export const SystemPromptDefinitionSchema = z.object({
    promptFileName: z.string(),
    promptTemplate: z.string().optional()
});

/** Subprompt definition schema */
export const SubpromptDefinitionSchema = SystemPromptDefinitionSchema.extend({
    required: z.boolean().default(false),
    order: z.number().default(0)
});

/** Prompt configuration schema */
export const PromptSchema = BaseConfigSchema.extend({
    systemPrompt: SystemPromptDefinitionSchema,
    subprompts: z.array(SubpromptDefinitionSchema).optional()
});

/** Prompts configuration schema */
export const PromptsSchema = z.record(z.string(), PromptSchema);

// Export types
export type SystemPrompt = SystemPromptDefinition;
export type Subprompt = SubpromptDefinition;
export type Prompt = PromptConfig;
export type Prompts = PromptsConfig;
