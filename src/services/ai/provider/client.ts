/**
 * @file Provides the ProviderClient service and related utilities for interacting with AI provider APIs.
 * @module services/ai/provider/client
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createPerplexity } from '@ai-sdk/perplexity';
import { LanguageModelV1, ProviderV1 } from '@ai-sdk/provider';
import { createXai } from '@ai-sdk/xai';
import { OpenRouterProvider, createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
    experimental_generateImage as generateImage,
    generateObject,
    experimental_generateSpeech as generateSpeech,
    generateText,
    streamObject,
    streamText,
    experimental_transcribe as transcribe
} from 'ai';
import { Effect } from 'effect';
import { ProviderMissingApiKeyError, ProviderNotFoundError } from './errors.js';
import { ProvidersType } from './schema.js';

import { type DataContent } from 'ai';

/**
 * ProviderClientApi defines the interface for interacting with AI provider APIs.
 *
 * Methods include:
 * - setVercelProvider: Sets and initializes the provider client for a given provider and API key.
 * - generateText: Generates text using a language model.
 * - streamText: Streams text from a language model.
 * - generateObject: Generates an object using a language model.
 * - streamObject: Streams an object from a language model.
 * - generateSpeech: Generates speech from text using a speech model.
 * - generateImage: Generates an image from a prompt using an image model.
 * - transcribe: Transcribes audio using a transcription model.
 * - embedding: Generates embeddings from text using an embedding model.
 */
export interface ProviderClientApi {
    /**
     * Sets and initializes the provider client for the given provider and API key.
     * @param provider - The provider name (e.g., 'openai', 'anthropic').
     * @param apiKeyEnvVar - The environment variable containing the API key.
     * @returns Effect yielding the initialized provider client or an error.
     */
    setVercelProvider: (provider: ProvidersType, apiKeyEnvVar: string) => Effect.Effect<ProviderV1 | OpenRouterProvider, ProviderNotFoundError | ProviderMissingApiKeyError>;
    /**
     * Generates text using the specified language model and prompt.
     * @param modelId - The model identifier.
     * @param prompt - The prompt to generate text from.
     */
    generateText: (modelId: string, prompt: string) => LanguageModelV1;
    /**
     * Streams text from the specified language model and prompt.
     * @param modelId - The model identifier.
     * @param prompt - The prompt to stream text from.
     */
    streamText: (modelId: string, prompt: string) => ProviderV1["languageModel"];
    /**
     * Generates an object using the specified language model and prompt.
     * @param modelId - The model identifier.
     * @param prompt - The prompt to generate the object from.
     */
    generateObject: (modelId: string, prompt: string) => ProviderV1["textEmbeddingModel"];
    /**
     * Streams an object from the specified language model and prompt.
     * @param modelId - The model identifier.
     * @param prompt - The prompt to stream the object from.
     */
    streamObject: (modelId: string, prompt: string) => ProviderV1["textEmbeddingModel"];
    /**
     * Generates speech from text using the specified speech model.
     * @param modelId - The model identifier.
     * @param prompt - The text to convert to speech.
     */
    generateSpeech: (modelId: string, prompt: string) => ProviderV1["speechModel"];
    /**
     * Generates an image from a prompt using the specified image model.
     * @param modelId - The model identifier.
     * @param prompt - The prompt to generate the image from.
     */
    generateImage: (modelId: string, prompt: string) => ProviderV1["imageModel"];
    /**
     * Transcribes audio using the specified transcription model.
     * @param modelId - The model identifier.
     * @param prompt - The audio content to transcribe.
     */
    transcribe: (modelId: string, prompt: string) => ProviderV1["transcriptionModel"];
    /**
     * Generates embeddings from text using the specified embedding model.
     * @param modelId - The model identifier.
     * @param prompt - The text to embed.
     */
    embedding: (modelId: string, prompt: string) => ProviderV1["textEmbeddingModel"];
}

// Explicitly type as Tag<ProviderClientApi>
/**
 * VercelProvider is a union type representing all supported provider client types.
 *
 * This type is used internally by the ProviderClient service to abstract over
 * different provider client implementations (e.g., OpenAI, Anthropic, Google, etc.).
 */
type VercelProvider = ProviderV1 | OpenRouterProvider;

/**
 * ProviderClient is an Effect service for interacting with AI provider APIs.
 *
 * Provides methods to set the provider client and perform various AI operations (text, image, speech, etc.).
 */
export class ProviderClient extends Effect.Service<ProviderClientApi>()(
    "ProviderClient",
    {
        effect: Effect.gen(function* () {
            // Create a ref to hold the provider client
            let vercelProvider: VercelProvider | undefined
            return {

                setVercelProvider: (provider: ProvidersType, apiKeyEnvVar: string) => {
                    return Effect.gen(function* () {
                        if (vercelProvider) {
                            return vercelProvider;
                        }
                        vercelProvider = yield* createProvider(provider, apiKeyEnvVar);
                        return vercelProvider;
                    });
                },

                generateText: (modelId: string, prompt: string) => {
                    if (vercelProvider) {
                        const model = vercelProvider.languageModel(modelId);
                        return generateText({
                            model: model,
                            prompt: prompt
                        });
                    } else {
                        return Effect.fail(new ProviderNotFoundError("Model is not a language model"));
                    }
                },
                streamText: (modelId: string, prompt: string) => {
                    if (vercelProvider) {
                        const model = vercelProvider.languageModel(modelId);
                        return streamText({
                            model: model,
                            prompt: prompt
                        });
                    } else {
                        return Effect.fail(new ProviderNotFoundError("Model is not a language model"));
                    }

                },
                generateObject: (modelId: string, prompt: string) => {

                    if (vercelProvider) {
                        const model = vercelProvider.languageModel(modelId);
                        return generateObject({
                            model: model,
                            prompt: prompt,
                            output: "no-schema"
                        });
                    } else {
                        return Effect.fail(new ProviderNotFoundError("Model is not a language model"));
                    }
                },
                streamObject: (modelId: string, prompt: string) => {
                    if (vercelProvider) {
                        const model = vercelProvider.languageModel(modelId);
                        return streamObject({
                            model: model,
                            prompt: prompt,
                            output: "no-schema"
                        });
                    } else {
                        return Effect.fail(new ProviderNotFoundError("Model is not a language model"));
                    }
                },
                generateSpeech: (modelId: string, prompt: string) => {
                    if (vercelProvider) {
                        if ('isOpenRouter' in vercelProvider) {
                            return Effect.fail(new ProviderNotFoundError("OpenRouter does not support speech generation"));
                        }

                        const provider = vercelProvider as ProviderV1;
                        if (provider.speechModel === undefined) {
                            return Effect.fail(new ProviderNotFoundError("Speech model not found"));
                        }
                        const model = provider.speechModel(modelId);
                        return generateSpeech({
                            model: model,
                            text: prompt
                        });
                    } else {
                        return Effect.fail(new ProviderNotFoundError("Model is not a language model"));
                    }
                },

                generateImage: (modelId: string, prompt: string) => {

                    if (vercelProvider) {
                        if ('isOpenRouter' in vercelProvider) {
                            return Effect.fail(new ProviderNotFoundError("OpenRouter does not support image generation"));
                        }

                        const provider = vercelProvider as ProviderV1;
                        if (provider.imageModel === undefined) {
                            return Effect.fail(new ProviderNotFoundError("Image model not found"));
                        }
                        const model = provider.imageModel(modelId);
                        return generateImage({
                            model: model,
                            prompt: prompt
                        });
                    } else {
                        return Effect.fail(new ProviderNotFoundError("Model is not a language model"));
                    }
                },
                transcribe: (modelId: string, audio: DataContent) => {
                    if (vercelProvider) {
                        if ('isOpenRouter' in vercelProvider) {
                            return Effect.fail(new ProviderNotFoundError("OpenRouter does not support image generation"));
                        }

                        const provider = vercelProvider as ProviderV1;
                        if (provider.transcriptionModel === undefined) {
                            return Effect.fail(new ProviderNotFoundError("Transcription model not found"));
                        }
                        const model = provider.transcriptionModel(modelId);
                        return transcribe({
                            model,
                            audio
                        });
                    } else {
                        return Effect.fail(new ProviderNotFoundError("Model is not a language model"));
                    }
                },
                embedding: (modelId: string, values: string[]) => {
                    if (vercelProvider) {
                        if ('isOpenRouter' in vercelProvider) {
                            return Effect.fail(new ProviderNotFoundError("OpenRouter does not support embedding generation"));
                        }

                        const provider = vercelProvider as ProviderV1;
                        if (provider.textEmbeddingModel === undefined) {
                            return Effect.fail(new ProviderNotFoundError("Embedding model not found"));
                        }
                        const model = provider.textEmbeddingModel(modelId);
                        return model.doEmbed({
                            values: values
                        });
                    } else {
                        return Effect.fail(new ProviderNotFoundError("Model is not a language model"));
                    }
                },

            }
        }),
    }) { }

/**
 * Creates a provider client instance for the given provider and API key.
 *
 * @param providerId - The provider name (e.g., 'openai', 'anthropic').
 * @param apiKeyEnvVar - The environment variable containing the API key.
 * @returns Effect yielding the initialized provider client or an error.
 */
export function createProvider(providerId: ProvidersType, apiKeyEnvVar: string): Effect.Effect<ProviderV1 | OpenRouterProvider, ProviderNotFoundError | ProviderMissingApiKeyError> {
    const apiKey = process.env[apiKeyEnvVar];
    if (!apiKey) {
        return Effect.fail(new ProviderMissingApiKeyError(`API key for ${providerId} not found in environment variable ${apiKeyEnvVar}`));
    }
    // Check if the providerId is valid
    if (providerId === "openai") {
        return Effect.succeed(createOpenAI({ apiKey: apiKey, compatibility: 'strict' }));
    } else if (providerId === "anthropic") {
        return Effect.succeed(createAnthropic({ apiKey: apiKey }));
    } else if (providerId === "google") {
        return Effect.succeed(createGoogleGenerativeAI());
    } else if (providerId === "xai") {
        return Effect.succeed(createXai({ apiKey: apiKey }));
    } else if (providerId === "perplexity") {
        return Effect.succeed(createPerplexity({ apiKey: apiKey }));
    } else if (providerId === "groq") {
        return Effect.succeed(createGroq({ apiKey: apiKey }));
    } else if (providerId === "openrouter") {
        return Effect.succeed(createOpenRouter({ apiKey: apiKey }));
    } else if (providerId === "deepseek") {
        return Effect.succeed(createDeepSeek({ apiKey: apiKey }));
    } else {
        return Effect.fail(new ProviderNotFoundError(`Provider ${providerId} not found`));
    }
}