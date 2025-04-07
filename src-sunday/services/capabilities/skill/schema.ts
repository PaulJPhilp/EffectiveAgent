/**
 * @file Defines Zod schemas for Skill definitions and configurations.
 */

import { z } from "zod";
import type { JsonObject } from "../../types.js"; // Adjust path if needed

// Schema for execution parameters based on @effect/ai internal clues
export const SkillExecutionParamsSchema = z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(), // Use maxTokens (camelCase often preferred in TS/JS)
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().int().positive().optional(), // Add topK
    stopSequences: z.array(z.string()).optional(), // Use stopSequences
    presencePenalty: z.number().min(-2).max(2).optional(), // Keep others if needed
    frequencyPenalty: z.number().min(-2).max(2).optional(),
}).strict(); // Keep strict
export type SkillExecutionParams = z.infer<typeof SkillExecutionParamsSchema>;

// --- SkillDefinitionSchema and SkillsConfigSchema remain the same ---
export const SkillDefinitionSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    intelligenceName: z.string().min(1),
    personaName: z.string().optional(),
    systemPrompt: z.string().optional(),
    promptTemplate: z.string().optional(),
    defaultParams: SkillExecutionParamsSchema.optional().default({}), // Uses updated schema
    inputSchema: z.unknown().optional(),
    outputSchema: z.unknown().optional(),
    requiredTools: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional(),
});
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;

export const SkillsConfigSchema = z.object({
    skills: z.array(SkillDefinitionSchema).min(1),
});
export type SkillsConfig = z.infer<typeof SkillsConfigSchema>;
