import { Effect } from "effect";

import { ModelCapability } from "@/schema.js";
import { LanguageModelV1 } from "@ai-sdk/provider";
import {
    ProviderConfigError,
    ProviderOperationError
} from "./errors.js";
import { 
    AnthropicProvider,
    DeepSeekProvider, 
    GoogleGenerativeAIProvider,
    GroqProvider,
    OpenAIProvider,
    PerplexityProvider,
    XaiProvider
} from "./types.js";
import {
    EffectiveProviderApi,
    EffectiveResponse,
    GenerateEmbeddingsResult,
    GenerateObjectResult,
    GenerateSpeechResult,
    GenerateTextResult,
    ProviderGenerateEmbeddingsOptions,
    ProviderGenerateObjectOptions,
    ProviderGenerateSpeechOptions,
    ProviderGenerateTextOptions,
    ProviderTranscribeOptions,
    TranscribeResult
} from "./types.js";
import { EffectiveInput } from "@/services/ai/input/service.js";

/**
 * Core provider client API interface that all providers must implement.
 * Methods are specifically typed to match capabilities and return types.
 */
export interface ProviderClientApi {
    /**
     * Set a Vercel AI SDK provider for this client.
     * @param vercelProvider The Vercel AI SDK provider instance with provider name as discriminator
     * @param capabilities The set of capabilities supported by this provider
     * @returns An Effect that resolves to void on success or fails with ProviderConfigError
     */
    setVercelProvider(
        vercelProvider: EffectiveProviderApi,
        capabilities: Set<ModelCapability>
    ): Effect.Effect<void, ProviderConfigError>;

    readonly getConfiguredProvider: () => Effect.Effect<
        EffectiveProviderApi,
        ProviderConfigError
    >;

    readonly generateText: (
        input: EffectiveInput,
        options?: ProviderGenerateTextOptions,
    ) => Effect.Effect<
        EffectiveResponse<GenerateTextResult>,
        ProviderOperationError | ProviderConfigError
    >;

    readonly generateObject: <T>(
        input: EffectiveInput,
        options: ProviderGenerateObjectOptions<T>,
    ) => Effect.Effect<
        EffectiveResponse<GenerateObjectResult<T>>,
        ProviderOperationError | ProviderConfigError
    >;

    readonly generateSpeech: (
        input: string,
        options?: ProviderGenerateSpeechOptions,
    ) => Effect.Effect<
        EffectiveResponse<GenerateSpeechResult>,
        ProviderOperationError | ProviderConfigError
    >;

    readonly transcribe: (
        audio: ArrayBuffer,
        options?: ProviderTranscribeOptions,
    ) => Effect.Effect<
        EffectiveResponse<TranscribeResult>,
        ProviderOperationError | ProviderConfigError
    >;

    readonly generateEmbeddings: (
        input: string[],
        options?: ProviderGenerateEmbeddingsOptions,
    ) => Effect.Effect<
        EffectiveResponse<GenerateEmbeddingsResult>,
        ProviderOperationError | ProviderConfigError
    >;

    readonly getCapabilities: () => Effect.Effect<
        Set<ModelCapability>,
        ProviderOperationError | ProviderConfigError
    >;

    readonly getModels: (capability?: ModelCapability) => Effect.Effect<
        LanguageModelV1[],
        ProviderOperationError | ProviderConfigError
    >;
}
