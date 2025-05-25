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
import type { ModelServiceApi } from "./api.js";
import { ModelNotFoundError } from "./errors.js";
import { MODEL_UNIVERSE } from "./model-universe.js";
import { ModelFile, PublicModelInfoDefinition } from "./schema.js";
import { ModelCapability } from "@/schema.js";

/**
 * Implementation of the ModelService using Effect.Service pattern.
 * This service provides access to AI model configurations and metadata.
 */
export class ModelService extends Effect.Service<ModelServiceApi>()(
    "ModelService",
    {
        effect: Effect.gen(function* () {
            const configService = yield* ConfigurationService;
            const configPath = process.env.MODELS_CONFIG_PATH ?? "models.json";

            const readConfig = Effect.gen(function* () {
                return yield* configService.loadConfig({
                    filePath: configPath,
                    schema: ModelFile
                });
            }).pipe(
                Effect.mapError((error) => new ModelNotFoundError({
                    modelId: "unknown",
                    method: "readConfig",
                    description: "Failed to read models config",
                }))
            );

            return {
                validateModel: (modelId: string) =>
                    Effect.gen(function* () {
                        const config = yield* readConfig;
                        return config.models.some((model) => model.id === modelId);
                    }),

                findModelsByCapability: (capability: Schema.Schema.Type<typeof ModelCapability>) =>
                    Effect.gen(function* () {
                        const config = yield* readConfig;
                        const models = config.models.filter((model) =>
                            model.vendorCapabilities.includes(capability)
                        );
                        if (models.length === 0) {
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
                        const config = yield* readConfig;
                        const models = config.models.filter((model) =>
                            capabilities.every((capability) =>
                                model.vendorCapabilities.includes(capability)
                            )
                        );
                        if (models.length === 0) {
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
                        const config = yield* readConfig;
                        const model = config.models.find((m) => m.id === modelId);
                        if (!model) {
                            throw new ModelNotFoundError({
                                modelId,
                                method: "getProviderName",
                                description: `Model ${modelId} not found`
                            });
                        }
                        return model.provider.name;
                    }),

                exists: (modelId: string) =>
                    Effect.gen(function* () {
                        const config = yield* readConfig;
                        return config.models.some((model) => model.id === modelId);
                    }),

                getDefaultModelId: () =>
                    Effect.gen(function* () {
                        const config = yield* readConfig;
                        const defaultModel = config.models[0];
                        if (!defaultModel) {
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
                        const config = yield* readConfig;
                        const models = config.models.filter((model) => model.provider.name === providerName);
                        if (models.length === 0) {
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