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
  ToolDefinition
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
    validateToolInputs: (tools: ToolDefinition[]) =>
      Effect.succeed(void 0),
    executeToolCalls: (toolCalls: ToolCallRequest[], tools: ToolDefinition[]) =>
      Effect.succeed([]),
    generateText: (input: string, options: ProviderGenerateTextOptions) => {
      const effectiveInput = new EffectiveInput(input, Chunk.empty());
      return providerClient.generateText(effectiveInput, options);
    },
    generateObject: <T>(input: string, options: ProviderGenerateObjectOptions<T>) => {
      const effectiveInput = new EffectiveInput(input, Chunk.empty());
      return providerClient.generateObject<T>(effectiveInput, options);
    },
    generateSpeech: (text: string, options: ProviderGenerateSpeechOptions) => {
      const effectiveInput = new EffectiveInput(text, Chunk.empty());
      return providerClient.generateSpeech(effectiveInput, options);
    },
    transcribe: (audio: Buffer | ArrayBuffer, options: ProviderTranscribeOptions) =>
      providerClient.transcribe(audio, options),
    generateImage: (prompt: string, options: ProviderGenerateImageOptions) => {
      const effectiveInput = new EffectiveInput(prompt, Chunk.empty());
      return providerClient.generateImage(effectiveInput, options);
    },
    generateEmbeddings: (texts: string[], options: ProviderGenerateEmbeddingsOptions) =>
      providerClient.generateEmbeddings(texts, options),
    chat: (messages: Message[], options: ProviderChatOptions) => {
      // Messages are already in the correct format - just use them directly
      const effectiveInput = new EffectiveInput("", Chunk.fromIterable(messages));
      return providerClient.chat(effectiveInput, options);
    },
    getModels: () => providerClient.getModels(),
    streamText: (input: string, options: ProviderGenerateTextOptions) =>
      Effect.fail(new ProviderOperationError({
        providerName: name,
        operation: "streamText",
        message: "Not implemented",
        module: "provider",
        method: "streamText"
      })),
    streamObject: <T>(input: string, options: ProviderGenerateObjectOptions<T>) =>
      Effect.fail(new ProviderOperationError({
        providerName: name,
        operation: "streamObject",
        message: "Not implemented",
        module: "provider",
        method: "streamObject"
      }))
  }
}