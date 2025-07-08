import {
  EffectiveMessage,
  ModelCapability,
  TextPart,
  ToolCallPart,
} from "@/schema.js";
import type {
  EffectiveInput,
  FinishReason,
  ProviderEffectiveResponse,
} from "@/types.js";
import { createOpenAI } from "@ai-sdk/openai";
import { type CoreMessage as VercelCoreMessage, generateText } from "ai";
import { Chunk, Duration, Effect, Option, Schema as S } from "effect";
import { z } from "zod";
import type { ModelServiceApi } from "../../model/api.js";
import { ModelService } from "../../model/service.js";
import { ToolRegistryService } from "../../tool-registry/service.js";
import type { FullToolName } from "../../tools/types.js";
import type { ProviderClientApi } from "../api.js";
import {
  ProviderNotFoundError,
  ProviderOperationError,
  ProviderServiceConfigError,
  ProviderToolError,
} from "../errors.js";
import { ProvidersType } from "../schema.js";
import type {
  EffectiveProviderApi,
  GenerateTextResult,
  ProviderChatOptions,
  ProviderGenerateEmbeddingsOptions,
  ProviderGenerateImageOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderGenerateTextOptions,
  ProviderTranscribeOptions,
  ToolCallRequest,
} from "../types.js";
import { OrchestratorService } from "@/services/execution/orchestrator/service.js";
import type { OrchestratorParameters } from "@/services/execution/orchestrator/api.js";

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
function mapEAMessagesToVercelMessages(
  eaMessages: ReadonlyArray<EffectiveMessage>
): VercelCoreMessage[] {
  return eaMessages.map((msg) => {
    const messageParts = Chunk.toReadonlyArray(msg.parts);
    let textContent = "";

    if (messageParts.length === 1 && messageParts[0]?._tag === "Text") {
      textContent = (messageParts[0] as TextPart).content;
    } else {
      textContent = messageParts
        .filter((part) => part._tag === "Text")
        .map((part) => (part as TextPart).content)
        .join("\n");
    }

    if (
      msg.role === "user" ||
      msg.role === "assistant" ||
      msg.role === "system"
    ) {
      return { role: msg.role, content: textContent };
    } else if (msg.role === "tool") {
      const toolCallId = (msg.metadata?.toolCallId as string) || "";
      const toolName = (msg.metadata?.toolName as string) || "unknown";
      return {
        role: "tool" as const,
        content: [
          {
            type: "tool-result" as const,
            toolCallId: toolCallId,
            toolName: toolName,
            result: textContent,
          },
        ],
      };
    }
    return { role: "user", content: textContent };
  });
}

// Helper to convert a Vercel AI SDK message to an EA EffectiveMessage
function mapVercelMessageToEAEffectiveMessage(
  vercelMsg: VercelCoreMessage,
  modelId: string
): EffectiveMessage {
  let eaParts: Array<TextPart | ToolCallPart> = [];

  if (Array.isArray(vercelMsg.content)) {
    vercelMsg.content.forEach((part) => {
      if (part.type === "text") {
        eaParts.push(new TextPart({ _tag: "Text", content: part.text }));
      }
    });
  } else if (typeof vercelMsg.content === "string") {
    eaParts.push(new TextPart({ _tag: "Text", content: vercelMsg.content }));
  }

  if ((vercelMsg as any).tool_calls) {
    (vercelMsg as any).tool_calls.forEach((tc: any) => {
      const toolCallRequest: ToolCallRequest = {
        id: tc.id || tc.tool_call_id,
        type: "tool_call",
        function: {
          name: tc.tool_name || (tc.function && tc.function.name),
          arguments: JSON.stringify(
            tc.args || (tc.function && tc.function.arguments)
          ),
        },
      };
      eaParts.push(
        new ToolCallPart({
          _tag: "ToolCall",
          id: toolCallRequest.id,
          name: toolCallRequest.function.name,
          args: JSON.parse(toolCallRequest.function.arguments),
        })
      );
    });
  }

  return new EffectiveMessage({
    role: vercelMsg.role as EffectiveMessage["role"],
    parts: Chunk.fromIterable(eaParts),
    metadata: { model: modelId, eaMessageId: `ea-${Date.now()}` },
  });
}

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
              const vercelMessages = mapEAMessagesToVercelMessages(
                Chunk.toReadonlyArray(input.messages || Chunk.empty())
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
              const eaMessages = responseMessages.map((msg) =>
                mapVercelMessageToEAEffectiveMessage(msg, modelId)
              );

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
          }),
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
            const vercelMessages = mapEAMessagesToVercelMessages(
              Chunk.toReadonlyArray(effectiveInput.messages || Chunk.empty())
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
            const eaMessages = responseMessages.map((msg) =>
              mapVercelMessageToEAEffectiveMessage(msg, modelId)
            );

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
          }),
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
