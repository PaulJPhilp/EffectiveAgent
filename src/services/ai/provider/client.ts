/**
 * @file Provider client service implementation
 * @module services/ai/provider/client
 */

import type { JsonObject } from "@/types.js";
import { Effect, Option, Ref, Stream } from "effect";
import { validateModelId, validateCapabilities, handleProviderError } from "./helpers.js";
import { createResponse } from "@/services/ai/pipeline/helpers.js";
import { extractTextsForEmbeddings, extractTextForSpeech, extractAudioForTranscriptionEffect } from "@/services/ai/input/helpers.js";

import { ProviderClientApi } from "./api.js";
import { EffectiveProviderApi } from "./types.js";
import type { EffectiveResponse } from "@/services/ai/pipeline/types.js";

import { ModelCapability } from "@/schema.js";
import { EffectiveInput } from "@/services/ai/input/service.js";
import {
    ProviderConfigError,
    ProviderMissingCapabilityError,
    ProviderOperationError,
} from "./errors.js";
import { type ProvidersType } from "./schema.js";
import type {
    GenerateEmbeddingsResult,
    GenerateObjectResult,
    GenerateSpeechResult,
    GenerateTextResult,
    ProviderGenerateEmbeddingsOptions,
    ProviderGenerateObjectOptions,
    ProviderGenerateSpeechOptions,
    ProviderGenerateTextOptions,
    ProviderTranscribeOptions,
    StreamingObjectResult,
    StreamingTextResult,
    TranscribeResult
} from "./types.js";

import { LoggingApi } from "@/services/core/logging/types.js";
import { LanguageModelV1 } from "ai";
import { ModelService, ModelServiceApi } from "@/services/ai/model/service.js";

/**
 * ProviderClient service implementation using Effect.Service pattern
 */
export class ProviderClient extends Effect.Service<ProviderClientApi>()(
    "ProviderClient",
    {
        effect: Effect.gen(function* () {
            const logger: LoggingApi = yield* LoggingApi;
            // Logging helper
            const logDebug = (method: string, message: string, data?: JsonObject) =>
                logger.debug(`[ProviderClient:${method}] ${message}`, data);
            /**
             * Ref for provider and capabilities state
             */
            const providerRef = yield* Ref.make<Option.Option<{
                provider: EffectiveProviderApi;
                capabilities: Set<ModelCapability>;
            }>>(Option.none());

            /**
             * Sets the current provider and its capabilities in the service state.
             * @param provider - The provider object
             * @returns Effect<void, ProviderConfigError>
             */
            const setVercelProvider = (provider: EffectiveProviderApi): Effect.Effect<void, ProviderConfigError> =>
                Effect.gen(function* () {
                    yield* logger.debug(`Configuring provider: ${provider.name}`);
                    yield* Ref.set(providerRef, Option.some({ provider, capabilities: provider.capabilities }));
                    yield* logger.debug(`Provider configured: ${provider.name}`);
                });

            /**
             * Gets the currently configured provider from service state.
             * @returns Effect<EffectiveProviderApi, ProviderConfigError>
             */
            const getProvider = (): Effect.Effect<EffectiveProviderApi, ProviderConfigError> =>
                Effect.gen(function* () {
                    const maybe = yield* Ref.get(providerRef);
                    if (Option.isNone(maybe)) {
                        return yield* Effect.fail(
                            new ProviderConfigError({
                                description: "No provider configured",
                                module: "ProviderClient",
                                method: "getProvider"
                            })
                        );
                    }
                    return maybe.value.provider;
                });

            /**
             * Generate text completion from input.
             * @param input - The input for text generation
             * @param options - Provider-specific options
             * @returns Effect<EffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError>
             * @returns Effect<EffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderConfigError>
             */
            const generateText = (
                input: EffectiveInput,
                options: ProviderGenerateTextOptions
            ): Effect.Effect<EffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError> =>
                Effect.gen(function* () {
                    const provider = yield* getProvider();
                    const modelId = yield* validateModelId({
                        options,
                        method: "generateText"
                    });
                    yield* validateCapabilities({
                        providerName: provider.name,
                        required: "text-generation",
                        actual: provider.capabilities,
                        method: "generateText"
                    });
                    // Call the actual provider implementation's generateText and wrap the result
                    const providerImpl = provider.provider;
                    return yield* Effect.catchAll(
                        Effect.flatMap(
                            providerImpl.generateText(input, options),
                            (result) => createResponse<GenerateTextResult>(result)
                        ),
                        (err) =>
                            Effect.flatMap(
                                logDebug("generateText", "Provider error", { error: err instanceof Error ? err.message : String(err) }),
                                () => Effect.fail(
                                    handleProviderError({
                                        operation: "generateText",
                                        err,
                                        providerName: provider.name,
                                        module: "ProviderClient",
                                        method: "generateText"
                                    })
                                )
                            )
                    );
                });

            // /**
            //  * Stream text completion from input.
            //  * @param input - The input for streaming text generation
            //  * @param options - Provider-specific options
            //  * @returns Stream<EffectiveResponse<StreamingTextResult>, ProviderOperationError | ProviderConfigError>
            //  */
            // const streamText = (
            //     input: EffectiveInput,
            //     options: ProviderGenerateTextOptions
            // ): Stream.Stream<EffectiveResponse<StreamingTextResult>, ProviderOperationError | ProviderConfigError> =>
            //     Stream.unwrap(
            //         Effect.gen(function* () {
            //             const provider = yield* getProvider();
            //             const modelId = yield* validateModelId({
            //                 options,
            //                 method: "streamText"
            //             });
            //             yield* validateCapabilities({
            //                 providerName: provider.name,
            //                 required: "text-generation",
            //                 actual: provider.capabilities,
            //                 method: "streamText"
            //             });
            //             const providerImpl = provider.provider;
            //             return Stream.catchAll(
            //                 Stream.map(
            //                     providerImpl.streamText(input, options),
            //                     (result) => createResponse<StreamingTextResult>(result)
            //                 ),
            //                 (err) =>
            //                     Stream.fromEffect(
            //                         Effect.flatMap(
            //                             logDebug("streamText", "Provider error", {
            //                                 error: err instanceof Error ? err.message : String(err)
            //                             }),
            //                             () =>
            //                                 Effect.fail(
            //                                     handleProviderError({
            //                                         err,
            //                                         operation: "streamText",
            //                                         providerName: provider.name,
            //                                         module: "ProviderClient",
            //                                         method: "streamText"
            //                                     })
            //                                 )
            //                         )
            //                     )
            //             );
            //         })
            //     );

            /**
             * Generate a structured object based on a schema from input.
             * @param input - The input for object generation
             * @param options - Provider-specific options
             * @returns Effect<EffectiveResponse<GenerateObjectResult>, ProviderOperationError | ProviderConfigError>
             */
            const generateObject = <T = unknown>(
                input: EffectiveInput,
                options: ProviderGenerateObjectOptions<T>
            ): Effect.Effect<EffectiveResponse<GenerateObjectResult<T>>, ProviderOperationError | ProviderConfigError> =>
                Effect.gen(function* () {
                    const provider = yield* getProvider();
                    const modelId = yield* validateModelId({
                        options,
                        method: "generateObject"
                    });
                    yield* validateCapabilities({
                        providerName: provider.name,
                        required: "function-calling",
                        actual: provider.capabilities,
                        method: "generateObject"
                    });
                    const providerImpl = provider.provider;
                    return yield* Effect.catchAll(
                        Effect.flatMap(
                            providerImpl.generateObject(input, options),
                            (result) => createResponse<GenerateObjectResult<T>>(result)
                        ),
                        (err) =>
                            Effect.flatMap(
                                logDebug("generateObject", "Provider error", { error: err instanceof Error ? err.message : String(err) }),
                                () => Effect.fail(
                                    handleProviderError({
                                        operation: "generateObject",
                                        err,
                                        providerName: provider.name,
                                        module: "ProviderClient",
                                        method: "generateObject"
                                    })
                                )
                            )
                    );
                });

            /**
             * Stream a structured object based on a schema from input.
             * @param input - The input for streaming object generation
             * @param options - Provider-specific options
             * @returns Stream<EffectiveResponse<StreamingObjectResult>, ProviderOperationError | ProviderConfigError>
             */
            const streamObject = <T = unknown>(
                input: EffectiveInput,
                options: ProviderGenerateObjectOptions<T>
            ): Stream.Stream<EffectiveResponse<StreamingObjectResult<T>>, ProviderOperationError | ProviderConfigError> =>
                Stream.unwrap(
                    Effect.gen(function* () {
                        const provider = yield* getProvider();
                        const modelId = yield* validateModelId({
                            options,
                            method: "streamObject"
                        });
                        yield* validateCapabilities({
                            providerName: provider.name,
                            required: "function-calling",
                            actual: provider.capabilities,
                            method: "streamObject"
                        });
                        return Stream.fail(new ProviderOperationError({
                            operation: "streamObject",
                            message: "Not implemented",
                            providerName: provider.name,
                            module: "ProviderClient",
                            method: "streamObject"
                        }));
                    })
                );

            /**
             * Generate speech from input.
             * @param input - The input for speech generation
             * @param options - Provider-specific options
             * @returns Effect<EffectiveResponse<GenerateSpeechResult>, ProviderOperationError | ProviderConfigError>
             */
            const generateSpeech = (
                input: EffectiveInput,
                options: ProviderGenerateSpeechOptions
            ): Effect.Effect<EffectiveResponse<GenerateSpeechResult>, ProviderOperationError | ProviderConfigError> =>
                Effect.gen(function* () {
                    const provider = yield* getProvider();
                    yield* validateCapabilities({
                        providerName: provider.name,
                        required: "audio",
                        actual: provider.capabilities,
                        method: "generateSpeech"
                    });
                    const providerImpl = provider.provider;
                    const text = extractTextForSpeech(input);
                    return yield* Effect.catchAll(
                        Effect.flatMap(
                            providerImpl.generateSpeech(text, options),
                            (result) => createResponse<GenerateSpeechResult>(result)
                        ),
                        (err) =>
                            Effect.flatMap(
                                logDebug("generateSpeech", "Provider error", { error: err instanceof Error ? err.message : String(err) }),
                                () => Effect.fail(
                                    handleProviderError({
                                        operation: "generateSpeech",
                                        err,
                                        providerName: provider.name,
                                        module: "ProviderClient",
                                        method: "generateSpeech"
                                    })
                                )
                            )
                    );
                });

            /**
             * Transcribe audio input.
             * @param input - The input for transcription
             * @param options - Provider-specific options
             * @returns Effect<EffectiveResponse<TranscribeResult>, ProviderOperationError | ProviderConfigError>
             */
            const transcribe = (
                input: ArrayBuffer,
                options: ProviderTranscribeOptions
            ): Effect.Effect<EffectiveResponse<TranscribeResult>, ProviderOperationError | ProviderConfigError> =>
                Effect.gen(function* () {
                    const provider = yield* getProvider();
                    const modelId = yield* validateModelId({
                        options,
                        method: "transcribe"
                    });
                    yield* validateCapabilities({
                        providerName: provider.name,
                        required: "audio",
                        actual: provider.capabilities,
                        method: "transcribe"
                    });
                    const providerImpl = provider.provider;
                    return yield* Effect.catchAll(
                        Effect.flatMap(
                            providerImpl.transcribe(input, { ...options, modelId }),
                            (result) => createResponse<TranscribeResult>(result)
                        ),
                        (err) =>
                            Effect.flatMap(
                                logDebug("transcribe", "Provider error", { error: err instanceof Error ? err.message : String(err) }),
                                () => Effect.fail(
                                    handleProviderError({
                                        operation: "transcribe",
                                        err,
                                        providerName: provider.name,
                                        module: "ProviderClient",
                                        method: "transcribe"
                                    })
                                )
                            )
                    );
                });

            const getCapabilities = (): Effect.Effect<Set<ModelCapability>, ProviderOperationError | ProviderConfigError> =>
                Effect.gen(function* () {
                    const provider = yield* getProvider();
                    return provider.capabilities;
                });


            const getModels = (): Effect.Effect<LanguageModelV1[], ProviderConfigError, ModelServiceApi> =>
                Effect.gen(function* () {
                    const modelService = yield* ModelService;
                    const provider = yield* getProvider();
                    return yield* modelService.getModelsForProvider(provider.name);
                });

            const generateEmbeddings = (
                input: EffectiveInput,
                options: ProviderGenerateEmbeddingsOptions
            ): Effect.Effect<EffectiveResponse<GenerateEmbeddingsResult>, ProviderOperationError | ProviderConfigError> =>
                Effect.gen(function* () {
                    const provider = yield* getProvider();
                    const texts = extractTextsForEmbeddings(input);
                    const providerImpl = provider.provider;
                    return yield* providerImpl.generateEmbeddings(texts, options);
                });
            
            return {
                getProvider,
                setVercelProvider,
                generateText,
                generateObject,
                generateSpeech,
                transcribe,
                generateEmbeddings,
                getCapabilities,
                getModels
            };

        }),
        dependencies: [ModelService.Default]
    }
) { }