/**
 * @file Defines Effect Schemas for AI Model configurations.
 * @module services/ai/model/schema
 */

import {
    ModelCapabilityDetail
} from "@/models/schema.js";
import { ContextWindowSize, Description, Identifier, ModelCapability, Name, PositiveNumber, Version } from "@/schema.js";
import { Schema as S } from "effect";
import { PROVIDER_NAMES } from "../provider/provider-universe.js";
import { MODEL_IDS } from "./model-universe.js";

export const Provider = S.Literal(...PROVIDER_NAMES);
export type Provider = typeof PROVIDER_NAMES[number];

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

/**
 * Local representation matching the CoreModelDefinition structure,
 * but using locally defined literals (like MODEL_IDS).
 * Includes potentially derived proficiency data.
 */
export class Model extends S.Class<Model>("Model")({
    /** Unique identifier for the model */
    id: S.Literal(...MODEL_IDS),
    /** The provider or company */
    provider: Provider,
    /** Human-readable name */
    displayName: Name,
    /** List of capabilities as claimed by the vendor/provider. */
    vendorCapabilities: S.Array(ModelCapability),
    /** List of capabilities with calculated proficiency tiers. */
    derivedProficiencies: S.Array(ModelCapabilityDetail).pipe(S.optional),
    // --- Other fields from model-universe ---
    name: Identifier,
    version: Version,
    modelName: Identifier,
    temperature: S.Number.pipe(S.optional),
    maxTokens: PositiveNumber.pipe(S.optional),
    contextWindowSize: ContextWindowSize.pipe(S.optional),
    costPer1kInputTokens: PositiveNumber.pipe(S.optional),
    costPer1kOutputTokens: PositiveNumber.pipe(S.optional),
    metadata: S.Struct({ description: S.String.pipe(S.optional) }).pipe(S.optional),
    supportedLanguages: S.Array(S.String).pipe(S.optional),
    responseFormat: S.Struct({
        type: S.Literal("text", "image", "audio", "embedding"),
        supportedFormats: S.Array(S.String)
    }).pipe(S.optional)
}) { }

export type ModelDefinition = S.Schema.Type<typeof Model>;

// --- Public Model Information Schema (Exposed by the API) ---
/**
 * Schema for the model information publicly exposed by the ModelService API.
 * Excludes derived proficiency data.
 */
export class PublicModelInfo extends S.Class<PublicModelInfo>("PublicModelInfo")({
    /** Unique identifier for the model */
    id: S.Literal(...MODEL_IDS),
    /** The provider or company */
    provider: Provider,
    /** Human-readable name */
    displayName: Name,
    /** List of capabilities as claimed by the vendor/provider. */
    vendorCapabilities: S.Array(ModelCapability),
    // --- Other fields from model-universe (excluding derivedProficiencies) ---
    name: Identifier,
    version: Version,
    modelName: Identifier,
    temperature: S.Number.pipe(S.optional),
    maxTokens: PositiveNumber.pipe(S.optional),
    contextWindowSize: ContextWindowSize.pipe(S.optional),
    costPer1kInputTokens: PositiveNumber.pipe(S.optional),
    costPer1kOutputTokens: PositiveNumber.pipe(S.optional),
    metadata: S.Struct({ description: S.String.pipe(S.optional) }).pipe(S.optional),
    supportedLanguages: S.Array(S.String).pipe(S.optional),
    responseFormat: S.Struct({
        type: S.Literal("text", "image", "audio", "embedding"),
        supportedFormats: S.Array(S.String)
    }).pipe(S.optional)
}) { }

export type PublicModelInfoDefinition = S.Schema.Type<typeof PublicModelInfo>;

// --- Root Configuration File Schema --- 
// Updated to contain PublicModelInfo instead of Model
export class ModelFile extends S.Class<ModelFile>("ModelsFile")({
    name: Name,
    description: Description.pipe(S.optional),
    version: Version,
    models: S.Array(PublicModelInfo).pipe(S.minItems(1)) // Use PublicModelInfo
}) { }

export type ModelFileDefinition = S.Schema.Type<typeof ModelFile>;