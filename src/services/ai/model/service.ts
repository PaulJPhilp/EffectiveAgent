/**
 * @file Defines types and the Context Tag for the AI Provider configuration data.
 * @module services/ai/provider/types
 */

import { ModelCapability } from "@/schema.js";
import { EntityParseError } from "@/services/core/errors.js";
import { AiModel } from "@effect/ai";
// Import Schema, Context, Data, HashMap from 'effect'
import { Config, ConfigProvider, Context, Effect, Ref, Schema as S } from "effect";
import { ModelClient, ModelClientApi } from "./client.js";
import { ModelConfigError } from "./errors.js";
// Import types derived from schemas using 'import type'
import { Model, ModelFile } from "./schema.js";
import { LanguageModelV1 } from "@ai-sdk/provider";

export class ModelService extends Effect.Service<ModelService>()("ModelService", {
    succeed: Effect.gen(function* () {
        let modelRef: Ref.Ref<ModelFile>;


        return {
            /**
             * Loads the model configuration from the config provider and validates it against the schema.
             * @returns An Effect resolving to the loaded and validated ModelFile.
             */
            load: () => {
                return Effect.gen(function* () {
                    const configProvider = yield* ConfigProvider.ConfigProvider;
                    const rawConfig = yield* configProvider.load(Config.string("provider")).pipe(
                        Effect.mapError(cause => new ModelConfigError({
                            message: "Failed to load model config",
                            cause: new EntityParseError({
                                filePath: "models.json",
                                cause
                            })
                        }))
                    );

                    const parsedConfig = Effect.try({
                        try: () => JSON.parse(rawConfig),
                        catch: (error) => {
                            throw new ModelConfigError({
                                message: "Failed to parse model config",
                                cause: new EntityParseError({
                                    filePath: "models.json",
                                    cause: error
                                })
                            });
                        }
                    });

                    // 2. Load and validate config using the schema directly
                    const data = yield* parsedConfig
                    const validConfig = yield* S.decode(ModelFile)(data).pipe(
                        Effect.mapError(cause => new ModelConfigError({
                            message: "Failed to validate model config",
                            cause: new EntityParseError({
                                filePath: "models.json",
                                cause
                            })
                        }))
                    );

                    modelRef = yield* Ref.make<ModelFile>(validConfig);
                    return validConfig;
                })
            },

            findModelsByCapability: (capability: typeof ModelCapability): Effect.Effect<Array<Model>, ModelConfigError> =>
                modelRef.get.pipe(
                    Effect.map((modelFile) =>
                        modelFile.models.filter((model) => model.capabilities.includes(capability.literals[0]))
                    ),
                    Effect.mapError((cause) =>
                        new ModelConfigError({
                            message: "Failed to access models for capability search",
                            cause
                        })
                    )
                ),

            /**
             * Finds all models that include ALL of the specified capabilities.
             * @param capabilities Array of capabilities to search for.
             * @returns An Effect resolving to an array of Model objects that have all specified capabilities.
             */
            findModelsByCapabilities: (capabilities: typeof ModelCapability): Effect.Effect<Array<Model>, ModelConfigError> =>
                modelRef.get.pipe(
                    Effect.map((modelFile) =>
                        modelFile.models.filter((model) =>
                            capabilities.literals.every((cap) => model.capabilities.includes(cap))
                        )
                    ),
                    Effect.mapError((cause) =>
                        new ModelConfigError({
                            message: "Failed to access models for capabilities search",
                            cause
                        })
                    )
                ),

            /**
             * Validates if a model has all the specified capabilities.
             * @param modelId The ID of the model to validate.
             * @param capabilities Array of capabilities to validate against.
             * @returns An Effect resolving to true if the model exists and has all specified capabilities, false otherwise.
             */
            validateModel: (modelId: string, capabilities: typeof ModelCapability): Effect.Effect<boolean, ModelConfigError> =>
                modelRef.get.pipe(
                    Effect.map((modelFile) => {
                        const model = modelFile.models.find((m) => m.id === modelId);
                        if (!model) return false;
                        return capabilities.literals.every((cap) => model.capabilities.includes(cap));
                    }),
                    Effect.mapError((cause) =>
                        new ModelConfigError({
                            message: "Failed to access models for validation",
                            cause
                        })
                    )
                )
        }
    })
}) { }