import { Effect } from "effect";
import type { EffectiveInput } from "@/types.js";
import type {
  ModelCapability,
  ProviderChatOptions,
  ProviderClientApi,
  ProviderGenerateEmbeddingsOptions,
  ProviderGenerateImageOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderGenerateTextOptions,
  ProviderTranscribeOptions
} from "../types.js";

export const makeProvider = (
  _name: string,
  initialCapabilities: ModelCapability[],
  _apiKey: string,
  providerClient: ProviderClientApi
): ProviderClientApi => {
  // Convert array to Set for O(1) lookups
  const _capabilities = new Set(initialCapabilities);

  // Real implementation only
  return {
    validateToolInput: (_toolName: `${string}:${string}`, _input: unknown) =>
      Effect.succeed(void 0),
    executeTool: (_toolName: `${string}:${string}`, _input: unknown) =>
      Effect.succeed({}),
    processToolResult: (_toolName: `${string}:${string}`, result: unknown) =>
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
    setVercelProvider: (_vercelProvider: any) => Effect.succeed(void 0),
    getProvider: () => providerClient.getProvider(),
    getCapabilities: () => providerClient.getCapabilities(),
    getDefaultModelIdForProvider: (_providerName: any, _capability: any) =>
      Effect.succeed("default-model"),
  };
};
