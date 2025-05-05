/**
 * @file Implements the ModelService which provides access to AI model configurations and metadata.
 * @module services/ai/model/service
 */

import { ModelCapability } from "@/schema.js";
import { Effect } from "effect";
import type { ModelServiceApi } from "./api.js";
import {
    ModelNotFoundError,
    ModelValidationError
} from "./errors.js";
import { MODEL_UNIVERSE } from "./model-universe.js";
import { ModelDefinition, ModelFile, Provider, PublicModelInfoDefinition } from "./schema.js";
export type { ModelServiceApi };

// Helper function to map internal ModelDefinition to PublicModelInfo
const toPublicModelInfo = (model: ModelDefinition): PublicModelInfoDefinition => {
    return {
        id: model.id,
        provider: model.provider,
        displayName: model.displayName,
        vendorCapabilities: model.vendorCapabilities,
        name: model.name,
        version: model.version,
        modelName: model.modelName,
        temperature: model.temperature,
        maxTokens: model.maxTokens,
        contextWindowSize: model.contextWindowSize,
        costPer1kInputTokens: model.costPer1kInputTokens,
        costPer1kOutputTokens: model.costPer1kOutputTokens,
        metadata: model.metadata,
        supportedLanguages: model.supportedLanguages,
        responseFormat: model.responseFormat
    };
};

export class ModelService extends Effect.Service<ModelServiceApi>()("ModelService", {
    effect: Effect.gen(function* () {
        // Internal representation remains ModelDefinition
        const models: ReadonlyArray<ModelDefinition> = MODEL_UNIVERSE as ReadonlyArray<ModelDefinition>;

        return {
            /**
             * Loads the model configuration from the MODEL_UNIVERSE.
             * @returns An Effect resolving to the loaded model data.
             */
            load: (): Effect.Effect<ModelFile, never> => {
                // Map internal models to public structure for the returned ModelFile
                const publicModels = models.map(toPublicModelInfo);
                return Effect.succeed({
                    name: "ModelUniverse",
                    version: "1.0.0",
                    models: publicModels
                });
            },

            getProviderName: (modelId: string): Effect.Effect<Provider, ModelNotFoundError> => {
                const model = models.find(m => m.id === modelId);
                if (!model) {
                    return Effect.fail(new ModelNotFoundError({ modelId, method: "getProviderName" }));
                }
                return Effect.succeed(model.provider);
            },

            findModelsByCapability: (capability: typeof ModelCapability): Effect.Effect<Array<PublicModelInfoDefinition>, never> => {
                // Extract capabilities from the schema
                const capabilities = ModelCapability.literals;

                const filteredModels = models
                    .filter(model => capabilities.some(cap => model.vendorCapabilities.includes(cap)))
                    .map(toPublicModelInfo);
                return Effect.succeed(filteredModels);
            },

            findModelsByCapabilities: (capabilities: typeof ModelCapability): Effect.Effect<Array<PublicModelInfoDefinition>, never> => {
                // Extract capabilities from the schema
                const requiredCapabilities = capabilities.literals;

                const filteredModels = models
                    .filter(model => requiredCapabilities.every(cap => model.vendorCapabilities.includes(cap)))
                    .map(toPublicModelInfo);
                return Effect.succeed(filteredModels);
            },

            exists: (modelId: string): Effect.Effect<boolean, never> => {
                const model = models.find(m => m.id === modelId);
                return Effect.succeed(!!model);
            },

            validateModel: (modelId: string, capabilities: typeof ModelCapability): Effect.Effect<boolean, ModelValidationError | ModelNotFoundError> => {
                const model = models.find(m => m.id === modelId);
                if (!model) {
                    return Effect.fail(new ModelNotFoundError({ modelId, method: "validateModel" }));
                }

                // Extract capabilities from the provided schema
                const requiredCapabilities = capabilities.literals;

                const missingCapabilities = requiredCapabilities.filter(cap => !model.vendorCapabilities.includes(cap));

                if (missingCapabilities.length > 0) {
                    return Effect.fail(new ModelValidationError({
                        modelId,
                        message: `Model ${modelId} does not have all required capabilities: ${missingCapabilities.join(", ")}`,
                        capabilities: missingCapabilities,
                        method: "validateModel"
                    }));
                }

                return Effect.succeed(true);
            }
            // NOTE: getDefaultModelId and getModelsForProvider might need adjustments
            // depending on how they interact with external SDKs or specific provider logic.
            // They are omitted here for brevity but should be reviewed.
        }
    })
}) { }
