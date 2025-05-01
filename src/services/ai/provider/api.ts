import { Effect } from "effect";
import type { ModelServiceApi } from "@/services/ai/model/api.js";

import { ModelCapability } from "@/schema.js";
import { LanguageModelV1 } from "@ai-sdk/provider";
import {
    ProviderConfigError,
    ProviderOperationError,
    ProviderNotFoundError,
    ProviderMissingCapabilityError
} from "./errors.js";
import { ProviderFile, ProvidersType } from "./schema.js";
import {
    EffectiveProviderApi,
    EffectiveResponse,
    GenerateEmbeddingsResult,
    GenerateObjectResult,
    GenerateSpeechResult,
    GenerateTextResult,
    GenerateImageResult,
    ProviderGenerateEmbeddingsOptions,
    ProviderGenerateObjectOptions,
    ProviderGenerateSpeechOptions,
    ProviderGenerateTextOptions,
    ProviderGenerateImageOptions,
    ProviderTranscribeOptions,
    ProviderChatOptions,
    TranscribeResult
} from "./types.js";
import { EffectiveInput } from "@/services/ai/input/service.js";

/**
 * API contract for the ProviderService. Defines methods for loading provider configuration
 * and retrieving provider clients.
 */
export interface ProviderServiceApi {
    /**
     * Loads provider configurations from the config provider.
     * @returns An Effect containing the validated provider configuration or a ProviderConfigError
     */
    load: Effect.Effect<ProviderFile, ProviderConfigError>;

    /**
     * Retrieves and configures a provider client for the specified provider.
     * @param providerName - The name of the provider to use
     * @returns An Effect containing the configured provider client or an error
     * @throws ProviderConfigError - If the provider configuration cannot be loaded or is invalid
     * @throws ProviderNotFoundError - If the specified provider is not found in the configuration
     * @throws ProviderOperationError - If there is an error configuring the provider
     */
    getProviderClient(
        providerName: ProvidersType
    ): Effect.Effect<ProviderClientApi, ProviderConfigError | ProviderNotFoundError | ProviderOperationError>;
}

/**
 * Core provider client API interface that all providers must implement.
 * Methods are specifically typed to match capabilities and return types.
 */
export interface ProviderClientApi {
    chat(effectiveInput: EffectiveInput, options: ProviderChatOptions): Effect.Effect<EffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderConfigError>;
    /**
     * Set a Vercel AI SDK provider for this client.
     * @param vercelProvider The Vercel AI SDK provider instance with provider name as discriminator
     * @returns An Effect that resolves to void on success or fails with ProviderConfigError
     */
    setVercelProvider(
        vercelProvider: EffectiveProviderApi
    ): Effect.Effect<void, ProviderConfigError>;

    readonly getProvider: () => Effect.Effect<
        EffectiveProviderApi,
        ProviderConfigError
    >;

    readonly generateText: (
        input: EffectiveInput,
        options: ProviderGenerateTextOptions,
    ) => Effect.Effect<
        EffectiveResponse<GenerateTextResult>,
        ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError
    >;

    readonly generateObject: <T = unknown>(
        input: EffectiveInput,
        options: ProviderGenerateObjectOptions<T>,
    ) => Effect.Effect<
        EffectiveResponse<GenerateObjectResult<T>>,
        ProviderOperationError | ProviderConfigError
    >;

    readonly generateSpeech: (
        input: string,
        options: ProviderGenerateSpeechOptions,
    ) => Effect.Effect<
        EffectiveResponse<GenerateSpeechResult>,
        ProviderOperationError | ProviderConfigError
    >;

    readonly transcribe: (
        input: ArrayBuffer,
        options: ProviderTranscribeOptions,
    ) => Effect.Effect<
        EffectiveResponse<TranscribeResult>,
        ProviderOperationError | ProviderConfigError
    >;

    readonly generateEmbeddings: (
        input: string[],
        options: ProviderGenerateEmbeddingsOptions,
    ) => Effect.Effect<
        EffectiveResponse<GenerateEmbeddingsResult>,
        ProviderOperationError | ProviderConfigError
    >;

    /**
     * Generate an image using the provider's image generation capability.
     * @param input - The effective input (prompt, parameters, etc)
     * @param options - Provider-specific image generation options
     * @returns An Effect containing the image generation result or an error
     */
    readonly generateImage: (
        input: EffectiveInput,
        options: ProviderGenerateImageOptions,
    ) => Effect.Effect<
        EffectiveResponse<GenerateImageResult>,
        ProviderOperationError | ProviderConfigError
    >;

    readonly getCapabilities: () => Effect.Effect<
        Set<ModelCapability>,
        ProviderOperationError | ProviderConfigError
    >;

    readonly getModels: () => Effect.Effect<LanguageModelV1[], ProviderConfigError, ModelServiceApi>;
}
