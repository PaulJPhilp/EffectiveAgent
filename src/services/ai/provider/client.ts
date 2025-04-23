/**
 * @file Provides the ProviderClient service and related utilities for interacting with AI provider APIs.
 * @module services/ai/provider/client
 */

import { ModelCapability } from '@/schema.js';
import { JsonValue } from '@/types.js';
import { AnthropicProvider, AnthropicProviderSettings, createAnthropic } from '@ai-sdk/anthropic';
import { DeepSeekProvider, DeepSeekProviderSettings, createDeepSeek } from '@ai-sdk/deepseek';
import { GoogleGenerativeAIProvider, GoogleGenerativeAIProviderSettings, createGoogleGenerativeAI } from '@ai-sdk/google';
import { GroqProvider, GroqProviderSettings, createGroq } from '@ai-sdk/groq';
import { OpenAIProvider, OpenAIProviderSettings, createOpenAI } from '@ai-sdk/openai';
import { OpenAICompatibleProvider } from "@ai-sdk/openai-compatible";
import { PerplexityProvider, PerplexityProviderSettings, createPerplexity } from '@ai-sdk/perplexity';
import { LanguageModelV1, ProviderV1 } from '@ai-sdk/provider';
import { XaiProvider, XaiProviderSettings, createXai } from '@ai-sdk/xai';
import { OpenRouterProvider } from '@openrouter/ai-sdk-provider';
import {
    CoreMessage,
    CoreUserMessage,
    DataContent,
    generateObject,
    generateText,
    streamObject,
    streamText
} from 'ai';
import { Effect, Layer } from 'effect';
import { ProviderMissingApiKeyError, ProviderMissingCapabilityError, ProviderNotFoundError } from './errors.js';
import { ProvidersType } from './schema.js';
import { ChatOptions, ChatResult, EffectiveProviderApi, EffectiveProviderSettings, GenerateEmbeddingsResult, GenerateImageResult, GenerateObjectResult, GenerateSpeechResult, GenerateTextOptions, GenerateTextResult, StreamTextOptions, StreamingObjectResult, StreamingTextResult, TranscribeResult } from './types.js';


/**
 * Core provider client API interface that all providers must implement.
 * Methods are specifically typed to match capabilities and return types.
 */
export interface ProviderClientApi {
    /**
     * Generate text completion from a prompt
     */
    generateText(options: GenerateTextOptions): Effect.Effect<GenerateTextResult, Error>

    /**
     * Stream text completion from a prompt
     */
    streamText(options: StreamTextOptions): Effect.Effect<StreamingTextResult, Error>

    /**
     * Generate a structured object based on a schema
     */
    generateObject<T>(options: GenerateTextOptions & { schema: unknown }): Effect.Effect<GenerateObjectResult<T>, Error>

    /**
     * Stream a structured object based on a schema
     */
    streamObject<T>(options: StreamTextOptions & { schema: unknown }): Effect.Effect<StreamingObjectResult<T>, Error>

    /**
     * Generate chat completion from messages
     */
    chat(options: ChatOptions): Effect.Effect<ChatResult, Error>

    /**
     * Generate embeddings for one or more texts
     */
    generateEmbeddings(texts: string[], options?: {
        model?: string
        batchSize?: number
    }): Effect.Effect<GenerateEmbeddingsResult, Error>

    /**
     * Generate images from a text prompt
     */
    generateImage(prompt: string, options?: {
        model?: string
        size?: string
        quality?: string
        style?: string
        n?: number
    }): Effect.Effect<GenerateImageResult, Error>

    /**
     * Generate speech from text
     */
    generateSpeech(text: string, options?: {
        model?: string
        voice?: string
        speed?: string
        pitch?: string
        language?: string
    }): Effect.Effect<GenerateSpeechResult, Error>

    /**
     * Transcribe speech to text
     */
    transcribe(audioData: string | Uint8Array, options?: {
        model?: string
        language?: string
        diarization?: boolean
        timestamps?: boolean
        quality?: string
    }): Effect.Effect<TranscribeResult, Error>

    /**
     * Generate embeddings for one or more texts
     */
    generateEmbeddings(texts: string[], options?: {
        model?: string
        batchSize?: number
    }): Effect.Effect<GenerateEmbeddingsResult, Error>

    /**
     * Get the capabilities supported by this provider
     */
    getCapabilities(): Set<ModelCapability>

    /**
     * Get the available models for this provider
     */
    getModels(): Effect.Effect<LanguageModelV1[], Error>
}

// Explicitly type as Tag<ProviderClientApi>
/**
 * VercelProvider is a union type representing all supported provider client types.
 *
 * This type is used internally by the ProviderClient service to abstract over
 * different provider client implementations (e.g., OpenAI, Anthropic, Google, etc.).
 */
type VercelProvider = OpenAICompatibleProvider | OpenRouterProvider;

/**
 * Helper function to determine provider capabilities based on available methods
 */
function getProviderCapabilities(provider: OpenAIProvider | AnthropicProvider | GoogleGenerativeAIProvider | XaiProvider | PerplexityProvider | GroqProvider | DeepSeekProvider): Set<ModelCapability> {
    const capabilities = new Set<ModelCapability>();

    // Check for text generation capability
    if (typeof provider.languageModel === "function") {
        capabilities.add("text-generation");
    }

    // Check for chat capability based on provider type
    if ("chat" in provider && typeof provider.chat === "function") {
        capabilities.add("chat");
    }

    // Check for image generation capability
    if (typeof provider.imageModel === "function") {
        capabilities.add("image-generation");
    }

    // Check for audio capabilities
    if (typeof provider.speechModel === "function") {
        capabilities.add("audio");
    }
    if (typeof provider.transcriptionModel === "function") {
        capabilities.add("audio");
    }

    // Check for embeddings capability
    if (typeof provider.textEmbeddingModel === "function") {
        capabilities.add("embeddings");
    }

    return capabilities;
}

/**
 * Helper function to check if a provider has a specific capability
 */
function hasCapability(provider: EffectiveProviderApi, capability: ModelCapability): boolean {
    return provider.capabilities.has(capability);
}

/**
 * ProviderClient is a Context.Tag that provides access to the ProviderClientApi implementation.
 */
export class ProviderClient extends Effect.Service<ProviderClientApi>()("ProviderClient", {
    effect: Effect.gen(function* () {
        let vercelProvider: EffectiveProviderApi | undefined;
        let providerName: ProvidersType;

        return {
            /**
             * Initializes and sets the provider client for a given provider and API key.
             * @param provider - The provider name (e.g., 'openai', 'anthropic')
             * @param apiKeyEnvVar - The environment variable containing the API key
             * @returns Effect yielding the initialized provider client or an error
             */
            setVercelProvider: (provider: ProvidersType, apiKeyEnvVar: string) => {
                return Effect.gen(function* () {
                    if (vercelProvider) {
                        return vercelProvider;
                    }
                    providerName = provider;
                    const settings = createProviderSettings(provider, apiKeyEnvVar);
                    vercelProvider = yield* createProvider(provider, settings);
                    return vercelProvider;
                });
            },

            /**
             * Gets the current provider name.
             * @returns The name of the currently set provider
             */
            getProviderName: () => {
                return providerName;
            },

            /**
             * Generates text using a language model.
             * @param options - The options for text generation
             * @returns Effect yielding the generated text or an error
             * @returns ProviderNotFoundError if provider is not initialized
             * @returns ProviderMissingCapability if provider doesn't support text generation
             */
            generateText: async (options: GenerateTextOptions) => {
                if (!vercelProvider) {
                    return Effect.fail(new ProviderNotFoundError("Provider not initialized"));
                }
                if (!hasCapability(vercelProvider, "text-generation")) {
                    return Effect.fail(new ProviderMissingCapabilityError({ providerName: vercelProvider.name, capability: "text-generation" }));
                }
                return generateText(options);
            },

            /**
             * Streams text using a language model.
             * @param options - The options for text streaming
             * @returns Effect yielding the generated text or an error
             * @returns ProviderNotFoundError if provider is not initialized
             * @returns ProviderMissingCapability if provider doesn't support text streaming
             */
            streamText: async (options: StreamTextOptions) => {
                if (!vercelProvider) {
                    return Effect.fail(new ProviderNotFoundError("Provider not initialized"));
                }
                if (!hasCapability(vercelProvider, "text-generation")) {
                    return Effect.fail(new ProviderMissingCapabilityError({ providerName: vercelProvider.name, capability: "text-generation" }));
                }
                return streamText(options);
            },

            /**
             * Generates a chat response using a language model.
             * @param options - The options for chat generation
             * @returns Effect yielding the generated response or an error
             * @returns ProviderNotFoundError if provider is not initialized
             * @returns ProviderMissingCapability if provider doesn't support chat
             */
            chat: async (options: ChatOptions) => {
                if (!vercelProvider) {
                    return Effect.fail(new ProviderNotFoundError("Provider not initialized"));
                }
                if (!hasCapability(vercelProvider, "chat")) {
                    return Effect.fail(new ProviderMissingCapabilityError({ providerName: vercelProvider.name, capability: "chat" }));
                }
                const model = vercelProvider.provider.languageModel(options.modelId);

                const chatMessages: CoreUserMessage[] = options.messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })).filter(msg => msg.role !== "tool" && msg.role !== "system" && msg.role !== "assistant") as CoreUserMessage[];

                return generateText({
                    model,
                    messages: chatMessages
                });
            },

            /**
             * Generates an object using the specified language model and prompt.
             * @param modelId - The model identifier.
             * @param prompt - The prompt to generate the object from.
             */
            generateObject: async (modelId: string, prompt: string) => {
                if (!vercelProvider) {
                    return Effect.fail(new ProviderNotFoundError("Provider not initialized"));
                }
                if (!hasCapability(vercelProvider, "text-generation")) {
                    return Effect.fail(new ProviderMissingCapabilityError({ providerName: vercelProvider.name, capability: "text-generation" }));
                }
                const model = vercelProvider.provider.languageModel(modelId);
                return generateObject({
                    model: model,
                    prompt: prompt,
                    output: "no-schema"
                });
            },

            /**
             * Streams a structured object from a language model.
             * @param modelId - The model identifier to use
             * @param prompt - The prompt to stream the object from
             * @returns Effect yielding a stream of object chunks or an error
             * @returns ProviderNotFoundError if provider is not initialized
             * @returns ProviderMissingCapability if provider doesn't support text generation
             */
            streamObject: async (modelId: string, prompt: string) => {
                if (!vercelProvider) {
                    return Effect.fail(new ProviderNotFoundError("Provider not initialized"));
                }
                if (!hasCapability(vercelProvider, "text-generation")) {
                    return Effect.fail(new ProviderMissingCapabilityError({ providerName: vercelProvider.name, capability: "text-generation" }));
                }
                const model = vercelProvider.provider.languageModel(modelId);
                return streamObject({
                    model: model,
                    prompt: prompt,
                    output: "no-schema"
                });
            },

            /**
             * Generates speech from text using a speech model.
             * @param modelId - The model identifier to use
             * @param prompt - The text to convert to speech
             * @returns Effect yielding the generated speech or an error
             * @returns ProviderNotFoundError if provider is not initialized or speech model not found
             * @returns ProviderMissingCapability if provider doesn't support audio capability
             */
            generateSpeech: async (modelId: string, prompt: string) => {
                if (!vercelProvider) {
                    return Effect.fail(new ProviderNotFoundError("Provider not initialized"));
                }
                if (!hasCapability(vercelProvider, "audio")) {
                    return Effect.fail(new ProviderMissingCapabilityError({ providerName: vercelProvider.name, capability: "audio" }));
                }
                const provider = vercelProvider.provider;
                if (provider.speechModel === undefined) {
                    return Effect.fail(new ProviderNotFoundError("Speech model not found"));
                }
                const model = provider.speechModel(modelId);
                return generateSpeech({
                    model: model,
                    text: prompt
                });
            },

            /**
             * Generates an image from a prompt using the specified image model.
             * @param modelId - The model identifier.
             * @param prompt - The prompt to generate the image from.
             * @returns Effect yielding the generated image or an error
             * @returns ProviderNotFoundError if provider is not initialized or image model not found
             * @returns ProviderMissingCapability if provider doesn't support image generation
             */
            generateImage: async (modelId: string, prompt: string) => {
                if (!vercelProvider) {
                    return Effect.fail(new ProviderNotFoundError("Provider not initialized"));
                }
                if (!hasCapability(vercelProvider, "image-generation")) {
                    return Effect.fail(new ProviderMissingCapabilityError({ providerName: vercelProvider.name, capability: "image-generation" }));
                }
                const provider = vercelProvider.provider;
                if (provider.imageModel === undefined) {
                    return Effect.fail(new ProviderNotFoundError("Image model not found"));
                }
                const model = provider.imageModel(modelId);
                return generateImage({
                    model: model,
                    prompt: prompt
                });
            },

            /**
             * Transcribes audio to text using a transcription model.
             * @param modelId - The model identifier to use
             * @param audio - The audio content to transcribe
             * @returns Effect yielding the transcription or an error
             * @returns ProviderNotFoundError if provider is not initialized or transcription model not found
             * @returns ProviderMissingCapability if provider doesn't support audio capability
             */
            transcribe: async (modelId: string, audio: DataContent) => {
                if (!vercelProvider) {
                    return Effect.fail(new ProviderNotFoundError("Provider not initialized"));
                }
                if (!hasCapability(vercelProvider, "audio")) {
                    return Effect.fail(new ProviderMissingCapabilityError({ providerName: vercelProvider.name, capability: "audio" }));
                }
                const provider = vercelProvider.provider;
                if (provider.transcriptionModel === undefined) {
                    return Effect.fail(new ProviderNotFoundError("Transcription model not found"));
                }
                const model = provider.transcriptionModel(modelId);
                return transcribe({
                    model,
                    audio
                });
            },

            /**
             * Generates embeddings from text using an embedding model.
             * @param modelId - The model identifier to use
             * @param values - Array of text strings to embed
             * @returns Effect yielding the embeddings or an error
             * @returns ProviderNotFoundError if provider is not initialized or embedding model not found
             * @returns ProviderMissingCapability if provider doesn't support embeddings
             */
            embedding: async (modelId: string, values: string[]) => {
                if (!vercelProvider) {
                    return Effect.fail(new ProviderNotFoundError("Provider not initialized"));
                }
                if (!hasCapability(vercelProvider, "embeddings")) {
                    return Effect.fail(new ProviderMissingCapabilityError({ providerName: vercelProvider.name, capability: "embeddings" }));
                }
                const provider = vercelProvider.provider;
                if (provider.textEmbeddingModel === undefined) {
                    return Effect.fail(new ProviderNotFoundError("Embedding model not found"));
                }
                const model = provider.textEmbeddingModel(modelId);
                return model.doEmbed({
                    values: values
                });
            },
        };
    })
}) { }

/**
 * Creates a provider client instance for the given provider and API key.
 *
 * @param providerId - The provider name (e.g., 'openai', 'anthropic').
 * @param settings - The provider-specific settings.
 * @returns Effect yielding the initialized provider client or an error.
 */
export function createProvider(providerId: ProvidersType, settings: EffectiveProviderSettings): Effect.Effect<EffectiveProviderApi, ProviderNotFoundError | ProviderMissingApiKeyError> {
    // Check if the providerId matches the settings type
    if (providerId !== settings.name) {
        return Effect.fail(new ProviderNotFoundError(`Provider ${providerId} does not match settings type ${settings.name}`));
    }

    // Type-safe provider creation based on discriminated union
    switch (settings.name) {
        case "openai": {
            const provider = createOpenAI(settings.settings);
            return Effect.succeed({
                name: "openai",
                provider,
                capabilities: getProviderCapabilities(provider)
            });
        }
        case "anthropic": {
            const provider = createAnthropic(settings.settings);
            return Effect.succeed({
                name: "anthropic",
                provider,
                capabilities: getProviderCapabilities(provider)
            });
        }
        case "google": {
            const provider = createGoogleGenerativeAI(settings.settings);
            return Effect.succeed({
                name: "google",
                provider,
                capabilities: getProviderCapabilities(provider)
            });
        }
        case "xai": {
            const provider = createXai(settings.settings);
            return Effect.succeed({
                name: "xai",
                provider,
                capabilities: getProviderCapabilities(provider)
            });
        }
        case "perplexity": {
            const provider = createPerplexity(settings.settings);
            return Effect.succeed({
                name: "perplexity",
                provider,
                capabilities: getProviderCapabilities(provider)
            });
        }
        case "groq": {
            const provider = createGroq(settings.settings);
            return Effect.succeed({
                name: "groq",
                provider,
                capabilities: getProviderCapabilities(provider)
            });
        }
        case "deepseek": {
            const provider = createDeepSeek(settings.settings);
            return Effect.succeed({
                name: "deepseek",
                provider,
                capabilities: getProviderCapabilities(provider)
            });
        }
        default:
            return Effect.fail(new ProviderNotFoundError(`Provider ${providerId} not found`));
    }
}

/**
 * Helper function to create a provider-specific layer
 * @param providerName The name of the provider this layer handles
 * @param createSettings Function to create provider-specific settings
 */
export function createProviderLayer(providerName: ProvidersType) {
    return Layer.effect(
        ProviderClient,
        Effect.gen(function* () {
            const defaultClient = yield* ProviderClient;
            return {
                setVercelProvider: (provider: ProvidersType, apiKeyEnvVar: string) => {
                    return Effect.gen(function* () {
                        if (provider === providerName) {
                            const settings = createProviderSettings(provider, apiKeyEnvVar);
                            return yield* createProvider(provider, settings);
                        } else {
                            return yield* Effect.fail(new ProviderNotFoundError(`Provider ${provider} does not match layer for ${providerName}`));
                        }
                    });
                },
                // Delegate all other methods to the default implementation
                getProviderName: () => providerName,
                generateText: defaultClient.generateText,
                streamText: defaultClient.streamText,
                chat: defaultClient.chat,
                generateObject: defaultClient.generateObject,
                streamObject: defaultClient.streamObject,
                generateSpeech: defaultClient.generateSpeech,
                generateImage: defaultClient.generateImage,
                transcribe: defaultClient.transcribe,
                generateEmbeddings: defaultClient.generateEmbeddings,
                getCapabilities: defaultClient.getCapabilities,
                getModels: defaultClient.getModels
            };
        })
    );
}

/**
 * Creates provider-specific settings based on the provider type.
 * This ensures type safety when creating settings objects.
 */
function createProviderSettings(provider: ProvidersType, apiKey: string): EffectiveProviderSettings {
    const baseSettings = {
        apiKey,
        headers: {} as Record<string, string>
    };

    switch (provider) {
        case "openai":
            return { name: "openai", settings: { ...baseSettings } };
        case "anthropic":
            return { name: "anthropic", settings: { ...baseSettings } };
        case "google":
            return { name: "google", settings: { ...baseSettings } };
        case "xai":
            return { name: "xai", settings: { ...baseSettings } };
        case "perplexity":
            return { name: "perplexity", settings: { ...baseSettings } };
        case "groq":
            return { name: "groq", settings: { ...baseSettings } };
        case "deepseek":
            return { name: "deepseek", settings: { ...baseSettings } };
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

function generateSpeech(arg0: { model: import("@ai-sdk/provider").SpeechModelV1; text: string; }): any {
    throw new Error('Function not implemented.');
}


function generateImage(arg0: { model: import("@ai-sdk/provider").ImageModelV1; prompt: string; }): any {
    throw new Error('Function not implemented.');
}


function transcribe(arg0: { model: import("@ai-sdk/provider").TranscriptionModelV1; audio: DataContent; }): any {
    throw new Error('Function not implemented.');
}
