/**
 * @file Provider client service implementation
 * @module services/ai/provider/client
 */

import { LanguageModelV1 } from "@ai-sdk/provider";
import type { JsonObject } from "@/types.js";
import { Effect, Option, Ref, Stream, pipe } from "effect";
import { validateModelId, validateCapabilities } from "./helpers.js";
import { ModelService, ModelServiceApi } from "../model/service.js";
import { ProviderClientApi } from "./api.js";
import {
    EffectiveProviderApi,
    EffectiveResponse
} from "./types.js";

import { randomUUID } from "node:crypto";
import { ModelCapability } from "@/schema.js";
import { EffectiveInput } from "@/services/ai/input/service.js";
import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import { perplexity } from "@ai-sdk/perplexity";
import { xai } from "@ai-sdk/xai";
import {
    ProviderConfigError,
    ProviderEmptyInputError,
    ProviderMissingCapabilityError,
    ProviderOperationError,
} from "./errors.js";
import { type ProvidersType } from "./schema.js";
import type {
    GenerateBaseResult,
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

/**
 * ProviderClient service implementation using Effect.Service pattern
 */
export class ProviderClient extends Effect.Service<ProviderClientApi>()(
    "ProviderClient",
    {
        effect: Effect.gen(function* () {
            // Assume logger is provided by Effect context or injected here
            const logger: LoggingApi = yield* LoggingApi;

            // Logging helper
            const logDebug = (method: string, message: string, data?: JsonObject) =>
                logger.debug(`[ProviderClient:${method}] ${message}`, data);

            /**
             * Ref for provider and capabilities state
             */
            /**
             * Ref for provider and capabilities state
             */
            const providerRef = yield* Ref.make<Option.Option<{
                provider: EffectiveProviderApi;
                capabilities: Set<ModelCapability>;
            }>>(Option.none());

            /**
             * Sets the current provider and its capabilities in the service state.
             * @param params - Object with provider, capabilities, logger
             * @returns Effect<void, ProviderConfigError>
             */
            const setVercelProvider = (params: {
                provider: EffectiveProviderApi;
                capabilities: Set<ModelCapability>;
                logger: LoggingApi;
            }): Effect.Effect<void, ProviderConfigError> =>
                Effect.gen(function* () {
                    const { provider, capabilities, logger } = params;
                    yield* logger.debug(`Configuring provider: ${provider.name}`);
                    yield* Ref.set(providerRef, Option.some({ provider, capabilities }));
                    yield* logger.debug(`Provider configured: ${provider.name}`);
                });

            /**
             * Gets the currently configured provider from service state.
             * @returns Effect<EffectiveProviderApi, ProviderConfigError>
             */
            const getConfiguredProvider = (): Effect.Effect<EffectiveProviderApi, ProviderConfigError> =>
                Effect.gen(function* () {
                    const maybe = yield* Ref.get(providerRef);
                    if (Option.isNone(maybe)) {
                        return yield* Effect.fail(
                            new ProviderConfigError({
                                description: "No provider configured",
                                module: "ProviderClient",
                                method: "getConfiguredProvider"
                            })
                        );
                    }
                    return maybe.value.provider;
                });

            /**
             * Generate text completion from input.
             * @param input - The input for text generation
             * @param options - Provider-specific options
             * @returns Effect<EffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderConfigError>
             */
            const generateText = (
                input: EffectiveInput,
                options: ProviderGenerateTextOptions
            ): Effect.Effect<EffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderConfigError> =>
                Effect.gen(function* () {
                    const provider = yield* getConfiguredProvider();
                    const modelId = yield* Effect.catchAll(
                        validateModelId({
                            options,
                            method: "generateText"
                        }),
                        (err) => Effect.flatMap(
                            logDebug("generateText", "No modelId provided in ProviderGenerateTextOptions"),
                            () => Effect.fail(err)
                        )
                    );
                    yield* validateCapabilities({
                        providerName: provider.name,
                        required: "text-generation",
                        actual: provider.capabilities,
                        method: "generateText"
                    });
                    return yield* Effect.fail(new ProviderOperationError({
                        operation: "generateText",
                        message: "Not implemented",
                        providerName: provider.name,
                        module: "ProviderClient",
                        method: "generateText"
                    }));
                });

            /**
             * Stream text completion from input.
             * @param input - The input for streaming text generation
             * @param options - Provider-specific options
             * @returns Stream<EffectiveResponse<StreamingTextResult>, ProviderOperationError | ProviderConfigError>
             */
            const streamText = (
                input: EffectiveInput,
                options: ProviderGenerateTextOptions
            ): Stream.Stream<EffectiveResponse<StreamingTextResult>, ProviderOperationError | ProviderConfigError> =>
                Stream.unwrap(
                    Effect.gen(function* () {
                        const provider = yield* getConfiguredProvider();
                        const modelId = yield* validateModelId({
                            options,

                            method: "streamText"
                        });
                        yield* validateCapabilities({
                            providerName: provider.name,
                            required: "text-generation",
                            actual: provider.capabilities,

                            method: "streamText"
                        });
                        return Stream.fail(new ProviderOperationError({
                            operation: "streamText",
                            message: "Not implemented",
                            providerName: provider.name,
                            module: "ProviderClient",
                            method: "streamText"
                        }));
                    })
                );

            /**
             * Generate a structured object based on a schema from input.
             * @param input - The input for object generation
             * @param options - Provider-specific options
             * @returns Effect<EffectiveResponse<GenerateObjectResult>, ProviderOperationError | ProviderConfigError>
             */
            const generateObject = (
                input: EffectiveInput,
                options: ProviderGenerateObjectOptions<unknown>
            ): Effect.Effect<EffectiveResponse<GenerateObjectResult<unknown>>, ProviderOperationError | ProviderConfigError> =>
                Effect.gen(function* () {
                    const provider = yield* getConfiguredProvider();
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
                    return yield* Effect.fail(new ProviderOperationError({
                        operation: "generateObject",
                        message: "Not implemented",
                        providerName: provider.name,
                        module: "ProviderClient",
                        method: "generateObject"
                    }));
                });

            /**
             * Stream a structured object based on a schema from input.
             * @param input - The input for streaming object generation
             * @param options - Provider-specific options
             * @returns Stream<EffectiveResponse<StreamingObjectResult>, ProviderOperationError | ProviderConfigError>
             */
            const streamObject = (
                input: EffectiveInput,
                options: ProviderGenerateObjectOptions<unknown>
            ): Stream.Stream<EffectiveResponse<StreamingObjectResult<unknown>>, ProviderOperationError | ProviderConfigError> =>
                Stream.unwrap(
                    Effect.gen(function* () {
                        const provider = yield* getConfiguredProvider();
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
                    const provider = yield* getConfiguredProvider();
                    const modelId = yield* validateModelId({
                        options,

                        method: "generateSpeech"
                    });
                    yield* validateCapabilities({
                        providerName: provider.name,
                        required: "audio",
                        actual: provider.capabilities,

                        method: "generateSpeech"
                    });
                    return yield* Effect.fail(new ProviderOperationError({
                        operation: "generateSpeech",
                        message: "Not implemented",
                        providerName: provider.name,
                        module: "ProviderClient",
                        method: "generateSpeech"
                    }));
                });

            /**
             * Transcribe audio input.
             * @param input - The input for transcription
             * @param options - Provider-specific options
             * @returns Effect<EffectiveResponse<TranscribeResult>, ProviderOperationError | ProviderConfigError>
             */
            const transcribe = (
                input: EffectiveInput,
                options: ProviderTranscribeOptions
            ): Effect.Effect<EffectiveResponse<TranscribeResult>, ProviderOperationError | ProviderConfigError> =>
                Effect.gen(function* () {
                    const provider = yield* getConfiguredProvider();
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
                    return yield* Effect.fail(new ProviderOperationError({
                        operation: "transcribe",
                        message: "Not implemented",
                        providerName: provider.name,
                        module: "ProviderClient",
                        method: "transcribe"
                    }));
                });

            /**
             * Generate embeddings from input.
             * @param input - The input for embeddings generation
             * @param options - Provider-specific options
             * @returns Effect<EffectiveResponse<GenerateEmbeddingsResult>, ProviderOperationError | ProviderConfigError>
             */
            const generateEmbeddings = (
                input: string[],
                options?: ProviderGenerateEmbeddingsOptions
            ): Effect.Effect<EffectiveResponse<GenerateEmbeddingsResult>, ProviderOperationError | ProviderConfigError> =>
                Effect.gen(function* () {
                    const provider = yield* getConfiguredProvider();
                    yield* validateCapabilities({
                        providerName: provider.name,
                        required: "embeddings",
                        actual: provider.capabilities,

                        method: "generateEmbeddings"
                    });
                    return yield* Effect.fail(new ProviderOperationError({
                        operation: "generateEmbeddings",
                        message: "Not implemented",
                        providerName: provider.name,
                        module: "ProviderClient",
                        method: "generateEmbeddings"
                    }));
                });

            return {
                getConfiguredProvider,
                setVercelProvider,
                generateText,
                streamText,
                generateObject,
                streamObject,
                generateSpeech,
                transcribe,
                generateEmbeddings
            };
        })
    }
) { }