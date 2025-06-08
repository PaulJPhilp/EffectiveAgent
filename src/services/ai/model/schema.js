/**
 * @file Defines Effect Schemas for AI Model configurations.
 * @module services/ai/model/schema
 */
import { ContextWindowSize, Description, ModelCapability, Name, PositiveNumber, SubDimensionProficiency, Version } from "@/schema.js";
import { BaseConfigSchema } from "@/services/core/configuration/schema.js";
import { Schema as S } from "effect";
import { PROVIDER_NAMES } from "../provider/provider-universe.js";
import { MODEL_IDS } from "./model-universe.js";
/**
 * Describes a model's capability, allowing for either an overall proficiency
 * or a detailed breakdown by sub-dimensions.
 */
export class ModelCapabilityDetail extends S.Class("ModelCapabilityDetail")({
    /** The core capability being described */
    capability: ModelCapability,
    /** Overall proficiency level for this capability */
    proficiency: S.optional(SubDimensionProficiency),
    /** Detailed breakdown by sub-dimensions */
    subDimensions: S.optional(S.Record({ key: S.String, value: SubDimensionProficiency })),
}) {
}
/**
 * Represents a model's pricing structure.
 */
export class ModelPricing extends S.Class("ModelPricing")({
    /** Cost per 1K input tokens in USD */
    inputTokens: PositiveNumber,
    /** Cost per 1K output tokens in USD */
    outputTokens: PositiveNumber,
    /** Optional cost per image for vision models */
    perImage: S.optional(PositiveNumber),
    /** Optional cost per minute for audio models */
    perMinute: S.optional(PositiveNumber),
}) {
}
/**
 * Core model configuration schema.
 */
export class Model extends S.Class("Model")({
    /** Unique identifier for the model */
    id: S.Literal(...MODEL_IDS),
    /** Human-readable name */
    name: Name,
    /** Provider that offers this model */
    provider: S.Literal(...PROVIDER_NAMES),
    /** Model version */
    version: S.optional(Version),
    /** Model description */
    description: S.optional(Description),
    /** Maximum context window size in tokens */
    contextWindow: S.optional(ContextWindowSize),
    /** Detailed capability information */
    capabilities: S.Array(ModelCapabilityDetail),
    /** Pricing information */
    pricing: S.optional(ModelPricing),
    /** Whether the model is enabled for use */
    enabled: S.Boolean,
    /** Maximum thinking tokens for reasoning models */
    thinkingBudget: S.optional(PositiveNumber),
    /** Additional metadata */
    metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
}) {
}
/**
 * Public model information schema (subset of Model for external consumption).
 */
export class PublicModelInfo extends S.Class("PublicModelInfo")({
    /** Unique identifier for the model */
    id: S.Literal(...MODEL_IDS),
    /** Human-readable name */
    name: Name,
    /** Provider that offers this model */
    provider: S.Literal(...PROVIDER_NAMES),
    /** Model version */
    version: S.optional(Version),
    /** Model description */
    description: S.optional(Description),
    /** Maximum context window size in tokens */
    contextWindow: S.optional(ContextWindowSize),
    /** Detailed capability information */
    capabilities: S.Array(ModelCapabilityDetail),
    /** Pricing information */
    pricing: S.optional(ModelPricing),
    /** Whether the model is enabled for use */
    enabled: S.Boolean,
    /** Maximum thinking tokens for reasoning models */
    thinkingBudget: S.optional(PositiveNumber),
}) {
}
/**
 * Configuration file schema for models.
 */
export class ModelFileSchema extends BaseConfigSchema.extend("ModelFileSchema")({
    /** Array of model configurations */
    models: S.Array(Model),
}) {
}
//# sourceMappingURL=schema.js.map