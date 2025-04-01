// File: src/services/model/schema.ts

import { z } from "zod";
import { BaseConfigSchema } from '../configuration/schema.js';

// --- Enums / Const Arrays ---
// Define AND Export these from here
export const ModelCapabilities = [
	"text-generation",
	"chat",
	"function-calling",
	"vision",
	"audio",
	"reasoning",
	"code-generation",
	"tool-use",
	"image-generation",
	"embeddings"
] as const;
export type ModelCapability = typeof ModelCapabilities[number]; // Export derived type

export const ContextWindowSizes = [
	"small",
	"medium",
	"large"
] as const;
export type ContextWindowSize = typeof ContextWindowSizes[number]; // Export derived type

// --- Schemas ---
export const ModelMetadataSchema = z.object({
	description: z.string()
}).catchall(z.unknown());

export const ModelConfigSchema = BaseConfigSchema.extend({
	id: z.string().min(1).describe("Unique identifier for the model"),
	provider: z.enum(["openai", "anthropic", "google", "local", "groq"])
		.describe("Reference to the 'name' of the configured provider"),
	modelName: z.string().min(1).describe("Name/Identifier recognized by the provider's API"),
	temperature: z.number().min(0).max(2).optional().describe("Default sampling temperature"),
	maxTokens: z.number().int().positive().optional().describe("Default maximum completion tokens"),
	contextWindowSize: z.enum(ContextWindowSizes).describe("Approximate context window size category"),
	costPer1kInputTokens: z.number().nonnegative().describe("Approx cost per 1k input tokens (USD)"),
	costPer1kOutputTokens: z.number().nonnegative().describe("Approx cost per 1k output tokens (USD)"),
	rateLimit: z.object({
		requestsPerMinute: z.number().positive(),
		tokensPerMinute: z.number().positive().optional()
	}).describe("Rate limiting configuration"),
	capabilities: z.array(z.enum(ModelCapabilities)).min(1).describe("List of capabilities"),
	metadata: ModelMetadataSchema.describe("Additional model metadata")
}).strict();

export const ModelsSchema = z.array(ModelConfigSchema)
	.min(1, { message: "At least one model must be defined in the 'models' array" });

export const ModelConfigFileSchema = BaseConfigSchema.extend({
	models: ModelsSchema
}).strict();

// --- Inferred Types ---
// Exporting types from here for simplicity, move to types.ts if preferred
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type ModelsConfig = ReadonlyArray<ModelConfig>;
export type ModelConfigFile = z.infer<typeof ModelConfigFileSchema>;
export type ModelMetadata = z.infer<typeof ModelMetadataSchema>;
