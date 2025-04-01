// File: src/shared/services-effect/prompt/schema.ts

import { z } from "zod";
import { BaseConfigSchema, TagsSchema } from '../configuration/schema.js';

// --- Schemas ---
export const PromptTemplateSchema = BaseConfigSchema.extend({
  id: z.string().min(1).describe("Unique identifier for the prompt template"),
  template: z.string().min(1).describe("The prompt template text using LiquidJS syntax"),
  category: z.string().optional().describe("Optional category for organization"),
  requiredVariables: z.array(z.string()).optional().default([])
    .describe("List of variable names that must be provided"),
  metadata: z.object({
    description: z.string().optional(),
    examples: z.array(z.object({
      variables: z.record(z.unknown()),
      output: z.string()
    })).optional(),
    tags: TagsSchema
  }).optional().describe("Additional metadata about the prompt")
}).strict();

export const PromptConfigFileSchema = z.object({
  prompts: z.array(PromptTemplateSchema)
    .min(1, { message: "At least one prompt template is required" })
}).strict();

// --- Inferred Types ---
export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;
export type PromptConfigFile = z.infer<typeof PromptConfigFileSchema>;
