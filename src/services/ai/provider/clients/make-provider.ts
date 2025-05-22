import { Message } from "@/schema.js";
import { Effect } from "effect";
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
    generateText: (input: string, options: ProviderGenerateTextOptions) =>
      providerClient.generateText(input, options),
    generateObject: <T>(input: string, options: ProviderGenerateObjectOptions<T>) =>
      providerClient.generateObject<T>(input, options),
    generateSpeech: (text: string, options: ProviderGenerateSpeechOptions) =>
      providerClient.generateSpeech(text, options),
    transcribe: (audio: Buffer | ArrayBuffer, options: ProviderTranscribeOptions) =>
      providerClient.transcribe(audio, options),
    generateImage: (prompt: string, options: ProviderGenerateImageOptions) =>
      providerClient.generateImage(prompt, options),
    generateEmbeddings: (texts: string[], options: ProviderGenerateEmbeddingsOptions) =>
      providerClient.generateEmbeddings(texts, options),
    chat: (messages: Message[], options: ProviderChatOptions) =>
      providerClient.chat(messages, options),
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