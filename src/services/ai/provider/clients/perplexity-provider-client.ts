import { AiSdkMessageTransformError, createProvider, toEffectiveMessage, toVercelMessages } from "@effective-agent/ai-sdk";
import { generateText } from "ai";
import { Chunk, Effect } from "effect";
import type { ModelCapability } from "@/schema.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import type { EffectiveInput, FinishReason } from "@/types.js";
import type { ToolRegistryService } from '../../tool-registry/service.js';
import type { ProviderClientApi } from "../api.js";
import {
  ProviderMissingCapabilityError,
  ProviderMissingModelIdError,
  type ProviderNotFoundError,
  ProviderOperationError,
  ProviderServiceConfigError
} from "../errors.js";
import type { ProvidersType } from "../schema.js";
import type {
  EffectiveProviderApi,
  GenerateTextResult,
  ProviderChatOptions,
  ProviderGenerateEmbeddingsOptions,
  ProviderGenerateImageOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderGenerateTextOptions,
  ProviderTranscribeOptions
} from "../types.js";

// Map AI SDK finish reasons to EffectiveAgent finish reasons
function mapFinishReason(finishReason: string): FinishReason {
  switch (finishReason) {
    case "stop": return "stop";
    case "length": return "length";
    case "content-filter": return "content_filter";
    case "tool-calls": return "tool_calls";
    case "error": return "error";
    case "other": return "stop";
    case "unknown": return "stop";
    default: return "stop";
  }
}

// Helper to convert EA messages to Vercel AI SDK CoreMessage format
// Helper to convert a Vercel AI SDK message to an EA EffectiveMessage
// Note: Message transformation functions are now imported from @effective-agent/ai-sdk:
// - toVercelMessages() replaces mapEAMessagesToVercelMessages()
// - toEffectiveMessage() replaces mapVercelMessageToEAEffectiveMessage()

// Internal factory for ProviderService only
function makePerplexityClient(apiKey: string): Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError, ModelServiceApi | ToolRegistryService> {
  return Effect.gen(function* () {
    // Use ai-sdk's createProvider for provider instance creation
    const perplexityProvider = yield* createProvider("perplexity", {
      apiKey,
    }).pipe(
      Effect.mapError(
        (error) =>
          new ProviderServiceConfigError({
            description: `Failed to create Perplexity provider: ${error.message}`,
            module: "PerplexityClient",
            method: "makePerplexityClient",
          })
      )
    );

    return {
      // Tool-related methods - Perplexity does not support tools
      validateToolInput: (_toolName: string, _input: unknown) =>
        Effect.fail(new ProviderMissingCapabilityError({
          providerName: "perplexity",
          capability: "tool-use",
          module: "perplexity",
          method: "validateToolInput"
        })),

      executeTool: (_toolName: string, _input: unknown) =>
        Effect.fail(new ProviderMissingCapabilityError({
          providerName: "perplexity",
          capability: "tool-use",
          module: "perplexity",
          method: "executeTool"
        })),

      processToolResult: (_toolName: string, _result: unknown) =>
        Effect.fail(new ProviderMissingCapabilityError({
          providerName: "perplexity",
          capability: "tool-use",
          module: "perplexity",
          method: "processToolResult"
        })),

      // Provider and capability methods
      getProvider: () => Effect.succeed({
        name: "perplexity" as const,
        provider: {} as any, // Raw provider not needed for EffectiveProviderApi
        capabilities: new Set<ModelCapability>(["chat", "text-generation"])
      }),

      getCapabilities: () =>
        Effect.succeed(new Set<ModelCapability>(["chat", "text-generation"])),

      // Core generation methods
      generateText: (input: EffectiveInput, options: ProviderGenerateTextOptions) => Effect.gen(function* () {
        try {
          const vercelMessages = yield* toVercelMessages(input.messages || Chunk.empty());
          const modelId = options.modelId || "sonar-pro";

          const result = yield* Effect.tryPromise({
            try: () => generateText({
              model: perplexityProvider(modelId),
              messages: vercelMessages,
              system: options.system,
              maxTokens: options.parameters?.maxTokens,
              temperature: options.parameters?.temperature,
              topP: options.parameters?.topP,
              presencePenalty: options.parameters?.presencePenalty,
              frequencyPenalty: options.parameters?.frequencyPenalty,
              stopSequences: options.parameters?.stop,
              seed: options.parameters?.seed,
              maxRetries: 2,
              abortSignal: options.signal
            }),
            catch: (error) => new ProviderOperationError({
              providerName: "perplexity",
              operation: "generateText",
              message: `Failed to generate text: ${error}`,
              module: "perplexity",
              method: "generateText",
              cause: error
            })
          });

          const responseMessages = result.response?.messages || [];
          const _eaMessages = yield* Effect.forEach(responseMessages, (msg) => toEffectiveMessage(msg, modelId), { concurrency: 1 });

          const textResult: GenerateTextResult = {
            id: `perplexity-${Date.now()}`,
            model: modelId,
            timestamp: new Date(),
            text: result.text,
            finishReason: mapFinishReason(result.finishReason),
            usage: {
              promptTokens: result.usage?.promptTokens || 0,
              completionTokens: result.usage?.completionTokens || 0,
              totalTokens: result.usage?.totalTokens || 0
            },
            toolCalls: []
          };

          return {
            data: textResult,
            metadata: {
              model: modelId,
              provider: "perplexity",
              requestId: `perplexity-${Date.now()}`,
              sources: result.sources || []
            },
            usage: textResult.usage,
            finishReason: textResult.finishReason
          };
        } catch (error) {
          return yield* Effect.fail(new ProviderOperationError({
            providerName: "perplexity",
            operation: "generateText",
            message: `Failed to generate text: ${error}`,
            module: "perplexity",
            method: "generateText",
            cause: error
          }));
        }
      }).pipe(
        Effect.catchAll((error) => {
          // Map ai-sdk errors to EffectiveError types
          if (error instanceof AiSdkMessageTransformError) {
            return Effect.fail(
              new ProviderOperationError({
                operation: "messageTransform",
                message: error.message,
                providerName: "perplexity",
                module: "PerplexityProviderClient",
                method: "generateText",
                cause: error,
              })
            );
          }
          // For other errors, assume they're already EffectiveError types
          return Effect.fail(error);
        })
      ),

      generateObject: <T = unknown>(_input: EffectiveInput, _options: ProviderGenerateObjectOptions<T>) =>
        Effect.fail(new ProviderMissingCapabilityError({
          providerName: "perplexity",
          capability: "function-calling",
          module: "perplexity",
          method: "generateObject"
        })),

      generateImage: (_input: EffectiveInput, _options: ProviderGenerateImageOptions) =>
        Effect.fail(new ProviderMissingCapabilityError({
          providerName: "perplexity",
          capability: "image-generation",
          module: "perplexity",
          method: "generateImage"
        })),

      // Unsupported capabilities
      generateSpeech: (_input: string, _options: ProviderGenerateSpeechOptions) =>
        Effect.fail(new ProviderMissingCapabilityError({
          providerName: "perplexity",
          capability: "audio",
          module: "perplexity",
          method: "generateSpeech"
        })),

      transcribe: (_input: ArrayBuffer, _options: ProviderTranscribeOptions) =>
        Effect.fail(new ProviderMissingCapabilityError({
          providerName: "perplexity",
          capability: "audio",
          module: "perplexity",
          method: "transcribe"
        })),

      generateEmbeddings: (_input: string[], _options: ProviderGenerateEmbeddingsOptions) =>
        Effect.fail(new ProviderMissingCapabilityError({
          providerName: "perplexity",
          capability: "embeddings",
          module: "perplexity",
          method: "generateEmbeddings"
        })),

      // Chat method - delegates to generateText since Perplexity doesn't support tools
      chat: (effectiveInput: EffectiveInput, options: ProviderChatOptions) => Effect.gen(function* () {
        if (options.tools && options.tools.length > 0) {
          return yield* Effect.fail(new ProviderMissingCapabilityError({
            providerName: "perplexity",
            capability: "tool-use",
            module: "perplexity",
            method: "chat"
          }));
        }

        // Delegate to generateText for simple chat without tools
        const vercelMessages = yield* toVercelMessages(effectiveInput.messages || Chunk.empty());
        const modelId = options.modelId || "sonar-pro";

        const result = yield* Effect.tryPromise({
          try: () => generateText({
            model: perplexityProvider(modelId),
            messages: vercelMessages,
            system: options.system,
            maxTokens: options.parameters?.maxTokens,
            temperature: options.parameters?.temperature,
            topP: options.parameters?.topP,
            presencePenalty: options.parameters?.presencePenalty,
            frequencyPenalty: options.parameters?.frequencyPenalty,
            stopSequences: options.parameters?.stop,
            seed: options.parameters?.seed,
            maxRetries: 2,
            abortSignal: options.signal
          }),
          catch: (error) => new ProviderOperationError({
            providerName: "perplexity",
            operation: "chat",
            message: `Failed to generate text: ${error}`,
            module: "perplexity",
            method: "chat",
            cause: error
          })
        });

        const responseMessages = result.response?.messages || [];
        const _eaMessages = yield* Effect.forEach(responseMessages, (msg) => toEffectiveMessage(msg, modelId), { concurrency: 1 });

        const chatResult: GenerateTextResult = {
          id: `perplexity-${Date.now()}`,
          model: modelId,
          timestamp: new Date(),
          text: result.text,
          finishReason: mapFinishReason(result.finishReason),
          usage: {
            promptTokens: result.usage?.promptTokens || 0,
            completionTokens: result.usage?.completionTokens || 0,
            totalTokens: result.usage?.totalTokens || 0
          },
          toolCalls: []
        };

        return {
          data: chatResult,
          metadata: {
            model: modelId,
            provider: "perplexity",
            requestId: `perplexity-${Date.now()}`,
            sources: result.sources || []
          },
          usage: chatResult.usage,
          finishReason: chatResult.finishReason
        };
      }).pipe(
        Effect.catchAll((error) => {
          // Map ai-sdk errors to EffectiveError types
          if (error instanceof AiSdkMessageTransformError) {
            return Effect.fail(
              new ProviderOperationError({
                operation: "messageTransform",
                message: error.message,
                providerName: "perplexity",
                module: "PerplexityProviderClient",
                method: "chat",
                cause: error,
              })
            );
          }
          // For other errors, assume they're already EffectiveError types
          return Effect.fail(error);
        })
      ),

      // Model management
      getModels: () => Effect.succeed([]),

      getDefaultModelIdForProvider: (providerName: ProvidersType, capability: ModelCapability) => {
        if (providerName !== "perplexity") {
          return Effect.fail(new ProviderMissingModelIdError({
            providerName,
            capability,
            module: "perplexity",
            method: "getDefaultModelIdForProvider"
          }));
        }

        switch (capability) {
          case "chat":
          case "text-generation":
            return Effect.succeed("sonar-pro");
          default:
            return Effect.fail(new ProviderMissingModelIdError({
              providerName,
              capability,
              module: "perplexity",
              method: "getDefaultModelIdForProvider"
            }));
        }
      },

      // Vercel provider integration
      setVercelProvider: (_vercelProvider: EffectiveProviderApi) =>
        Effect.succeed(undefined)
    };
  });
}

export { makePerplexityClient };
