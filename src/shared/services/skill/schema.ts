// File: src/shared/services-effect/skill/schema.ts

import { z } from "zod";
import { BaseConfigSchema, TagsSchema } from '../configuration/schema.js';

// --- Enums / Const Arrays ---
export const SkillTypes = ["text", "code", "math", "reasoning", "search"] as const;
export type SkillType = typeof SkillTypes[number];

export const OutputFormats = ["text", "json", "markdown", "code"] as const;
export type OutputFormat = typeof OutputFormats[number];

// --- Schemas ---
export const SkillMetadataSchema = z.object({
  description: z.string().optional(),
  examples: z.array(z.object({
    input: z.record(z.unknown()),
    output: z.unknown()
  })).optional(),
  tags: TagsSchema
}).strict();

export const SkillConfigSchema = BaseConfigSchema.extend({
  id: z.string().min(1).describe("Unique identifier for the skill"),
  type: z.enum(SkillTypes).describe("Type of skill"),
  promptId: z.string().min(1).describe("ID of the prompt template to use"),
  modelId: z.string().min(1).describe("ID of the model to use"),
  outputFormat: z.enum(OutputFormats).describe("Expected output format"),
  category: z.string().optional().describe("Optional category for organization"),
  requiredCapabilities: z.array(z.string()).optional().default([])
    .describe("Required model capabilities"),
  requiredVariables: z.array(z.string()).optional().default([])
    .describe("Required input variables"),
  modelOptions: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional()
  }).optional().describe("Default model options"),
  outputSchema: z.any().optional().describe("Optional JSON schema for output validation"),
  metadata: SkillMetadataSchema.optional()
}).strict();

export const SkillConfigFileSchema = z.object({
  skills: z.array(SkillConfigSchema)
    .min(1, { message: "At least one skill configuration is required" })
}).strict();

// --- Inferred Types ---
export type SkillConfig = z.infer<typeof SkillConfigSchema>;
export type SkillConfigFile = z.infer<typeof SkillConfigFileSchema>;
