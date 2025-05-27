/**
 * @file Implements the ModelService which provides access to AI model configurations and metadata.
 * @module services/ai/model/service
 * 
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * !!! WARNING: This file uses the Effect.Service pattern and MUST NOT be modified by AI agents !!!
 * !!! unless explicitly instructed. The pattern used here is the canonical implementation.      !!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

import { ConfigurationService } from "@/services/core/configuration/service.js";
import { Effect, Schema } from "effect";
import * as Logger from "effect/Logger";
import type { ModelServiceApi } from "./api.js";
import { ModelNotFoundError } from "./errors.js";
import { MODEL_UNIVERSE } from "./model-universe.js";
import { ModelFileSchema, PublicModelInfoDefinition } from "./schema.js";
import { ModelCapability } from "@/schema.js";

/**
 * Implementation of the ModelService using Effect.Service pattern.
 * This service provides access to AI model configurations and metadata.
 */
export interface ModelServiceConfig {
    readonly configPath: string;
}

export class ModelService extends Effect.Service<ModelServiceApi>()(
    "ModelService",
    {
        effect: Effect.gen(function* () {
            yield* Effect.logDebug("Initializing ModelService");
            const configService = yield* ConfigurationService;
            const configPath = process.env.MODELS_CONFIG_PATH ?? "";
            yield* Effect.logDebug("Using models config path", { configPath });

            const readConfig = Effect.gen(function* () {
                yield* Effect.logDebug("Loading models configuration", { configPath });
                return yield* configService.loadConfig({
                    filePath: configPath,
                    schema: ModelFileSchema
                });
            }).pipe(
                Effect.tapError((error) => Effect.logError("Failed to load models configuration", { configPath, error })),
                Effect.mapError((error) => new ModelNotFoundError({
                    modelId: "unknown",
                    method: "readConfig",
                    description: "Failed to read models config",
                }))
            );

            return {
                validateModel: (modelId: string) =>
                    Effect.gen(function* () {
                        yield* Effect.logDebug("Validating model", { modelId });
                        const config = yield* readConfig;
                        const isValid = config.models.some((model: PublicModelInfoDefinition) => model.id === modelId);
                        yield* Effect.logDebug("Model validation result", { modelId, isValid });
                        return isValid;
                    }),

                findModelsByCapability: (capability: Schema.Schema.Type<typeof ModelCapability>) =>
                    Effect.gen(function* () {
                        yield* Effect.logDebug("Finding models by capability", { capability });
                        const config = yield* readConfig;
                        const models = config.models.filter((model: PublicModelInfoDefinition) =>
                            model.vendorCapabilities.includes(capability)
                        );
                        if (models.length === 0) {
                            yield* Effect.logError("No models found with capability", { capability });
                            throw new ModelNotFoundError({
                                modelId: "unknown",
                                method: "findModelsByCapability",
                                description: `No models found with capability: ${capability}`
                            });
                        }
                        return models;
                    }),

                findModelsByCapabilities: (capabilities: readonly Schema.Schema.Type<typeof ModelCapability>[]) =>
                    Effect.gen(function* () {
                        yield* Effect.logDebug("Finding models by capabilities", { capabilities });
                        const config = yield* readConfig;
                        const models = config.models.filter((model: PublicModelInfoDefinition) =>
                            capabilities.every((capability) =>
                                model.vendorCapabilities.includes(capability)
                            )
                        );
                        if (models.length === 0) {
                            yield* Effect.logError("No models found with required capabilities", { capabilities });
                            throw new ModelNotFoundError({
                                modelId: "unknown",
                                method: "findModelsByCapabilities",
                                description: `No models found with capabilities: ${capabilities.join(", ")}`
                            });
                        }
                        return models;
                    }),

                getProviderName: (modelId: string) =>
                    Effect.gen(function* () {
                        yield* Effect.logDebug("Getting provider name for model", { modelId });
                        const config = yield* readConfig;
                        const model = config.models.find((m: PublicModelInfoDefinition) => m.id === modelId);
                        if (!model) {
                            yield* Effect.logError("Model not found", { modelId });
                            throw new ModelNotFoundError({
                                modelId,
                                method: "getProviderName",
                                description: `Model ${modelId} not found`
                            });
                        }
                        return model.provider;
                    }),

                exists: (modelId: string) =>
                    Effect.gen(function* () {
                        yield* Effect.logDebug("Checking if model exists", { modelId });
                        const config = yield* readConfig;
                        const exists = config.models.some((model) => model.id === modelId);
                        yield* Effect.logDebug("Model existence check result", { modelId, exists });
                        return exists;
                    }),

                getDefaultModelId: () =>
                    Effect.gen(function* () {
                        yield* Effect.logDebug("Getting default model ID");
                        const config = yield* readConfig;
                        const defaultModel = config.models[0];
                        if (!defaultModel) {
                            yield* Effect.logError("No default model found");
                            throw new ModelNotFoundError({
                                modelId: "unknown",
                                method: "getDefaultModelId",
                                description: "No models found"
                            });
                        }
                        return defaultModel.id;
                    }),

                getModelsForProvider: (providerName: string) =>
                    Effect.gen(function* () {
                        yield* Effect.logDebug("Getting models for provider", { providerName });
                        const config = yield* readConfig;
                        const models = config.models.filter((model: PublicModelInfoDefinition) => model.provider.name === providerName);
                        if (models.length === 0) {
                            yield* Effect.logError("No models found for provider", { providerName });
                            throw new ModelNotFoundError({
                                modelId: "unknown",
                                method: "getModelsForProvider",
                                description: `No models found for provider: ${providerName}`
                            });
                        }
                        return models;
                    }),

                load: () =>
                    readConfig.pipe(
                        Effect.tap(() => Effect.logInfo("Models configuration loaded successfully")),
                        Effect.map((config) => ({
                            name: config.name ?? "ModelConfig",
                            version: config.version ?? "1.0.0",
                            models: config.models
                        }))
                    ),
            };
        }),
        dependencies: [ConfigurationService.Default]
    }) { }