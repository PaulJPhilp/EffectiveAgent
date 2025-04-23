/**
 * @file Defines types and the Context Tag for the AI Provider configuration data.
 * @module services/ai/provider/types
 */

import { ModelCapability, Provider } from "@/schema.js";
import { EntityParseError } from "@/services/core/errors.js";
import { Config, ConfigProvider, Effect, Ref, Schema as S } from "effect";
import { ModelConfigError, ModelNotFoundError, ModelValidationError } from "./errors.js";
import { Model, ModelFile } from "./schema.js";

export type ModelServiceApi = {
    load: () => Effect.Effect<ModelFile, ModelConfigError>;
    getProviderName: (modelId: string) => Effect.Effect<Provider, ModelConfigError | ModelNotFoundError>;
    findModelsByCapability: (capability: typeof ModelCapability) => Effect.Effect<Array<Model>, ModelConfigError>;
    findModelsByCapabilities: (capabilities: typeof ModelCapability) => Effect.Effect<Array<Model>, ModelConfigError>;
    validateModel: (modelId: string, capabilities: typeof ModelCapability) => Effect.Effect<boolean, ModelConfigError | ModelValidationError>;
}

export class ModelService extends Effect.Service<ModelServiceApi>()("ModelService", {
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

                    const parsedConfig = yield* Effect.try({
                        try: () => JSON.parse(rawConfig),
                        catch: (error) => new ModelConfigError({
                            message: "Failed to parse model config",
                            cause: new EntityParseError({
                                filePath: "models.json",
                                cause: error instanceof Error ? error : new Error(String(error))
                            })
                        })
                    });

                    const validConfig = yield* S.decode(ModelFile)(parsedConfig).pipe(
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

            getProviderName: (modelId: string): Effect.Effect<Provider, ModelConfigError | ModelNotFoundError> =>
                modelRef.get.pipe(
                    Effect.flatMap((modelFile) => {
                        const model = modelFile.models.find((m) => m.id === modelId);
                        if (!model) {
                            return Effect.fail(new ModelNotFoundError(modelId));
                        }
                        return Effect.succeed(model.provider as Provider);
                    }),
                    Effect.mapError((cause) =>
                        cause instanceof ModelNotFoundError ? cause :
                            new ModelConfigError({
                                message: "Failed to access models for provider search",
                                cause
                            })
                    )
                ),

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
            validateModel: (modelId: string, capabilities: typeof ModelCapability): Effect.Effect<boolean, ModelConfigError | ModelValidationError> =>
                modelRef.get.pipe(
                    Effect.flatMap((modelFile) => {
                        const model = modelFile.models.find((m) => m.id === modelId);
                        if (!model) {
                            return Effect.fail(new ModelValidationError({
                                modelId,
                                message: `Model not found: ${modelId}`,
                                capabilities: capabilities.literals as unknown as string[]
                            }));
                        }
                        const hasCapabilities = capabilities.literals.every((cap) => model.capabilities.includes(cap));
                        if (!hasCapabilities) {
                            return Effect.fail(new ModelValidationError({
                                modelId,
                                message: `Model ${modelId} does not have all required capabilities`,
                                capabilities: capabilities.literals as unknown as string[]
                            }));
                        }
                        return Effect.succeed(true);
                    }),
                    Effect.mapError((cause) =>
                        cause instanceof ModelValidationError ? cause :
                            new ModelConfigError({
                                message: "Failed to access models for validation",
                                cause
                            })
                    )
                )
        }
    })
}) { }