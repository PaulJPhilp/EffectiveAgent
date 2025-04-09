/**
 * @file Defines Effect Schemas for AI Model configurations.
 * @module services/ai/model/schema
 */

import { Config, Schema } from "effect";

// === Primitive Schemas ===
const IdentifierSchema = Schema.String.pipe(Schema.minLength(1));
export const ModelNameSchema = IdentifierSchema;
export type ModelName = Schema.Schema.Type<typeof ModelNameSchema>;

const VersionSchema = Schema.String.pipe(
    Schema.pattern(/^\d+\.\d+\.\d+$/) // e.g., 0.1.0
);

const PositiveNumberSchema = Schema.Number.pipe(
    Schema.greaterThanOrEqualTo(0)
);

// === Enum-like Schemas ===
const ContextWindowSizeSchema = Schema.Literal("small", "medium", "large");

export const ModelCapabilitySchema = Schema.Literal(
    "text-generation", "chat", "function-calling", "vision", "reasoning",
    "code-generation", "audio", "image-generation", "embeddings", "tool-use"
);

// === Nested Object Schemas ===
const RateLimitSchema = Schema.Struct({
    requestsPerMinute: PositiveNumberSchema.pipe(Schema.optional),
    tokensPerMinute: PositiveNumberSchema.pipe(Schema.optional)
});

const MetadataSchema = Schema.Struct({
    description: Schema.String.pipe(Schema.optional)
});

// === Main Model Definition Schema ===
export const ModelDefinitionSchema = Schema.Struct({
    id: IdentifierSchema,
    name: IdentifierSchema,
    version: VersionSchema,
    provider: IdentifierSchema,
    modelName: IdentifierSchema,
    temperature: Schema.Number.pipe(Schema.optional),
    maxTokens: PositiveNumberSchema.pipe(Schema.optional),
    contextWindowSize: ContextWindowSizeSchema,
    costPer1kInputTokens: PositiveNumberSchema,
    costPer1kOutputTokens: PositiveNumberSchema,
    capabilities: Schema.Array(ModelCapabilitySchema).pipe(Schema.minItems(1)),
    metadata: MetadataSchema.pipe(Schema.optional),
    rateLimit: RateLimitSchema.pipe(Schema.optional)
});

export type ModelDefinition = Schema.Schema.Type<typeof ModelDefinitionSchema>;

// === Root Configuration File Schema ===
export const ModelsConfigFileSchema = Schema.Struct({
    name: Schema.String,
    version: VersionSchema,
    models: Schema.Array(ModelDefinitionSchema).pipe(Schema.minItems(1))
});

export type ModelsConfigFile = Schema.Schema.Type<typeof ModelsConfigFileSchema>;

