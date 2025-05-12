import type { Message } from "@/types.js";
import { Effect } from "effect";
import { ProviderClient } from "../client.js";
import type {
  ProviderClientApi,
  ProviderGenerateTextOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderTranscribeOptions,
  ProviderGenerateEmbeddingsOptions,
  ProviderChatOptions,
  ProviderGenerateImageOptions,
  ToolDefinition,
  ToolCallRequest,
  ModelCapability,
  GenerateTextResult,
  GenerateObjectResult,
  GenerateSpeechResult,
  GenerateImageResult,
  GenerateEmbeddingsResult,
  TranscribeResult,
} from "../types.js";
import { ProviderOperationError, ProviderToolError } from "../errors.js";

export const makeProvider = (name: string, initialCapabilities: ModelCapability[]) => {
  // Convert array to Set for O(1) lookups
  const capabilities = new Set(initialCapabilities);

  return Effect.gen(function* (_) {
    const provider = yield* ProviderClient;

    return {
      getProvider: () => provider,

      validateToolInput: (toolName: string, input: unknown): Effect.Effect<unknown, ProviderToolError> =>
        Effect.succeed(input),

      validateToolInputs: (tools: ToolDefinition[]): Effect.Effect<void, ProviderToolError> =>
        Effect.succeed(void 0),

      executeTool: (toolName: string, input: unknown): Effect.Effect<unknown, ProviderToolError> =>
        Effect.succeed(input),

      executeToolCalls: (toolCalls: ToolCallRequest[], tools: ToolDefinition[]): Effect.Effect<string[], ProviderOperationError> =>
        Effect.succeed([]),

      generateText: (input: string, options: ProviderGenerateTextOptions): Effect.Effect<GenerateTextResult, ProviderOperationError> =>
        Effect.fail(new ProviderOperationError({
          providerName: name,
          operation: "generateText",
          message: "Not implemented",
          module: "provider",
          method: "generateText"
        })),

      generateObject: <T>(input: string, options: ProviderGenerateObjectOptions<T>): Effect.Effect<GenerateObjectResult<T>, ProviderOperationError> =>
        Effect.fail(new ProviderOperationError({
          providerName: name,
          operation: "generateObject",
          message: "Not implemented",
          module: "provider",
          method: "generateObject"
        })),

      generateSpeech: (text: string, options: ProviderGenerateSpeechOptions): Effect.Effect<GenerateSpeechResult, ProviderOperationError> =>
        Effect.fail(new ProviderOperationError({
          providerName: name,
          operation: "generateSpeech",
          message: "Not implemented",
          module: "provider",
          method: "generateSpeech"
        })),

      transcribe: (audio: Buffer, options: ProviderTranscribeOptions): Effect.Effect<TranscribeResult, ProviderOperationError> =>
        Effect.fail(new ProviderOperationError({
          providerName: name,
          operation: "transcribe",
          message: "Not implemented",
          module: "provider",
          method: "transcribe"
        })),

      generateEmbeddings: (texts: string[], options: ProviderGenerateEmbeddingsOptions): Effect.Effect<GenerateEmbeddingsResult, ProviderOperationError> =>
        Effect.fail(new ProviderOperationError({
          providerName: name,
          operation: "generateEmbeddings",
          message: "Not implemented",
          module: "provider",
          method: "generateEmbeddings"
        })),

      chat: (messages: Message[], options: ProviderChatOptions): Effect.Effect<GenerateTextResult, ProviderOperationError> =>
        Effect.fail(new ProviderOperationError({
          providerName: name,
          operation: "chat",
          message: "Not implemented",
          module: "provider",
          method: "chat"
        })),

      generateImage: (prompt: string, options: ProviderGenerateImageOptions): Effect.Effect<GenerateImageResult, ProviderOperationError> =>
        Effect.fail(new ProviderOperationError({
          providerName: name,
          operation: "generateImage",
          message: "Not implemented",
          module: "provider",
          method: "generateImage"
        })),

      getCapabilities: () => capabilities,
      getModels: () => Effect.succeed([]),
      hasCapability: (capability: ModelCapability) => capabilities.has(capability),
      hasCapabilities: (requiredCapabilities: ModelCapability[]) =>
        requiredCapabilities.every((capability) => capabilities.has(capability))
    } satisfies ProviderClientApi;
  });

