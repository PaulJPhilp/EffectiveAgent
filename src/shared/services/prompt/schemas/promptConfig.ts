import { z } from "zod";
import { BaseConfigSchema } from "../../configuration/schemas/baseSchemas.js";

/**
 * Schema for defining a system prompt
 */
export const SystemPromptDefinitionSchema = z.object({
	promptFileName: z.string().describe("Name of the prompt template file"),
	promptTemplate: z.string().describe("Template for the prompt to use for this task").optional()
});

export type SystemPromptDefinition = z.infer<typeof SystemPromptDefinitionSchema>;

export const SubpromptDefinitionSchema = SystemPromptDefinitionSchema.extend({
	required: z.boolean().default(false).describe("Whether the subprompt is required"),
	order: z.number().default(0).describe("Order of the subprompt")
});

export type SubpromptDefinition = z.infer<typeof SubpromptDefinitionSchema>;

/**
 * Schema for prompt templates
 */
export const PromptTemplateSchema = BaseConfigSchema.extend({
	id: z.string().describe("Unique identifier for the prompt template"),
	category: z.string().optional().describe("Category for the prompt template"),
	content: z.string().describe("Content of the prompt template"),
	variables: z.array(z.string()).default([]).describe("Variables used in the template"),
	systemPrompt: SystemPromptDefinitionSchema.optional(),
	subprompts: z.array(SubpromptDefinitionSchema).optional().describe("Subprompts for the prompt template")
});

/**
 * Schema for the entire prompt configuration file
 */
export const PromptConfigFileSchema = BaseConfigSchema.extend({
	prompts: z.array(PromptTemplateSchema).describe("Array of prompt templates")
});

// Type exports
export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;
export type PromptConfig = z.infer<typeof PromptTemplateSchema>;
export type PromptConfigFile = z.infer<typeof PromptConfigFileSchema>;
export type Prompts = Record<string, PromptConfig>;