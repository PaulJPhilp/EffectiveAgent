import { z } from "zod";


export const SystemPromptDefinitionSchema = z.object({
	promptFileName: z.string().describe("Name of the prompt template file"),
	promptTemplate: z.string().describe("Template for the prompt to use for this task").optional()
})

export type SystemPromptDefinition = z.infer<typeof SystemPromptDefinitionSchema>;

export const SubpromptDefinitionSchema = SystemPromptDefinitionSchema.extend({
	required: z.boolean().default(false).describe("Whether the subprompt is required"),
	order: z.number().default(0).describe("Order of the subprompt")
});

export type SubpromptDefinition = z.infer<typeof SubpromptDefinitionSchema>;

export const PromptDefinitionSchema = z.object({
	name: z.string().describe("Name of the prompt template"),
	description: z.string().optional().describe("Description of the prompt template"),
	systemPrompt: SystemPromptDefinitionSchema,
	subprompts: z.array(SubpromptDefinitionSchema).optional().describe("Subprompts for the prompt template")
});

export type PromptDefinition = z.infer<typeof PromptDefinitionSchema>;