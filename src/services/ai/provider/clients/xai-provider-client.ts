import {
  EffectiveMessage,
  ModelCapability,
  TextPart,
  ToolCallPart,
} from "@/schema.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import type { EffectiveInput, FinishReason } from "@/types.js";
import { createXai } from "@ai-sdk/xai";
import {
  type CoreMessage as VercelCoreMessage,
  experimental_generateImage as generateImage,
  generateText,
} from "ai";
import { Chunk, Effect } from "effect";
import type { ToolRegistryApi } from "../../tool-registry/api.js";
import type { ProviderClientApi } from "../api.js";
import {
  ProviderMissingCapabilityError,
  ProviderMissingModelIdError,
  ProviderNotFoundError,
  ProviderOperationError,
  ProviderServiceConfigError,
} from "../errors.js";
import { ProvidersType } from "../schema.js";
import type {
  EffectiveProviderApi,
  GenerateImageResult,
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
  ModelServiceApi | ToolRegistryApi
> {
  const xaiProvider = createXai({ apiKey });

  return Effect.succeed({
    // Tool-related methods - xAI Grok does not support tools
    validateToolInput: (toolName: string, input: unknown) =>
      Effect.fail(
        new ProviderMissingCapabilityError({
          providerName: "xai",
          capability: "tool-use",
          module: "xai",
          method: "validateToolInput",
        })
      ),

    executeTool: (toolName: string, input: unknown) =>
      Effect.fail(
        new ProviderMissingCapabilityError({
          providerName: "xai",
          capability: "tool-use",
          module: "xai",
          method: "executeTool",
        })
      ),

    processToolResult: (toolName: string, result: unknown) =>
      Effect.fail(
        new ProviderMissingCapabilityError({
          providerName: "xai",
          capability: "tool-use",
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

    generateObject: <T = unknown>(
      input: EffectiveInput,
      options: ProviderGenerateObjectOptions<T>
    ) =>
      Effect.fail(
        new ProviderMissingCapabilityError({
          providerName: "xai",
          capability: "function-calling",
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

          const result = yield* Effect.tryPromise({
            try: () =>
              generateImage({
                model: xaiProvider.image(modelId),
                prompt: prompt,
                n: options.n || 1,
                size: options.size as `${number}x${number}` | undefined,
                maxRetries: 2,
                abortSignal: options.signal,
              }),
            catch: (error) =>
              new ProviderOperationError({
                providerName: "xai",
                operation: "generateImage",
                message: `Failed to generate image: ${error}`,
                module: "xai",
                method: "generateImage",
                cause: error,
              }),
          });

          const imageResult: GenerateImageResult = {
            id: `xai-${Date.now()}`,
            model: modelId,
            timestamp: new Date(),
            imageUrl: result.image.base64
              ? `data:image/png;base64,${result.image.base64}`
              : "",
            parameters: {
              size: options.size,
              quality: options.quality,
              style: options.style,
            },
            usage: {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
            },
            finishReason: "stop",
          };

          return {
            data: imageResult,
            metadata: {
              model: modelId,
              provider: "xai",
              requestId: `xai-${Date.now()}`,
            },
            usage: imageResult.usage,
            finishReason: imageResult.finishReason,
          };
        } catch (error) {
          return yield* Effect.fail(
            new ProviderOperationError({
              providerName: "xai",
              operation: "generateImage",
              message: `Failed to generate image: ${error}`,
              module: "xai",
              method: "generateImage",
              cause: error,
            })
          );
        }
      }),

    // Unsupported capabilities
    generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) =>
      Effect.fail(
        new ProviderMissingCapabilityError({
          providerName: "xai",
          capability: "audio",
          module: "xai",
          method: "generateSpeech",
        })
      ),

    transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) =>
      Effect.fail(
        new ProviderMissingCapabilityError({
          providerName: "xai",
          capability: "audio",
          module: "xai",
          method: "transcribe",
        })
      ),

    generateEmbeddings: (
      input: string[],
      options: ProviderGenerateEmbeddingsOptions
    ) =>
      Effect.fail(
        new ProviderMissingCapabilityError({
          providerName: "xai",
          capability: "embeddings",
          module: "xai",
          method: "generateEmbeddings",
        })
      ),

    // Chat method - delegates to generateText since xAI doesn't support tools
    chat: (effectiveInput: EffectiveInput, options: ProviderChatOptions) =>
      Effect.gen(function* () {
        if (options.tools && options.tools.length > 0) {
          return yield* Effect.fail(
            new ProviderMissingCapabilityError({
              providerName: "xai",
              capability: "tool-use",
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

    // Model management
    getModels: () => Effect.succeed([]),

    getDefaultModelIdForProvider: (
      providerName: ProvidersType,
      capability: ModelCapability
    ) => {
      if (providerName !== "xai") {
        return Effect.fail(
          new ProviderMissingModelIdError({
            providerName,
            capability,
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
            new ProviderMissingModelIdError({
              providerName,
              capability,
              module: "xai",
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

export { makeXaiClient };
