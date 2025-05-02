/**
 * @file Implements the ModelService which provides access to AI model configurations and metadata.
 * @module services/ai/model/service
 */

import { ModelCapability } from "@/schema.js";
import { Provider } from "./schema.js";
import { Effect } from "effect";
import type { ModelServiceApi } from "./api.js";
export type { ModelServiceApi };
import {
    ModelConfigError,
    ModelNotFoundError,
    ModelValidationError
} from "./errors.js";
import { Model } from "./schema.js";
import { MODEL_UNIVERSE, ModelMetadata } from "./model-universe.js";

export class ModelService extends Effect.Service<ModelServiceApi>()(
    "ModelService", {
    effect: Effect.gen(function* () {
        // Convert MODEL_UNIVERSE items to Model objects for consistency with existing code
        const convertToModel = (meta: ModelMetadata): Model => ({
            id: meta.id,
            name: meta.name,
            version: meta.version,
            provider: meta.provider,
            modelName: meta.modelName,
            capabilities: meta.capabilities,
            contextWindowSize: meta.contextWindowSize,
            maxTokens: meta.maxTokens,
            temperature: meta.temperature,
            costPer1kInputTokens: meta.costPer1kInputTokens,
            costPer1kOutputTokens: meta.costPer1kOutputTokens,
            // Optional fields
            metadata: meta.description ? { description: meta.description } : undefined,
            supportedLanguages: meta.supportedLanguages ? [...meta.supportedLanguages] : undefined,
            responseFormat: meta.responseFormat ? {
                type: meta.responseFormat.type,
                supportedFormats: [...meta.responseFormat.supportedFormats]
            } : undefined
        });

        return {
            /**
             * Loads the model configuration from the MODEL_UNIVERSE.
             * @returns An Effect resolving to the loaded model data.
             */
            load: () => {
                return Effect.succeed({
                    name: "ModelUniverse",
                    version: "1.0.0",
                    models: MODEL_UNIVERSE.map(convertToModel)
                });
            },

            getProviderName: (modelId: string): Effect.Effect<Provider, ModelNotFoundError> => {
                const model = MODEL_UNIVERSE.find(m => m.id === modelId);
                if (!model) {
                    return Effect.fail(new ModelNotFoundError({
                        modelId,
                        method: "getProviderName"
                    }));
                }
                return Effect.succeed(model.provider);
            },

            findModelsByCapability: (capability: typeof ModelCapability): Effect.Effect<Array<Model>, never> => {
                const filteredModels = MODEL_UNIVERSE
                    .filter(model => model.capabilities.includes(capability.literals[0]))
                    .map(convertToModel);
                    
                return Effect.succeed(filteredModels);
            },

            /**
             * Finds all models that include ALL of the specified capabilities.
             * @param capabilities Array of capabilities to search for.
             * @returns An Effect resolving to an array of Model objects that have all specified capabilities.
             */
            findModelsByCapabilities: (capabilities: typeof ModelCapability): Effect.Effect<Array<Model>, never> => {
                const filteredModels = MODEL_UNIVERSE
                    .filter(model => capabilities.literals.every(cap => model.capabilities.includes(cap)))
                    .map(convertToModel);
                    
                return Effect.succeed(filteredModels);
            },

            /**
             * Validates if a model has all the specified capabilities.
             * @param modelId The ID of the model to validate.
             * @param capabilities Array of capabilities to validate against.
             * @returns An Effect resolving to true if the model exists and has all specified capabilities, false otherwise.
             */
            exists: (modelId: string): Effect.Effect<boolean, ModelNotFoundError> => {
                const model = MODEL_UNIVERSE.find(m => m.id === modelId);
                if (!model) {
                    return Effect.fail(new ModelNotFoundError({
                        modelId,
                        method: "exists"
                    }));
                }
                return Effect.succeed(true);
            },

            validateModel: (modelId: string, capabilities: typeof ModelCapability): Effect.Effect<boolean, ModelValidationError> => {
                const model = MODEL_UNIVERSE.find(m => m.id === modelId);
                if (!model) {
                    return Effect.fail(new ModelValidationError({
                        modelId,
                        message: `Model not found: ${modelId}`,
                        capabilities: capabilities.literals as unknown as string[],
                        method: "validateModel"
                    }));
                }
                
                const hasCapabilities = capabilities.literals.every(cap => model.capabilities.includes(cap));
                if (!hasCapabilities) {
                    return Effect.fail(new ModelValidationError({
                        modelId,
                        message: `Model ${modelId} does not have all required capabilities`,
                        capabilities: capabilities.literals as unknown as string[],
                        method: "validateModel"
                    }));
                }
                
                return Effect.succeed(true);
            }
        }
    })
}) {}
