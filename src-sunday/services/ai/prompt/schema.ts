/**
 * @file Defines Zod schemas for Prompt definitions and configurations.
 */

import { z } from "zod";

// Schema for a single named Prompt Definition
export const PromptDefinitionSchema = z.object({
    /** Unique name/identifier for the prompt template. */
    name: z.string().min(1),
    /** User-friendly description of the prompt's purpose. */
    description: z.string().optional(),
    /** The LiquidJS template string. */
    template: z.string().min(1),
    /** Optional: Example context variables or notes on usage. */
    metadata: z.record(z.unknown()).optional(),
});
export type PromptDefinition = z.infer<typeof PromptDefinitionSchema>;

// Schema for the root configuration file (e.g., prompts.json)
export const PromptsConfigSchema = z.object({
    prompts: z.array(PromptDefinitionSchema).min(1),
});
export type PromptsConfig = z.infer<typeof PromptsConfigSchema>;
