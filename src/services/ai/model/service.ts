/**
 * @file Implements the ModelService which provides access to AI model configurations and metadata.
 * @module services/ai/model/service
 * 
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * !!! WARNING: This file uses the Effect.Service pattern and MUST NOT be modified by AI agents !!!
 * !!! unless explicitly instructed. The pattern used here is the canonical implementation.      !!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

import { ModelCapability } from "@/schema.js";
import { Effect, Layer, Schema as S } from "effect";
import type { ModelServiceApi } from "./api.js";
import { ModelNotFoundError } from "./errors.js";
import { MODEL_UNIVERSE } from "./model-universe.js";

/**
 * Implementation of the ModelService using Effect.Service pattern.
 * This service provides access to AI model configurations and metadata.
 */
export class ModelService extends Effect.Service<ModelServiceApi>()("ModelService", {
    effect: Effect.succeed({
        exists: (modelId: string): Effect.Effect<boolean, ModelNotFoundError> =>
            Effect.succeed(MODEL_UNIVERSE.some(m => m.id === modelId)),

        load: (): Effect.Effect<{ models: typeof MODEL_UNIVERSE, name: string, version: string }, never> =>
            Effect.succeed({
                name: "ModelUniverse",
                version: "1.0.0",
                models: MODEL_UNIVERSE
            }),

        getProviderName: (modelId: string): Effect.Effect<string, never> =>
            Effect.succeed(MODEL_UNIVERSE.find(m => m.id === modelId)?.provider ?? "openai"),

        findModelsByCapability: (capability: string): Effect.Effect<typeof MODEL_UNIVERSE, never> =>
            Effect.succeed(
                MODEL_UNIVERSE.filter(model =>
                    model.vendorCapabilities.includes(capability as S.Schema.Type<typeof ModelCapability>))
            ),

        findModelsByCapabilities: (capabilities: string[]): Effect.Effect<typeof MODEL_UNIVERSE, never> =>
            Effect.succeed(
                MODEL_UNIVERSE.filter(model =>
                    capabilities.every(cap => model.vendorCapabilities.includes(cap as S.Schema.Type<typeof ModelCapability>)))
            ),

        getDefaultModelId: (): Effect.Effect<string, never> =>
            Effect.succeed(MODEL_UNIVERSE[0]?.id ?? "gpt-4"),

        getModelsForProvider: (providerName: string): Effect.Effect<typeof MODEL_UNIVERSE, never> =>
            Effect.succeed(
                MODEL_UNIVERSE.filter(model => model.provider === providerName)
            ),

        validateModel: (modelId: string): Effect.Effect<boolean, never> =>
            Effect.succeed(MODEL_UNIVERSE.some(m => m.id === modelId))
    }),
    dependencies: []
}) { }