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
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { Effect, Schema as S } from "effect";
import type { ModelServiceApi } from "./api.js";
import { ModelNotFoundError } from "./errors.js";
import { PublicModelInfoDefinition } from "./schema.js";
import type { ModelConfigData } from "./types.js";

/**
 * Implementation of the ModelService using Effect.Service pattern.
 * This service provides access to AI model configurations and metadata.
 */
export class ModelService extends Effect.Service<ModelServiceApi>()("ModelService", {
    effect: Effect.gen(function* () {
        // Load our own config via ConfigurationService
        const configService = yield* ConfigurationService;
        // Get models config path from environment variable
        const modelsConfigPath = process.env.MODELS_CONFIG_PATH || "./config/models.json";
        const config = (yield* configService.loadModelConfig(modelsConfigPath)) as ModelConfigData;

        // Return service implementation
        const validateModel = (modelId: string) =>
            Effect.gen(function* () {
                yield* Effect.logDebug("Validating model", { modelId });
                const isValid = config.models.some((model: PublicModelInfoDefinition) => model.id === modelId);
                yield* Effect.logDebug("Model validation result", { modelId, isValid });
                return isValid;
            });

        const findModelsByCapability = (capability: S.Schema.Type<typeof ModelCapability>) =>
            Effect.gen(function* () {
                yield* Effect.logDebug("Finding models by capability", { capability });
                const models = config.models.filter((model: PublicModelInfoDefinition) =>
                    model.vendorCapabilities.includes(capability)
                );
                if (models.length === 0) {
                    yield* Effect.logError("No models found with capability", { capability });
                    return yield* Effect.fail(new ModelNotFoundError({
                        modelId: "unknown",
                        method: "findModelsByCapability",
                        description: `No models found with capability: ${capability}`
                    }));
                }
                return models as readonly PublicModelInfoDefinition[];
            });

        const findModelsByCapabilities = (capabilities: readonly S.Schema.Type<typeof ModelCapability>[]) =>
            Effect.gen(function* () {
                yield* Effect.logDebug("Finding models by capabilities", { capabilities });
                const models = config.models.filter((model: PublicModelInfoDefinition) =>
                    capabilities.every((capabilityType) =>
                        model.vendorCapabilities.includes(capabilityType)
                    )
                );
                if (models.length === 0) {
                    yield* Effect.logError("No models found with required capabilities", { capabilities });
                    return yield* Effect.fail(new ModelNotFoundError({
                        modelId: "unknown",
                        method: "findModelsByCapabilities",
                        description: `No models found with capabilities: ${capabilities.join(", ")}`
                    }));
                }
                return models as readonly PublicModelInfoDefinition[];
            });

        const getProviderName = (modelId: string) =>
            Effect.gen(function* () {
                yield* Effect.logDebug("Getting provider name for model", { modelId });
                const model = config.models.find((m: PublicModelInfoDefinition) => m.id === modelId);
                if (!model) {
                    yield* Effect.logError("Model not found", { modelId });
                    return yield* Effect.fail(new ModelNotFoundError({
                        modelId,
                        method: "getProviderName",
                        description: `Model ${modelId} not found`
                    }));
                }
                return model.provider.name;
            });

        const exists = (modelId: string) =>
            Effect.gen(function* () {
                yield* Effect.logDebug("Checking if model exists", { modelId });
                const modelExists = config.models.some((model) => model.id === modelId);
                yield* Effect.logDebug("Model existence check result", { modelId, exists: modelExists });
                return modelExists;
            });

        const getDefaultModelId = () =>
            Effect.gen(function* () {
                yield* Effect.logDebug("Getting default model ID");
                const defaultModel = config.models[0];
                if (!defaultModel) {
                    yield* Effect.logError("No default model found");
                    return yield* Effect.fail(new ModelNotFoundError({
                        modelId: "unknown",
                        method: "getDefaultModelId",
                        description: "No models found"
                    }));
                }
                return defaultModel.id;
            });

        const getModelsForProvider = (providerName: string) =>
            Effect.gen(function* () {
                yield* Effect.logDebug("Getting models for provider", { providerName });
                const models = config.models.filter((model: PublicModelInfoDefinition) => model.provider.name === providerName);
                if (models.length === 0) {
                    yield* Effect.logError("No models found for provider", { providerName });
                    return yield* Effect.fail(new ModelNotFoundError({
                        modelId: "unknown",
                        method: "getModelsForProvider",
                        description: `No models found for provider: ${providerName}`
                    }));
                }
                return models as readonly PublicModelInfoDefinition[];
            });

        const load = () =>
            Effect.succeed({
                name: config.name,
                version: config.version,
                models: config.models
            }).pipe(
                Effect.tap(() => Effect.logInfo("Models configuration accessed successfully via ModelService.load"))
            );

        const healthCheck = () =>
            Effect.succeed(void 0).pipe(Effect.tap(() => Effect.logDebug("ModelService healthCheck called")));

        const shutdown = () =>
            Effect.succeed(void 0).pipe(Effect.tap(() => Effect.logDebug("ModelService shutdown called")));

        return {
            validateModel,
            findModelsByCapability,
            findModelsByCapabilities,
            getProviderName,
            exists,
            getDefaultModelId,
            getModelsForProvider,
            load,
            healthCheck,
            shutdown
        } satisfies ModelServiceApi;
    }),
    dependencies: [ConfigurationService.Default]
}) { }