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
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { Effect } from "effect";
import type { ModelServiceApi } from "./api.js";
import { ModelNotFoundError } from "./errors.js";
import type { PublicModelInfoData } from "./schema.js";

/**
 * Implementation of the ModelService using Effect.Service pattern.
 * This service provides access to AI model configurations and metadata.
 */
export class ModelService extends Effect.Service<ModelServiceApi>()("ModelService", {
    effect: Effect.gen(function* () {
        // Load our own config via ConfigurationService
        const configService = yield* ConfigurationService;

        // Get models config path from master config
        const masterConfig = yield* configService.getMasterConfig();
        const modelsConfigPath = masterConfig.configPaths?.models || "./config/models.json";
        const config = yield* configService.loadModelConfig(modelsConfigPath);

        // Return service implementation
        const validateModel = (modelId: string) =>
            Effect.gen(function* () {
                yield* Effect.logDebug("Validating model", { modelId });
                const isValid = config.models.some((model: PublicModelInfoData) => model.id === modelId);
                yield* Effect.logDebug("Model validation result", { modelId, isValid });
                return isValid;
            });

        const findModelsByCapability = (capability: ModelCapability) =>
            Effect.gen(function* () {
                const models = config.models.filter((model: PublicModelInfoData) =>
                    model.capabilities.some(cap => cap.capability === capability)
                );
                if (models.length === 0) {
                    yield* Effect.logError("No models found with capability", { capability });
                    return yield* Effect.fail(new ModelNotFoundError({
                        modelId: "unknown",
                        method: "findModelsByCapability",
                        description: `No models found with capability: ${capability}`
                    }));
                }
                return models;
            });

        const findModelsByCapabilities = (capabilities: readonly ModelCapability[]) =>
            Effect.gen(function* () {
                yield* Effect.logDebug("Finding models by capabilities", { capabilities });
                const models = config.models.filter((model: PublicModelInfoData) =>
                    capabilities.every(requiredCap =>
                        model.capabilities.some(modelCap => modelCap.capability === requiredCap)
                    )
                );
                if (models.length === 0) {
                    yield* Effect.logError("No models found with all capabilities", { capabilities });
                    return yield* Effect.fail(new ModelNotFoundError({
                        modelId: "unknown",
                        method: "findModelsByCapabilities",
                        description: `No models found with all capabilities: ${capabilities.join(", ")}`
                    }));
                }
                return models;
            });

        const getProviderName = (modelId: string) =>
            Effect.gen(function* () {
                const model = config.models.find((m: PublicModelInfoData) => m.id === modelId);
                if (!model) {
                    yield* Effect.logError("Model not found", { modelId });
                    return yield* Effect.fail(new ModelNotFoundError({
                        modelId,
                        method: "getProviderName",
                        description: `Model not found: ${modelId}`
                    }));
                }
                return model.provider;
            });

        const exists = (modelId: string) =>
            Effect.gen(function* () {
                yield* Effect.logDebug("Checking if model exists", { modelId });
                return config.models.some((model: PublicModelInfoData) => model.id === modelId);
            });

        const getDefaultModelId = () =>
            Effect.gen(function* () {
                yield* Effect.logDebug("Getting default model ID");
                if (config.models.length === 0) {
                    yield* Effect.logError("No models found in configuration");
                    return yield* Effect.fail(new ModelNotFoundError({
                        modelId: "unknown",
                        method: "getDefaultModelId",
                        description: "No models found in configuration"
                    }));
                }
                return config.models[0]!.id;
            });

        const getModelsForProvider = (providerName: string) =>
            Effect.gen(function* () {
                const models = config.models.filter((model: PublicModelInfoData) => model.provider === providerName);
                if (models.length === 0) {
                    yield* Effect.logError("No models found for provider", { providerName });
                    return yield* Effect.fail(new ModelNotFoundError({
                        modelId: "unknown",
                        method: "getModelsForProvider",
                        description: `No models found for provider: ${providerName}`
                    }));
                }
                return models;
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
    })
}) { }