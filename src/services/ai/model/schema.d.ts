/**
 * @file Defines Effect Schemas for AI Model configurations.
 * @module services/ai/model/schema
 */
import { SubDimensionProficiency } from "@/schema.js";
import { BaseConfigSchema } from "@/services/core/configuration/schema.js";
import { Schema as S } from "effect";
declare const ModelCapabilityDetail_base: S.Class<ModelCapabilityDetail, {
    /** The core capability being described */
    capability: S.Union<[S.Literal<["text-generation"]>, S.Literal<["chat"]>, S.Literal<["function-calling"]>, S.Literal<["vision"]>, S.Literal<["reasoning"]>, S.Literal<["code-generation"]>, S.Literal<["audio"]>, S.Literal<["image-generation"]>, S.Literal<["embeddings"]>, S.Literal<["tool-use"]>, S.Literal<["search"]>, S.Literal<["research"]>]>;
    /** Overall proficiency level for this capability */
    proficiency: S.optional<typeof SubDimensionProficiency>;
    /** Detailed breakdown by sub-dimensions */
    subDimensions: S.optional<S.Record$<typeof S.String, typeof SubDimensionProficiency>>;
}, S.Struct.Encoded<{
    /** The core capability being described */
    capability: S.Union<[S.Literal<["text-generation"]>, S.Literal<["chat"]>, S.Literal<["function-calling"]>, S.Literal<["vision"]>, S.Literal<["reasoning"]>, S.Literal<["code-generation"]>, S.Literal<["audio"]>, S.Literal<["image-generation"]>, S.Literal<["embeddings"]>, S.Literal<["tool-use"]>, S.Literal<["search"]>, S.Literal<["research"]>]>;
    /** Overall proficiency level for this capability */
    proficiency: S.optional<typeof SubDimensionProficiency>;
    /** Detailed breakdown by sub-dimensions */
    subDimensions: S.optional<S.Record$<typeof S.String, typeof SubDimensionProficiency>>;
}>, never, {
    readonly capability: "text-generation" | "chat" | "function-calling" | "vision" | "reasoning" | "code-generation" | "audio" | "image-generation" | "embeddings" | "tool-use" | "search" | "research";
} & {
    readonly proficiency?: SubDimensionProficiency | undefined;
} & {
    readonly subDimensions?: {
        readonly [x: string]: SubDimensionProficiency;
    } | undefined;
}, {}, {}>;
/**
 * Describes a model's capability, allowing for either an overall proficiency
 * or a detailed breakdown by sub-dimensions.
 */
export declare class ModelCapabilityDetail extends ModelCapabilityDetail_base {
}
declare const ModelPricing_base: S.Class<ModelPricing, {
    /** Cost per 1K input tokens in USD */
    inputTokens: S.filter<typeof S.Number>;
    /** Cost per 1K output tokens in USD */
    outputTokens: S.filter<typeof S.Number>;
    /** Optional cost per image for vision models */
    perImage: S.optional<S.filter<typeof S.Number>>;
    /** Optional cost per minute for audio models */
    perMinute: S.optional<S.filter<typeof S.Number>>;
}, S.Struct.Encoded<{
    /** Cost per 1K input tokens in USD */
    inputTokens: S.filter<typeof S.Number>;
    /** Cost per 1K output tokens in USD */
    outputTokens: S.filter<typeof S.Number>;
    /** Optional cost per image for vision models */
    perImage: S.optional<S.filter<typeof S.Number>>;
    /** Optional cost per minute for audio models */
    perMinute: S.optional<S.filter<typeof S.Number>>;
}>, never, {
    readonly inputTokens: number;
} & {
    readonly outputTokens: number;
} & {
    readonly perImage?: number | undefined;
} & {
    readonly perMinute?: number | undefined;
}, {}, {}>;
/**
 * Represents a model's pricing structure.
 */
export declare class ModelPricing extends ModelPricing_base {
}
declare const Model_base: S.Class<Model, {
    /** Unique identifier for the model */
    id: S.SchemaClass<string, string, never>;
    /** Human-readable name */
    name: S.filter<S.filter<S.filter<typeof S.String>>>;
    /** Provider that offers this model */
    provider: S.SchemaClass<string, string, never>;
    /** Model version */
    version: S.optional<S.filter<typeof S.String>>;
    /** Model description */
    description: S.optional<S.filter<typeof S.String>>;
    /** Maximum context window size in tokens */
    contextWindow: S.optional<S.filter<S.filter<typeof S.Number>>>;
    /** Detailed capability information */
    capabilities: S.Array$<typeof ModelCapabilityDetail>;
    /** Pricing information */
    pricing: S.optional<typeof ModelPricing>;
    /** Whether the model is enabled for use */
    enabled: typeof S.Boolean;
    /** Maximum thinking tokens for reasoning models */
    thinkingBudget: S.optional<S.filter<typeof S.Number>>;
    /** Additional metadata */
    metadata: S.optional<S.Record$<typeof S.String, typeof S.Unknown>>;
}, S.Struct.Encoded<{
    /** Unique identifier for the model */
    id: S.SchemaClass<string, string, never>;
    /** Human-readable name */
    name: S.filter<S.filter<S.filter<typeof S.String>>>;
    /** Provider that offers this model */
    provider: S.SchemaClass<string, string, never>;
    /** Model version */
    version: S.optional<S.filter<typeof S.String>>;
    /** Model description */
    description: S.optional<S.filter<typeof S.String>>;
    /** Maximum context window size in tokens */
    contextWindow: S.optional<S.filter<S.filter<typeof S.Number>>>;
    /** Detailed capability information */
    capabilities: S.Array$<typeof ModelCapabilityDetail>;
    /** Pricing information */
    pricing: S.optional<typeof ModelPricing>;
    /** Whether the model is enabled for use */
    enabled: typeof S.Boolean;
    /** Maximum thinking tokens for reasoning models */
    thinkingBudget: S.optional<S.filter<typeof S.Number>>;
    /** Additional metadata */
    metadata: S.optional<S.Record$<typeof S.String, typeof S.Unknown>>;
}>, never, {
    readonly id: string;
} & {
    readonly metadata?: {
        readonly [x: string]: unknown;
    } | undefined;
} & {
    readonly name: string;
} & {
    readonly version?: string | undefined;
} & {
    readonly provider: string;
} & {
    readonly description?: string | undefined;
} & {
    readonly enabled: boolean;
} & {
    readonly contextWindow?: number | undefined;
} & {
    readonly capabilities: readonly ModelCapabilityDetail[];
} & {
    readonly pricing?: ModelPricing | undefined;
} & {
    readonly thinkingBudget?: number | undefined;
}, {}, {}>;
/**
 * Core model configuration schema.
 */
export declare class Model extends Model_base {
}
declare const PublicModelInfo_base: S.Class<PublicModelInfo, {
    /** Unique identifier for the model */
    id: S.SchemaClass<string, string, never>;
    /** Human-readable name */
    name: S.filter<S.filter<S.filter<typeof S.String>>>;
    /** Provider that offers this model */
    provider: S.SchemaClass<string, string, never>;
    /** Model version */
    version: S.optional<S.filter<typeof S.String>>;
    /** Model description */
    description: S.optional<S.filter<typeof S.String>>;
    /** Maximum context window size in tokens */
    contextWindow: S.optional<S.filter<S.filter<typeof S.Number>>>;
    /** Detailed capability information */
    capabilities: S.Array$<typeof ModelCapabilityDetail>;
    /** Pricing information */
    pricing: S.optional<typeof ModelPricing>;
    /** Whether the model is enabled for use */
    enabled: typeof S.Boolean;
    /** Maximum thinking tokens for reasoning models */
    thinkingBudget: S.optional<S.filter<typeof S.Number>>;
}, S.Struct.Encoded<{
    /** Unique identifier for the model */
    id: S.SchemaClass<string, string, never>;
    /** Human-readable name */
    name: S.filter<S.filter<S.filter<typeof S.String>>>;
    /** Provider that offers this model */
    provider: S.SchemaClass<string, string, never>;
    /** Model version */
    version: S.optional<S.filter<typeof S.String>>;
    /** Model description */
    description: S.optional<S.filter<typeof S.String>>;
    /** Maximum context window size in tokens */
    contextWindow: S.optional<S.filter<S.filter<typeof S.Number>>>;
    /** Detailed capability information */
    capabilities: S.Array$<typeof ModelCapabilityDetail>;
    /** Pricing information */
    pricing: S.optional<typeof ModelPricing>;
    /** Whether the model is enabled for use */
    enabled: typeof S.Boolean;
    /** Maximum thinking tokens for reasoning models */
    thinkingBudget: S.optional<S.filter<typeof S.Number>>;
}>, never, {
    readonly id: string;
} & {
    readonly name: string;
} & {
    readonly version?: string | undefined;
} & {
    readonly provider: string;
} & {
    readonly description?: string | undefined;
} & {
    readonly enabled: boolean;
} & {
    readonly contextWindow?: number | undefined;
} & {
    readonly capabilities: readonly ModelCapabilityDetail[];
} & {
    readonly pricing?: ModelPricing | undefined;
} & {
    readonly thinkingBudget?: number | undefined;
}, {}, {}>;
/**
 * Public model information schema (subset of Model for external consumption).
 */
export declare class PublicModelInfo extends PublicModelInfo_base {
}
declare const ModelFileSchema_base: S.Class<ModelFileSchema, {
    name: typeof S.String;
    version: typeof S.String;
} & {
    /** Array of model configurations */
    models: S.Array$<typeof Model>;
}, {
    readonly name: string;
    readonly version: string;
} & {} & {
    readonly models: readonly {
        readonly id: string;
        readonly name: string;
        readonly provider: string;
        readonly enabled: boolean;
        readonly capabilities: readonly {
            readonly capability: "text-generation" | "chat" | "function-calling" | "vision" | "reasoning" | "code-generation" | "audio" | "image-generation" | "embeddings" | "tool-use" | "search" | "research";
            readonly proficiency?: {} | undefined;
            readonly subDimensions?: {
                readonly [x: string]: {};
            } | undefined;
        }[];
        readonly metadata?: {
            readonly [x: string]: unknown;
        } | undefined;
        readonly version?: string | undefined;
        readonly description?: string | undefined;
        readonly contextWindow?: number | undefined;
        readonly pricing?: {
            readonly inputTokens: number;
            readonly outputTokens: number;
            readonly perImage?: number | undefined;
            readonly perMinute?: number | undefined;
        } | undefined;
        readonly thinkingBudget?: number | undefined;
    }[];
} & {}, never, {
    readonly name: string;
} & {
    readonly version: string;
} & {
    readonly models: readonly Model[];
}, BaseConfigSchema, {}>;
/**
 * Configuration file schema for models.
 */
export declare class ModelFileSchema extends ModelFileSchema_base {
}
export type ModelData = typeof Model.Type;
export type ModelCapabilityDetailData = typeof ModelCapabilityDetail.Type;
export type ModelPricingData = typeof ModelPricing.Type;
export type PublicModelInfoData = typeof PublicModelInfo.Type;
export type ModelFileData = typeof ModelFileSchema.Type;
export {};
//# sourceMappingURL=schema.d.ts.map