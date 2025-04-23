/**
 * @file Defines Effect Schemas for AI Model configurations.
 * @module services/ai/model/schema
 */

import { ContextWindowSize, Description, Identifier, ModelCapability, Name, PositiveNumber, Provider, Version } from "@/schema.js";
import { Schema as S } from "effect";

const RateLimitSchema = S.Struct({
    requestsPerMinute: PositiveNumber.pipe(S.optional),
    tokensPerMinute: PositiveNumber.pipe(S.optional)
});

const MetadataSchema = S.Struct({
    description: S.String.pipe(S.optional)
});

// Response format schema
const ResponseFormatSchema = S.Struct({
    type: S.Literal("text", "image", "audio", "embedding"),
    supportedFormats: S.Array(S.String)
});

// === Main Model Definition Schema ===
export class Model extends S.Class<Model>(
    "Model"
)({
    id: Identifier,
    name: Identifier,
    version: Version,
    provider: Provider,
    modelName: Identifier,
    temperature: S.Number.pipe(S.optional),
    maxTokens: PositiveNumber.pipe(S.optional),
    contextWindowSize: ContextWindowSize.pipe(S.optional),
    costPer1kInputTokens: PositiveNumber.pipe(S.optional),
    costPer1kOutputTokens: PositiveNumber.pipe(S.optional),
    capabilities: S.Array(ModelCapability).pipe(S.minItems(1)),
    metadata: MetadataSchema.pipe(S.optional),
    rateLimit: RateLimitSchema.pipe(S.optional),
    supportedLanguages: S.Array(S.String).pipe(S.optional),
    responseFormat: ResponseFormatSchema.pipe(S.optional)
}) { }

export type ModelDefinition = S.Schema.Type<typeof Model>;

// === Root Configuration File Schema ===
export class ModelFile extends S.Class<ModelFile>("ModelsFile")({
    name: Name,
    description: Description.pipe(S.optional),
    version: Version,
    models: S.Array(Model).pipe(S.minItems(1))
}) { }

export type ModelFileDefinition = S.Schema.Type<typeof ModelFile>;