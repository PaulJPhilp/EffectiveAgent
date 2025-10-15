import { createOpenAI } from "@ai-sdk/openai";
import {
  AiSdkMessageTransformError,
  type TextPart,
  toEffectiveMessage, toVercelMessages
} from "@effective-agent/ai-sdk";
import { generateText } from "ai";
import { Chunk, Effect } from "effect";
import type { ModelCapability } from "@/schema.js";
import type { OrchestratorParameters } from "@/services/execution/orchestrator/api.js";
import { OrchestratorService } from "@/services/execution/orchestrator/service.js";
import type {
  EffectiveInput,
  FinishReason
} from "@/types.js";
import type { ModelServiceApi } from "../../model/api.js";
import type { ToolRegistryService } from "../../tool-registry/service.js";
import type { ProviderClientApi } from "../api.js";
import {
  type ProviderNotFoundError,
  ProviderOperationError,
  type ProviderServiceConfigError,
  ProviderToolError,
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
function makeXaiClient(
  apiKey: string
): Effect.Effect<
  ProviderClientApi,
  ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError,
  ModelServiceApi | ToolRegistryService | OrchestratorService
> {
  const xaiProvider = createOpenAI({ apiKey });

  return Effect.gen(function* () {
    const orchestrator = yield* OrchestratorService;

    // Orchestration configurations for XAI operations
    const XAI_GENERATE_TEXT_CONFIG: OrchestratorParameters = {
      operationName: "xai-generateText",
      timeoutMs: 30000,
      maxRetries: 3,
      resilience: {
        circuitBreakerEnabled: true,
        failureThreshold: 5,
        resetTimeoutMs: 60000,
        retryBackoffMultiplier: 2,
        retryJitter: true,
      },
    };

    const XAI_CHAT_CONFIG: OrchestratorParameters = {
      operationName: "xai-chat",
      timeoutMs: 45000,
      maxRetries: 3,
      resilience: {
        circuitBreakerEnabled: true,
        failureThreshold: 5,
        resetTimeoutMs: 60000,
        retryBackoffMultiplier: 2,
        retryJitter: true,
      },
    };

    return {
      // Tool-related methods - xAI Grok does not support tools
      validateToolInput: (toolName: string, input: unknown) =>
        Effect.fail(
          new ProviderToolError({
            description: `Tool validation not supported by xAI provider: ${toolName}`,
            provider: "xai",
            module: "xai",
            method: "validateToolInput",
          })
        ),

      executeTool: (toolName: string, input: unknown) =>
        Effect.fail(
          new ProviderToolError({
            description: `Tool execution not supported by xAI provider: ${toolName}`,
            provider: "xai",
            module: "xai",
            method: "executeTool",
          })
        ),

      processToolResult: (toolName: string, result: unknown) =>
        Effect.fail(
          new ProviderToolError({
            description: `Tool result processing not supported by xAI provider: ${toolName}`,
            provider: "xai",
            module: "xai",
            method: "processToolResult",
          })
        ),

      // Provider and capability methods
      getProvider: () =>
        Effect.succeed({
          name: "xai" as const,
          provider: {} as any, // Raw provider not needed for EffectiveProviderApi
          capabilities: new Set<ModelCapability>([
            "chat",
            "text-generation",
            "image-generation",
          ]),
        }),

      getCapabilities: () =>
        Effect.succeed(
          new Set<ModelCapability>([
            "chat",
            "text-generation",
            "image-generation",
          ])
        ),

      // Core generation methods
      generateText: (
        input: EffectiveInput,
        options: ProviderGenerateTextOptions
      ) =>
        orchestrator.execute(
          Effect.gen(function* () {
            try {
              const vercelMessages = yield* toVercelMessages(
                input.messages || Chunk.empty()
              );
              const modelId = options.modelId || "grok-3";

              const result = yield* Effect.tryPromise({
                try: () =>
                  generateText({
                    model: xaiProvider(modelId),
                    messages: vercelMessages,
                    system: options.system,
                    maxTokens: options.parameters?.maxTokens,
                    temperature: options.parameters?.temperature,
                    topP: options.parameters?.topP,
                    topK: options.parameters?.topK,
                    presencePenalty: options.parameters?.presencePenalty,
                    frequencyPenalty: options.parameters?.frequencyPenalty,
                    stopSequences: options.parameters?.stop,
                    seed: options.parameters?.seed,
                    maxRetries: 2,
                    abortSignal: options.signal,
                  }),
                catch: (error) =>
                  new ProviderOperationError({
                    providerName: "xai",
                    operation: "generateText",
                    message: `Failed to generate text: ${error}`,
                    module: "xai",
                    method: "generateText",
                    cause: error,
                  }),
              });

              const responseMessages = result.response?.messages || [];
              const eaMessages = yield* Effect.forEach(responseMessages, (msg) => toEffectiveMessage(msg, modelId), { concurrency: 1 });

              const textResult: GenerateTextResult = {
                id: `xai-${Date.now()}`,
                model: modelId,
                timestamp: new Date(),
                text: result.text,
                finishReason: mapFinishReason(result.finishReason),
                usage: {
                  promptTokens: result.usage?.promptTokens || 0,
                  completionTokens: result.usage?.completionTokens || 0,
                  totalTokens: result.usage?.totalTokens || 0,
                },
                toolCalls: [],
                reasoning: result.reasoning,
              };

              return {
                data: textResult,
                metadata: {
                  model: modelId,
                  provider: "xai",
                  requestId: `xai-${Date.now()}`,
                },
                usage: textResult.usage,
                finishReason: textResult.finishReason,
              };
            } catch (error) {
              return yield* Effect.fail(
                new ProviderOperationError({
                  providerName: "xai",
                  operation: "generateText",
                  message: `Failed to generate text: ${error}`,
                  module: "xai",
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
                    providerName: "xai",
                    module: "XaiProviderClient",
                    method: "generateText",
                    cause: error,
                  })
                );
              }
              // For other errors, assume they're already EffectiveError types
              return Effect.fail(error);
            })
          ),
          XAI_GENERATE_TEXT_CONFIG
        ),

      generateObject: <T = unknown>(
        input: EffectiveInput,
        options: ProviderGenerateObjectOptions<T>
      ) =>
        Effect.fail(
          new ProviderToolError({
            description: "Object generation not supported by xAI provider",
            provider: "xai",
            module: "xai",
            method: "generateObject",
          })
        ),

      generateImage: (
        input: EffectiveInput,
        options: ProviderGenerateImageOptions
      ) =>
        Effect.gen(function* () {
          try {
            const modelId = options.modelId || "grok-2-image";

            // Extract prompt from input messages
            const messages = Chunk.toReadonlyArray(
              input.messages || Chunk.empty()
            );
            const prompt = messages
              .flatMap((msg) => Chunk.toReadonlyArray(msg.parts))
              .filter((part) => part._tag === "Text")
              .map((part) => (part as TextPart).content)
              .join(" ");

            if (!prompt) {
              return yield* Effect.fail(
                new ProviderOperationError({
                  providerName: "xai",
                  operation: "generateImage",
                  message: "No prompt found in input messages",
                  module: "xai",
                  method: "generateImage",
                })
              );
            }

            // XAI doesn't support image generation, return error
            return yield* Effect.fail(
              new ProviderOperationError({
                providerName: "xai",
                operation: "generateImage",
                message: "XAI does not support image generation",
                module: "xai",
                method: "generateImage",
              })
            );
          } catch (error) {
            return yield* Effect.fail(
              new ProviderOperationError({
                providerName: "xai",
                operation: "generateImage",
                message: `Failed to generate image: ${error}`,
                module: "xai",
                method: "generateImage",
              })
            );
          }
        }),

      // Unsupported capabilities
      generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) =>
        Effect.fail(
          new ProviderToolError({
            description: "Speech generation not supported by xAI provider",
            provider: "xai",
            module: "xai",
            method: "generateSpeech",
          })
        ),

      transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) =>
        Effect.fail(
          new ProviderToolError({
            description: "Transcription not supported by xAI provider",
            provider: "xai",
            module: "xai",
            method: "transcribe",
          })
        ),

      generateEmbeddings: (
        input: string[],
        options: ProviderGenerateEmbeddingsOptions
      ) =>
        Effect.fail(
          new ProviderToolError({
            description: "Embeddings generation not supported by xAI provider",
            provider: "xai",
            module: "xai",
            method: "generateEmbeddings",
          })
        ),

      // Chat method - delegates to generateText since xAI doesn't support tools
      chat: (effectiveInput: EffectiveInput, options: ProviderChatOptions) =>
        orchestrator.execute(
          Effect.gen(function* () {
            if (options.tools && options.tools.length > 0) {
              return yield* Effect.fail(
                new ProviderToolError({
                  description:
                    "Tool usage not supported by xAI provider in chat",
                  provider: "xai",
                  module: "xai",
                  method: "chat",
                })
              );
            }

            // Delegate to generateText for simple chat without tools
            const vercelMessages = yield* toVercelMessages(
              effectiveInput.messages || Chunk.empty()
            );
            const modelId = options.modelId || "grok-3";

            const result = yield* Effect.tryPromise({
              try: () =>
                generateText({
                  model: xaiProvider(modelId),
                  messages: vercelMessages,
                  system: options.system,
                  maxTokens: options.parameters?.maxTokens,
                  temperature: options.parameters?.temperature,
                  topP: options.parameters?.topP,
                  topK: options.parameters?.topK,
                  presencePenalty: options.parameters?.presencePenalty,
                  frequencyPenalty: options.parameters?.frequencyPenalty,
                  stopSequences: options.parameters?.stop,
                  seed: options.parameters?.seed,
                  maxRetries: 2,
                  abortSignal: options.signal,
                }),
              catch: (error) =>
                new ProviderOperationError({
                  providerName: "xai",
                  operation: "chat",
                  message: `Failed to generate text: ${error}`,
                  module: "xai",
                  method: "chat",
                  cause: error,
                }),
            });

            const responseMessages = result.response?.messages || [];
            const eaMessages = yield* Effect.forEach(responseMessages, (msg) => toEffectiveMessage(msg, modelId), { concurrency: 1 });

            const chatResult: GenerateTextResult = {
              id: `xai-${Date.now()}`,
              model: modelId,
              timestamp: new Date(),
              text: result.text,
              finishReason: mapFinishReason(result.finishReason),
              usage: {
                promptTokens: result.usage?.promptTokens || 0,
                completionTokens: result.usage?.completionTokens || 0,
                totalTokens: result.usage?.totalTokens || 0,
              },
              toolCalls: [],
              reasoning: result.reasoning,
            };

            return {
              data: chatResult,
              metadata: {
                model: modelId,
                provider: "xai",
                requestId: `xai-${Date.now()}`,
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
                    providerName: "xai",
                    module: "XaiProviderClient",
                    method: "chat",
                    cause: error,
                  })
                );
              }
              // For other errors, assume they're already EffectiveError types
              return Effect.fail(error);
            })
          ),
          XAI_CHAT_CONFIG
        ),

      // Model management
      getModels: () => Effect.succeed([]),

      getDefaultModelIdForProvider: (
        providerName: ProvidersType,
        capability: ModelCapability
      ) => {
        if (providerName !== "xai") {
          return Effect.fail(
            new ProviderToolError({
              description: `Invalid provider for xAI client: ${providerName}`,
              provider: providerName,
              module: "xai",
              method: "getDefaultModelIdForProvider",
            })
          );
        }

        switch (capability) {
          case "chat":
          case "text-generation":
            return Effect.succeed("grok-3");
          case "image-generation":
            return Effect.succeed("grok-2-image");
          default:
            return Effect.fail(
              new ProviderToolError({
                description: `Unsupported capability for xAI provider: ${capability}`,
                provider: providerName,
                module: "xai",
                method: "getDefaultModelIdForProvider",
              })
            );
        }
      },

      // Vercel provider integration
      setVercelProvider: (vercelProvider: EffectiveProviderApi) =>
        Effect.succeed(undefined),
    };
  });
}

export { makeXaiClient };
