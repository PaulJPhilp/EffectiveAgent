/**
 * Returns a ProviderClientApi instance pre-configured for OpenAI.
 * @param baseClient - The base ProviderClientApi implementation
 * @returns ProviderClientApi configured for OpenAI
 */
import { ModelCapability } from "@/schema.js";
import { Effect, Layer } from "effect";
import { ProviderClient } from "../client.js";
import { ProviderConfigError, ProviderMissingCapabilityError, ProviderOperationError } from "../errors.js";
import type {
  EffectiveProviderApi,
  EffectiveResponse,
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
} from "../types.js";

/**
 * Returns a ProviderClientApi instance pre-configured for OpenAI.
 */
export const makeOpenAIProviderClient = Effect.gen(function* () {
  const provider = yield* ProviderClient;
  return {
    setVercelProvider: (vercelProvider: EffectiveProviderApi): Effect.Effect<void, ProviderConfigError> => {
      if (!vercelProvider || !vercelProvider.capabilities) {
        return Effect.fail(new ProviderConfigError({ description: "Invalid provider config", module: "openai-provider-client", method: "setVercelProvider" }));
      }
      return provider.setVercelProvider({
        name: "openai",
        provider,
        capabilities: vercelProvider.capabilities
      });
    },
    getProvider: (): Effect.Effect<EffectiveProviderApi, ProviderConfigError> =>
      provider.getProvider(),
    generateText: (
      input: EffectiveInput,
      options: ProviderGenerateTextOptions
    ): Effect.Effect<
      EffectiveResponse<GenerateTextResult>,
      ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError
    > => provider.generateText(input, options),
    generateObject: <T>(
      input: EffectiveInput,
      options: ProviderGenerateObjectOptions<T>
    ): Effect.Effect<
      EffectiveResponse<GenerateObjectResult<T>>,
      ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError
    > => provider.generateObject(input, options),
    generateSpeech: (
      input: string,
      options: ProviderGenerateSpeechOptions
    ): Effect.Effect<
      EffectiveResponse<GenerateSpeechResult>,
      ProviderConfigError | ProviderOperationError
    > => provider.generateSpeech(input, options),
    transcribe: (
      input: ArrayBuffer,
      options: ProviderTranscribeOptions
    ): Effect.Effect<
      EffectiveResponse<TranscribeResult>,
      ProviderConfigError | ProviderOperationError
    > => provider.transcribe(input, options),
    generateEmbeddings: (
      input: string[],
      options: ProviderGenerateEmbeddingsOptions
    ): Effect.Effect<
      EffectiveResponse<GenerateEmbeddingsResult>,
      ProviderOperationError | ProviderConfigError
    > => provider.generateEmbeddings(input, options),
    getCapabilities: (): Effect.Effect<
      Set<ModelCapability>,
      ProviderOperationError | ProviderConfigError
    > => provider.getCapabilities(),
    getModels: (): Effect.Effect<
      LanguageModelV1[],
      ProviderConfigError,
      ModelServiceApi
    > => provider.getModels(),
    chat: (
      input: EffectiveInput,
      options: ProviderChatOptions
    ): Effect.Effect<
      EffectiveResponse<GenerateTextResult>,
      ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError
    > => provider.chat(input, options),
    generateImage: (
      input: EffectiveInput,
      options: ProviderGenerateImageOptions
    ): Effect.Effect<
      EffectiveResponse<GenerateImageResult>,
      ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError
    > => provider.generateImage(input, options),
    validateToolInput: (
      toolName: string,
      input: unknown
    ): Effect.Effect<unknown, ProviderToolError> =>
      provider.validateToolInput(toolName, input),
    executeTool: (
      toolName: string,
      input: unknown
    ): Effect.Effect<unknown, ProviderToolError> =>
      provider.executeTool(toolName, input),
    processToolResult: (
      toolName: string,
      result: unknown
    ): Effect.Effect<unknown, ProviderToolError> =>
      provider.processToolResult(toolName, result)
  };
});

export const OpenAIProviderClientLayer = Layer.effect(
  ProviderClient,
  Effect.gen(function* () {
    const provider = yield* ProviderClient;
    return {
      setVercelProvider: (
        vercelProvider: EffectiveProviderApi
      ): Effect.Effect<void, ProviderConfigError> =>
        provider.setVercelProvider({
          name: "openai",
          provider,
          capabilities: vercelProvider.capabilities
        }),
      getProvider: (): Effect.Effect<EffectiveProviderApi, ProviderConfigError> =>
        provider.getProvider(),
      generateText: (
        input: EffectiveInput,
        options: ProviderGenerateTextOptions
      ): Effect.Effect<
        EffectiveResponse<GenerateTextResult>,
        ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError
      > => provider.generateText(input, options),
      generateObject: <T>(
        input: EffectiveInput,
        options: ProviderGenerateObjectOptions<T>
      ): Effect.Effect<
        EffectiveResponse<GenerateObjectResult<T>>,
        ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError
      > => provider.generateObject(input, options),
      generateSpeech: (
        input: string,
        options: ProviderGenerateSpeechOptions
      ): Effect.Effect<
        EffectiveResponse<GenerateSpeechResult>,
        ProviderConfigError | ProviderOperationError
      > => provider.generateSpeech(input, options),
      transcribe: (
        input: ArrayBuffer,
        options: ProviderTranscribeOptions
      ): Effect.Effect<
        EffectiveResponse<TranscribeResult>,
        ProviderConfigError | ProviderOperationError
      > => provider.transcribe(input, options),
      generateEmbeddings: (
        input: string[],
        options: ProviderGenerateEmbeddingsOptions
      ): Effect.Effect<
        EffectiveResponse<GenerateEmbeddingsResult>,
        ProviderOperationError | ProviderConfigError
      > => provider.generateEmbeddings(input, options),
      getCapabilities: (): Effect.Effect<
        Set<ModelCapability>,
        ProviderOperationError | ProviderConfigError
      > => provider.getCapabilities(),
      getModels: (): Effect.Effect<
        LanguageModelV1[],
        ProviderConfigError,
        ModelServiceApi
      > => provider.getModels(),
      chat: (
        input: EffectiveInput,
        options: ProviderChatOptions
      ): Effect.Effect<
        EffectiveResponse<GenerateTextResult>,
        ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError
      > => provider.chat(input, options),
      generateImage: (
        input: EffectiveInput,
        options: ProviderGenerateImageOptions
      ): Effect.Effect<
        EffectiveResponse<GenerateImageResult>,
        ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError
      > => provider.generateImage(input, options),
      validateToolInput: (
        toolName: string,
        input: unknown
      ): Effect.Effect<unknown, ProviderToolError> =>
        provider.validateToolInput(toolName, input),
      executeTool: (
        toolName: string,
        input: unknown
      ): Effect.Effect<unknown, ProviderToolError> =>
        provider.executeTool(toolName, input),
      processToolResult: (
        toolName: string,
        result: unknown
      ): Effect.Effect<unknown, ProviderToolError> =>
        provider.processToolResult(toolName, result)
    };
  })
);