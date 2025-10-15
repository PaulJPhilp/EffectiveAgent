import { AiSdkMessageTransformError, toEffectiveMessage, toVercelMessages } from "@effective-agent/ai-sdk";
import { Chunk, Effect } from "effect";
import type {
  ModelCapability
} from "@/schema.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import type { EffectiveInput, FinishReason } from "@/types.js";
import type { ToolRegistryService } from "../../tool-registry/service.js";
import type { ProviderClientApi } from "../api.js";
import {
  ProviderMissingCapabilityError,
  ProviderMissingModelIdError,
  type ProviderNotFoundError,
  ProviderOperationError,
  type ProviderServiceConfigError,
} from "../errors.js";
import type { ProvidersType } from "../schema.js";
import type {
  EffectiveProviderApi,
  GenerateEmbeddingsResult,
  GenerateObjectResult,
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
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "content-filter":
      return "content_filter";
    case "tool-calls":
      return "tool_calls";
    case "error":
      return "error";
    case "other":
      return "stop";
    case "unknown":
      return "stop";
    default:
      return "stop";
  }
}

// Helper to convert EA messages to Vercel AI SDK CoreMessage format
// Helper to convert a Vercel AI SDK message to an EA EffectiveMessage
// Note: Message transformation functions are now imported from @effective-agent/ai-sdk:
// - toVercelMessages() replaces mapEAMessagesToVercelMessages()
// - toEffectiveMessage() replaces mapVercelMessageToEAEffectiveMessage()

// Internal factory for ProviderService only
function makeQwenClient(
  apiKey: string
): Effect.Effect<
  ProviderClientApi,
  ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError,
  ModelServiceApi | ToolRegistryService
> {
  // Create a simple provider that matches the Qwen API interface
  const qwenProvider = (modelId: string) => ({
    modelId,
    apiKey,
    baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  });

  return Effect.succeed({
    // Tool-related methods - Qwen supports tools
    validateToolInput: (toolName: string, input: unknown) =>
      Effect.tryPromise({
        try: () => Promise.resolve(true), // Basic validation
        catch: (error) =>
          new ProviderOperationError({
            providerName: "qwen",
            operation: "validateToolInput",
            message: `Failed to validate tool input: ${error}`,
            module: "qwen",
            method: "validateToolInput",
            cause: error,
          }),
      }),

    executeTool: (toolName: string, input: unknown) =>
      Effect.tryPromise({
        try: () =>
          Promise.resolve({ result: "Tool execution not implemented" }),
        catch: (error) =>
          new ProviderOperationError({
            providerName: "qwen",
            operation: "executeTool",
            message: `Failed to execute tool: ${error}`,
            module: "qwen",
            method: "executeTool",
            cause: error,
          }),
      }),

    processToolResult: (toolName: string, result: unknown) =>
      Effect.succeed(result),

    // Provider and capability methods
    getProvider: () =>
      Effect.succeed({
        name: "qwen" as const,
        provider: {} as any, // Raw provider not needed for EffectiveProviderApi
        capabilities: new Set<ModelCapability>([
          "chat",
          "text-generation",
          "function-calling",
          "vision",
        ]),
      }),

    getCapabilities: () =>
      Effect.succeed(
        new Set<ModelCapability>([
          "chat",
          "text-generation",
          "function-calling",
          "vision",
        ])
      ),

    // Core generation methods
    generateText: (
      input: EffectiveInput,
      options: ProviderGenerateTextOptions
    ) =>
      Effect.gen(function* () {
        try {
          const vercelMessages = yield* toVercelMessages(
            input.messages || Chunk.empty()
          );
          const modelId = options.modelId || "qwen-plus";

          // Mock implementation for testing - replace with real Vercel AI SDK call when qwen-ai-provider is available
          const result = yield* Effect.tryPromise({
            try: () =>
              Promise.resolve({
                text: "Mock response from Qwen model",
                finishReason: "stop",
                usage: {
                  promptTokens: 10,
                  completionTokens: 20,
                  totalTokens: 30,
                },
                response: {
                  messages: [],
                },
              }),
            catch: (error) =>
              new ProviderOperationError({
                providerName: "qwen",
                operation: "generateText",
                message: `Failed to generate text: ${error}`,
                module: "qwen",
                method: "generateText",
                cause: error,
              }),
          });

          const responseMessages = result.response?.messages || [];
          const eaMessages = yield* Effect.forEach(responseMessages, (msg) => toEffectiveMessage(msg, modelId), { concurrency: 1 });

          const textResult: GenerateTextResult = {
            id: `qwen-${Date.now()}`,
            model: modelId,
            timestamp: new Date(),
            text: result.text,
            finishReason: mapFinishReason(result.finishReason),
            usage: {
              promptTokens: result.usage?.promptTokens || 0,
              completionTokens: result.usage?.completionTokens || 0,
              totalTokens: result.usage?.totalTokens || 0,
            },
            messages: [
              {
                role: "assistant",
                content: result.text,
              },
            ],
            toolCalls: [],
          };

          return {
            data: textResult,
            metadata: {
              model: modelId,
              provider: "qwen",
              requestId: `qwen-${Date.now()}`,
            },
            usage: textResult.usage,
            finishReason: textResult.finishReason,
          };
        } catch (error) {
          return yield* Effect.fail(
            new ProviderOperationError({
              providerName: "qwen",
              operation: "generateText",
              message: `Failed to generate text: ${error}`,
              module: "qwen",
              method: "generateText",
              cause: error,
            })
          );
        }
      }).pipe(
        Effect.catchAll((error) => {
          // Map ai-sdk errors to EffectiveError types
          if (error instanceof AiSdkMessageTransformError) {
            return Effect.fail(
              new ProviderOperationError({
                operation: "messageTransform",
                message: error.message,
                providerName: "qwen",
                module: "QwenProviderClient",
                method: "generateText",
                cause: error,
              })
            );
          }
          // For other errors, assume they're already EffectiveError types
          return Effect.fail(error);
        })
      ),

    generateObject: <T = unknown>(
      input: EffectiveInput,
      options: ProviderGenerateObjectOptions<T>
    ) =>
      Effect.gen(function* () {
        try {
          const vercelMessages = yield* toVercelMessages(
            input.messages || Chunk.empty()
          );
          const modelId = options.modelId || "qwen-plus";

          // Mock implementation for testing - replace with real Vercel AI SDK call when qwen-ai-provider is available
          const result = yield* Effect.tryPromise({
            try: () =>
              Promise.resolve({
                object: { mockProperty: "Mock object from Qwen" },
                finishReason: "stop",
                usage: {
                  promptTokens: 10,
                  completionTokens: 20,
                  totalTokens: 30,
                },
              }),
            catch: (error) =>
              new ProviderOperationError({
                providerName: "qwen",
                operation: "generateObject",
                message: `Failed to generate object: ${error}`,
                module: "qwen",
                method: "generateObject",
                cause: error,
              }),
          });

          const objectResult: GenerateObjectResult<T> = {
            id: `qwen-${Date.now()}`,
            model: modelId,
            timestamp: new Date(),
            object: result.object as T,
            finishReason: mapFinishReason(result.finishReason),
            usage: {
              promptTokens: result.usage?.promptTokens || 0,
              completionTokens: result.usage?.completionTokens || 0,
              totalTokens: result.usage?.totalTokens || 0,
            },
          };

          return {
            data: objectResult,
            metadata: {
              model: modelId,
              provider: "qwen",
              requestId: `qwen-${Date.now()}`,
            },
            usage: objectResult.usage,
            finishReason: objectResult.finishReason,
          };
        } catch (error) {
          return yield* Effect.fail(
            new ProviderOperationError({
              providerName: "qwen",
              operation: "generateObject",
              message: `Failed to generate object: ${error}`,
              module: "qwen",
              method: "generateObject",
              cause: error,
            })
          );
        }
      }).pipe(
        Effect.catchAll((error) => {
          // Map ai-sdk errors to EffectiveError types
          if (error instanceof AiSdkMessageTransformError) {
            return Effect.fail(
              new ProviderOperationError({
                operation: "messageTransform",
                message: error.message,
                providerName: "qwen",
                module: "QwenProviderClient",
                method: "generateObject",
                cause: error,
              })
            );
          }
          // For other errors, assume they're already EffectiveError types
          return Effect.fail(error);
        })
      ),

    // Unsupported capabilities
    generateImage: (
      input: EffectiveInput,
      options: ProviderGenerateImageOptions
    ) =>
      Effect.fail(
        new ProviderMissingCapabilityError({
          providerName: "qwen",
          capability: "image-generation",
          module: "qwen",
          method: "generateImage",
        })
      ),

    generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) =>
      Effect.fail(
        new ProviderMissingCapabilityError({
          providerName: "qwen",
          capability: "audio",
          module: "qwen",
          method: "generateSpeech",
        })
      ),

    transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) =>
      Effect.fail(
        new ProviderMissingCapabilityError({
          providerName: "qwen",
          capability: "audio",
          module: "qwen",
          method: "transcribe",
        })
      ),

    generateEmbeddings: (
      input: string[],
      options: ProviderGenerateEmbeddingsOptions
    ) =>
      Effect.gen(function* () {
        try {
          const modelId = options.modelId || "text-embedding-v3";

          // Mock implementation for testing - replace with real Vercel AI SDK call when qwen-ai-provider is available
          const result = yield* Effect.tryPromise({
            try: () =>
              Promise.resolve({
                embeddings: input.map(() => new Array(1024).fill(0)),
                usage: {
                  promptTokens: 10,
                  completionTokens: 0,
                  totalTokens: 10,
                },
              }),
            catch: (error) =>
              new ProviderOperationError({
                providerName: "qwen",
                operation: "generateEmbeddings",
                message: `Failed to generate embeddings: ${error}`,
                module: "qwen",
                method: "generateEmbeddings",
                cause: error,
              }),
          });

          const embeddingsResult: GenerateEmbeddingsResult = {
            id: `qwen-${Date.now()}`,
            model: modelId,
            timestamp: new Date(),
            embeddings: result.embeddings,
            dimensions: 1024,
            texts: input,
            parameters: {
              modelParameters: { modelId, dimensions: 1024 },
              normalization: "l2",
              preprocessing: [],
            },
            finishReason: "stop",
            usage: {
              promptTokens: result.usage?.promptTokens || 0,
              completionTokens: result.usage?.completionTokens || 0,
              totalTokens: result.usage?.totalTokens || 0,
            },
          };

          return {
            data: embeddingsResult,
            metadata: {
              model: modelId,
              provider: "qwen",
              requestId: `qwen-${Date.now()}`,
            },
            usage: embeddingsResult.usage,
            finishReason: embeddingsResult.finishReason,
          };
        } catch (error) {
          return yield* Effect.fail(
            new ProviderOperationError({
              providerName: "qwen",
              operation: "generateEmbeddings",
              message: `Failed to generate embeddings: ${error}`,
              module: "qwen",
              method: "generateEmbeddings",
              cause: error,
            })
          );
        }
      }),

    // Chat method - delegates to generateText since Qwen doesn't support tools
    chat: (effectiveInput: EffectiveInput, options: ProviderChatOptions) =>
      Effect.gen(function* () {
        if (options.tools && options.tools.length > 0) {
          return yield* Effect.fail(
            new ProviderMissingCapabilityError({
              providerName: "qwen",
              capability: "tool-use",
              module: "qwen",
              method: "chat",
            })
          );
        }

        // Delegate to generateText for simple chat without tools
        const vercelMessages = yield* toVercelMessages(
          effectiveInput.messages || Chunk.empty()
        );
        const modelId = options.modelId || "qwen-plus";

        const result = yield* Effect.tryPromise({
          try: () =>
            Promise.resolve({
              text: "Mock response from Qwen model",
              finishReason: "stop",
              usage: {
                promptTokens: 10,
                completionTokens: 20,
                totalTokens: 30,
              },
              response: {
                messages: [],
              },
            }),
          catch: (error) =>
            new ProviderOperationError({
              providerName: "qwen",
              operation: "chat",
              message: `Failed to generate text: ${error}`,
              module: "qwen",
              method: "chat",
              cause: error,
            }),
        });

        const responseMessages = result.response?.messages || [];
        const eaMessages = yield* Effect.forEach(responseMessages, (msg) => toEffectiveMessage(msg, modelId), { concurrency: 1 });

        const chatResult: GenerateTextResult = {
          id: `qwen-${Date.now()}`,
          model: modelId,
          timestamp: new Date(),
          text: result.text,
          finishReason: mapFinishReason(result.finishReason),
          usage: {
            promptTokens: result.usage?.promptTokens || 0,
            completionTokens: result.usage?.completionTokens || 0,
            totalTokens: result.usage?.totalTokens || 0,
          },
          messages: [
            {
              role: "assistant",
              content: result.text,
            },
          ],
          toolCalls: [],
        };

        return {
          data: chatResult,
          metadata: {
            model: modelId,
            provider: "qwen",
            requestId: `qwen-${Date.now()}`,
          },
          usage: chatResult.usage,
          finishReason: chatResult.finishReason,
        };
      }).pipe(
        Effect.catchAll((error) => {
          // Map ai-sdk errors to EffectiveError types
          if (error instanceof AiSdkMessageTransformError) {
            return Effect.fail(
              new ProviderOperationError({
                operation: "messageTransform",
                message: error.message,
                providerName: "qwen",
                module: "QwenProviderClient",
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

    getDefaultModelIdForProvider: (
      providerName: ProvidersType,
      capability: ModelCapability
    ) => {
      if (providerName !== "qwen") {
        return Effect.fail(
          new ProviderMissingModelIdError({
            providerName,
            capability,
            module: "qwen",
            method: "getDefaultModelIdForProvider",
          })
        );
      }

      switch (capability) {
        case "chat":
        case "text-generation":
        case "function-calling":
          return Effect.succeed("qwen-plus");
        case "vision":
          return Effect.succeed("qwen-vl-plus");
        default:
          return Effect.fail(
            new ProviderMissingModelIdError({
              providerName,
              capability,
              module: "qwen",
              method: "getDefaultModelIdForProvider",
            })
          );
      }
    },

    // Vercel provider integration
    setVercelProvider: (vercelProvider: EffectiveProviderApi) =>
      Effect.succeed(undefined),
  });
}

export { makeQwenClient };
