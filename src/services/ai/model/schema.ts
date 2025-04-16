/**
 * @file Defines Effect Schemas for AI Model configurations.
 * @module services/ai/model/schema
 */

import { Config, Schema as S } from "effect";
import { PositiveNumber, Version, Name, ModelCapability, Identifier, ContextWindowSize, Description } from "@/schema.js";

const RateLimitSchema = S.Struct({
    requestsPerMinute: PositiveNumber.pipe(S.optional),
    tokensPerMinute: PositiveNumber.pipe(S.optional)
});

const MetadataSchema = S.Struct({
    description: S.String.pipe(S.optional)
});

// === Main Model Definition Schema ===
export class Model extends S.Class<Model>(
    "ModelDefinition"
)({
    id: Identifier,
    name: Identifier,
    version: Version,
    provider: Identifier,
    modelName: Identifier,
    temperature: S.Number.pipe(S.optional),
    maxTokens: PositiveNumber.pipe(S.optional),
    contextWindowSize: ContextWindowSize.pipe(S.optional),
    costPer1kInputTokens: PositiveNumber.pipe(S.optional),
    costPer1kOutputTokens: PositiveNumber.pipe(S.optional),
    capabilities: S.Array(ModelCapability).pipe(S.minItems(1)),
    metadata: MetadataSchema.pipe(S.optional),
    rateLimit: RateLimitSchema.pipe(S.optional)
}) {}

export type ModelDefinition = S.Schema.Type<typeof Model>;

// === Root Configuration File Schema ===
export class ModelFile extends S.Class<ModelFile>("ModelsFile")({
    name: Name,
    description: Description.pipe(S.optional),
    version: Version,
    models: S.Array(Model).pipe(S.minItems(1))
}) {}

