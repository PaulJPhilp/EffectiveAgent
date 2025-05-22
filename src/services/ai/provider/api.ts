import type { EffectiveInput, EffectiveResponse } from "@/types.js";
import type { Effect } from "effect";
import type { ProviderMetadata } from "./types.js";

import { ModelCapability } from "@/schema.js";
import { LanguageModelV1 } from "@ai-sdk/provider";
import { ModelServiceApi } from "../model/api.js";
import {
    ProviderMissingModelIdError,
    ProviderServiceConfigError,
    ProviderMissingCapabilityError,
    ProviderOperationError
} from "./errors.js";
import { ProviderToolError } from "./errors/tool.js";
import { ProvidersType } from "./schema.js";
import {
    EffectiveProviderApi,
    GenerateEmbeddingsResult,
    GenerateImageResult,
    GenerateObjectResult,
    GenerateSpeechResult,
    GenerateTextResult,
    ProviderChatOptions,
    ProviderGenerateEmbeddingsOptions,
    ProviderGenerateImageOptions,
    ProviderGenerateObjectOptions,
    ProviderGenerateSpeechOptions,
    ProviderGenerateTextOptions,
    ProviderTranscribeOptions,
    TranscribeResult
} from "./types.js";

// Use the imported ProviderClientApi type instead of redeclaring it
// export type { ProviderClientApi } from "./types.js";

/**
 * Defines the public API for the ProviderService.
 */
export type ProviderServiceApi = {
    /**
     * Loads the provider configuration.
     * Returns a ProviderFile containing ProviderMetadata objects.
     */
    load: () => Effect.Effect<{ providers: ProviderMetadata[]; name: string; description: string }, never>;

    /**
     * Gets a provider client by name.
     * @param providerName The name of the provider to get.
     * @returns An Effect resolving to the provider client.
     */
    getProviderClient: (providerName: string) => Effect.Effect<ProviderClientApi, never>;
};

/**
 * Core provider client API interface that all providers must implement.
 * Methods are specifically typed to match capabilities and return types.
 */
export interface ProviderClientApi {
    /**
     * Validates tool inputs against their schemas and prepares them for execution.
     * @param toolName - Name of the tool to validate input for
     * @param input - Raw input to validate
     * @returns Effect that resolves with validated input or fails with validation error
     */
    readonly validateToolInput: (
        toolName: string,
        input: unknown
    ) => Effect.Effect<unknown, ProviderToolError>;

    /**
     * Executes a tool with validated input.
     * @param toolName - Name of the tool to execute
     * @param input - Validated input for the tool
     * @returns Effect that resolves with tool output or fails with execution error
     */
    readonly executeTool: (
        toolName: string,
        input: unknown
    ) => Effect.Effect<unknown, ProviderToolError>;

    /**
     * Processes tool execution results and formats them for the model.
     * @param toolName - Name of the tool that was executed
     * @param result - Raw result from tool execution
     * @returns Effect that resolves with formatted result or fails with processing error
     */
    readonly processToolResult: (
        toolName: string,
        result: unknown
    ) => Effect.Effect<unknown, ProviderToolError>;


    chat(effectiveInput: EffectiveInput, options: ProviderChatOptions): Effect.Effect<EffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderServiceConfigError>;
    /**
     * Set a Vercel AI SDK provider for this client.
     * @param vercelProvider The Vercel AI SDK provider instance with provider name as discriminator
     * @returns An Effect that resolves to void on success or fails with ProviderServiceConfigError
     */
    setVercelProvider(
        vercelProvider: EffectiveProviderApi
    ): Effect.Effect<void, ProviderServiceConfigError>;

    readonly getProvider: () => Effect.Effect<
        EffectiveProviderApi,
        ProviderServiceConfigError
    >;

    readonly generateText: (
        input: EffectiveInput,
        options: ProviderGenerateTextOptions,
    ) => Effect.Effect<
        EffectiveResponse<GenerateTextResult>,
        ProviderOperationError | ProviderServiceConfigError | ProviderMissingCapabilityError
    >;

    readonly generateObject: <T = unknown>(
        input: EffectiveInput,
        options: ProviderGenerateObjectOptions<T>,
    ) => Effect.Effect<
        EffectiveResponse<GenerateObjectResult<T>>,
        ProviderOperationError | ProviderServiceConfigError
    >;

    readonly generateSpeech: (
        input: string,
        options: ProviderGenerateSpeechOptions,
    ) => Effect.Effect<
        EffectiveResponse<GenerateSpeechResult>,
        ProviderOperationError | ProviderServiceConfigError
    >;

    readonly transcribe: (
        input: ArrayBuffer,
        options: ProviderTranscribeOptions,
    ) => Effect.Effect<
        EffectiveResponse<TranscribeResult>,
        ProviderOperationError | ProviderServiceConfigError
    >;

    readonly generateEmbeddings: (
        input: string[],
        options: ProviderGenerateEmbeddingsOptions,
    ) => Effect.Effect<
        EffectiveResponse<GenerateEmbeddingsResult>,
        ProviderOperationError | ProviderServiceConfigError
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
        ProviderOperationError | ProviderServiceConfigError
    >;

    readonly getCapabilities: () => Effect.Effect<
        Set<ModelCapability>,
        ProviderOperationError | ProviderServiceConfigError
    >;

    readonly getModels: () => Effect.Effect<LanguageModelV1[], ProviderServiceConfigError, ModelServiceApi>;

    readonly getDefaultModelIdForProvider: (
        providerName: ProvidersType,
        capability: ModelCapability
    ) => Effect.Effect<string, ProviderServiceConfigError | ProviderMissingModelIdError>;
}
