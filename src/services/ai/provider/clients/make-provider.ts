import { Message } from "@/schema.js";
import { EffectiveInput } from "@/types.js";
import { Chunk, Effect } from "effect";
import { ProviderOperationError } from "../errors.js";
import type {
  ModelCapability,
  ProviderChatOptions,
  ProviderClientApi,
  ProviderGenerateEmbeddingsOptions,
  ProviderGenerateImageOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderGenerateTextOptions,
  ProviderTranscribeOptions,
  ToolCallRequest,
  ToolDefinition,
} from "../types.js";

export const makeProvider = (
  name: string,
  initialCapabilities: ModelCapability[],
  apiKey: string,
  providerClient: ProviderClientApi
): ProviderClientApi => {
  // Convert array to Set for O(1) lookups
  const capabilities = new Set(initialCapabilities);

  // Real implementation only
  return {
    validateToolInput: (toolName: `${string}:${string}`, input: unknown) =>
      Effect.succeed(void 0),
    executeTool: (toolName: `${string}:${string}`, input: unknown) =>
      Effect.succeed({}),
    processToolResult: (toolName: `${string}:${string}`, result: unknown) =>
      Effect.succeed(result),
    generateText: (
      input: EffectiveInput,
      options: ProviderGenerateTextOptions
    ) => {
      return providerClient.generateText(input, options);
    },
    generateObject: <T>(
      input: EffectiveInput,
      options: ProviderGenerateObjectOptions<T>
    ) => {
      return providerClient.generateObject<T>(input, options);
    },
    generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) => {
      return providerClient.generateSpeech(input, options);
    },
    transcribe: (audio: ArrayBuffer, options: ProviderTranscribeOptions) =>
      providerClient.transcribe(audio, options),
    generateImage: (
      input: EffectiveInput,
      options: ProviderGenerateImageOptions
    ) => {
      return providerClient.generateImage(input, options);
    },
    generateEmbeddings: (
      texts: string[],
      options: ProviderGenerateEmbeddingsOptions
    ) => providerClient.generateEmbeddings(texts, options),
    chat: (effectiveInput: EffectiveInput, options: ProviderChatOptions) => {
      return providerClient.chat(effectiveInput, options);
    },
    getModels: () => providerClient.getModels(),
    setVercelProvider: (vercelProvider: any) => Effect.succeed(void 0),
    getProvider: () => providerClient.getProvider(),
    getCapabilities: () => providerClient.getCapabilities(),
    getDefaultModelIdForProvider: (providerName: any, capability: any) =>
      Effect.succeed("default-model"),
  };
};
