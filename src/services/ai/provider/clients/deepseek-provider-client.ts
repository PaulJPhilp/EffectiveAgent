import { EffectiveMessage, ModelCapability, TextPart, ToolCallPart } from "@/schema.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import type { EffectiveInput, FinishReason } from "@/types.js";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { type CoreMessage as VercelCoreMessage, generateObject, generateText } from "ai";
import { Chunk, Effect } from "effect";
import { ToolRegistryService } from '../../tool-registry/service.js';
import type { ProviderClientApi } from "../api.js";
import {
  ProviderMissingCapabilityError,
  ProviderMissingModelIdError,
  ProviderNotFoundError,
  ProviderOperationError,
  ProviderServiceConfigError
} from "../errors.js";
import { ProvidersType } from "../schema.js";
import type {
  EffectiveProviderApi,
  GenerateObjectResult,
  GenerateTextResult,
  ProviderChatOptions,
  ProviderGenerateEmbeddingsOptions,
  ProviderGenerateImageOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderGenerateTextOptions,
  ProviderTranscribeOptions,
  ToolCallRequest
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
function mapEAMessagesToVercelMessages(eaMessages: ReadonlyArray<EffectiveMessage>): VercelCoreMessage[] {
  return eaMessages.map(msg => {
    const messageParts = Chunk.toReadonlyArray(msg.parts);
    let textContent = "";

    if (messageParts.length === 1 && messageParts[0]?._tag === "Text") {
      textContent = (messageParts[0] as TextPart).content;
    } else {
      textContent = messageParts
        .filter(part => part._tag === "Text")
        .map(part => (part as TextPart).content)
        .join("\n");
    }

    if (msg.role === "user" || msg.role === "assistant" || msg.role === "system") {
      return { role: msg.role, content: textContent };
    } else if (msg.role === "tool") {
      const toolCallId = (msg.metadata?.toolCallId as string) || "";
      const toolName = (msg.metadata?.toolName as string) || "unknown";
      return {
        role: "tool" as const,
        content: [{
          type: "tool-result" as const,
          toolCallId: toolCallId,
          toolName: toolName,
          result: textContent
        }]
      };
    }
    return { role: "user", content: textContent };
  });
}

// Helper to convert a Vercel AI SDK message to an EA EffectiveMessage
function mapVercelMessageToEAEffectiveMessage(vercelMsg: VercelCoreMessage, modelId: string): EffectiveMessage {
  let eaParts: Array<TextPart | ToolCallPart> = [];

  if (Array.isArray(vercelMsg.content)) {
    vercelMsg.content.forEach(part => {
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
          arguments: JSON.stringify(tc.args || (tc.function && tc.function.arguments))
        }
      };
      eaParts.push(new ToolCallPart({ _tag: "ToolCall", toolCall: JSON.stringify(toolCallRequest) }));
    });
  }

  return new EffectiveMessage({
    role: vercelMsg.role as EffectiveMessage["role"],
    parts: Chunk.fromIterable(eaParts),
    metadata: { model: modelId, eaMessageId: `ea-${Date.now()}` }
  });
}

// Internal factory for ProviderService only
function makeDeepseekClient(apiKey: string): Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError, ModelServiceApi | ToolRegistryService> {
  const deepseekProvider = createDeepSeek({ apiKey });

  return Effect.succeed({
    // Tool-related methods - DeepSeek supports tools
    validateToolInput: (toolName: string, input: unknown) =>
      Effect.succeed(true), // Basic validation - could be enhanced

    executeTool: (toolName: string, input: unknown) =>
      Effect.succeed({ result: "Tool execution not implemented" }), // Placeholder

    processToolResult: (toolName: string, result: unknown) =>
      Effect.succeed(result),

    // Provider and capability methods
    getProvider: () => Effect.succeed({
      name: "deepseek" as const,
      provider: {} as any, // Raw provider not needed for EffectiveProviderApi
      capabilities: new Set<ModelCapability>(["chat", "text-generation", "object-generation", "tool-use"])
    }),

    getCapabilities: () =>
      Effect.succeed(new Set<ModelCapability>(["chat", "text-generation", "object-generation", "tool-use"])),

    // Core generation methods
    generateText: (input: EffectiveInput, options: ProviderGenerateTextOptions) => Effect.gen(function* () {
      try {
        const vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages || Chunk.empty()));
        const modelId = options.modelId || "deepseek-chat";

        const result = yield* Effect.tryPromise({
          try: () => generateText({
            model: deepseekProvider(modelId),
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
            abortSignal: options.signal
          }),
          catch: (error) => new ProviderOperationError({
            providerName: "deepseek",
            operation: "generateText",
            message: `Failed to generate text: ${error}`,
            module: "deepseek",
            method: "generateText",
            cause: error
          })
        });

        const responseMessages = result.response?.messages || [];
        const eaMessages = responseMessages.map(msg => mapVercelMessageToEAEffectiveMessage(msg, modelId));

        const textResult: GenerateTextResult = {
          id: `deepseek-${Date.now()}`,
          model: modelId,
          timestamp: new Date(),
          text: result.text,
          finishReason: mapFinishReason(result.finishReason),
          usage: {
            promptTokens: result.usage?.promptTokens || 0,
            completionTokens: result.usage?.completionTokens || 0,
            totalTokens: result.usage?.totalTokens || 0
          },
          toolCalls: [],
          reasoning: result.reasoning
        };

        return {
          data: textResult,
          metadata: {
            model: modelId,
            provider: "deepseek",
            requestId: `deepseek-${Date.now()}`
          },
          usage: textResult.usage,
          finishReason: textResult.finishReason
        };
      } catch (error) {
        return yield* Effect.fail(new ProviderOperationError({
          providerName: "deepseek",
          operation: "generateText",
          message: `Failed to generate text: ${error}`,
          module: "deepseek",
          method: "generateText",
          cause: error
        }));
      }
    }),

    generateObject: <T = unknown>(input: EffectiveInput, options: ProviderGenerateObjectOptions<T>) => Effect.gen(function* () {
      try {
        const vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages || Chunk.empty()));
        const modelId = options.modelId || "deepseek-chat";

        const result = yield* Effect.tryPromise({
          try: () => generateObject({
            model: deepseekProvider(modelId),
            messages: vercelMessages,
            schema: options.schema,
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
            abortSignal: options.signal
          }),
          catch: (error) => new ProviderOperationError({
            providerName: "deepseek",
            operation: "generateObject",
            message: `Failed to generate object: ${error}`,
            module: "deepseek",
            method: "generateObject",
            cause: error
          })
        });

        const objectResult: GenerateObjectResult<T> = {
          id: `deepseek-${Date.now()}`,
          model: modelId,
          timestamp: new Date(),
          object: result.object,
          finishReason: mapFinishReason(result.finishReason),
          usage: {
            promptTokens: result.usage?.promptTokens || 0,
            completionTokens: result.usage?.completionTokens || 0,
            totalTokens: result.usage?.totalTokens || 0
          }
        };

        return {
          data: objectResult,
          metadata: {
            model: modelId,
            provider: "deepseek",
            requestId: `deepseek-${Date.now()}`
          },
          usage: objectResult.usage,
          finishReason: objectResult.finishReason
        };
      } catch (error) {
        return yield* Effect.fail(new ProviderOperationError({
          providerName: "deepseek",
          operation: "generateObject",
          message: `Failed to generate object: ${error}`,
          module: "deepseek",
          method: "generateObject",
          cause: error
        }));
      }
    }),

    // Unsupported capabilities
    generateImage: (input: EffectiveInput, options: ProviderGenerateImageOptions) =>
      Effect.fail(new ProviderMissingCapabilityError({
        providerName: "deepseek",
        capability: "image-generation",
        module: "deepseek",
        method: "generateImage"
      })),

    generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) =>
      Effect.fail(new ProviderMissingCapabilityError({
        providerName: "deepseek",
        capability: "audio",
        module: "deepseek",
        method: "generateSpeech"
      })),

    transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) =>
      Effect.fail(new ProviderMissingCapabilityError({
        providerName: "deepseek",
        capability: "audio",
        module: "deepseek",
        method: "transcribe"
      })),

    generateEmbeddings: (input: string[], options: ProviderGenerateEmbeddingsOptions) =>
      Effect.fail(new ProviderMissingCapabilityError({
        providerName: "deepseek",
        capability: "embeddings",
        module: "deepseek",
        method: "generateEmbeddings"
      })),

    // Chat method - supports tools
    chat: (effectiveInput: EffectiveInput, options: ProviderChatOptions) => Effect.gen(function* () {
      const vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(effectiveInput.messages || Chunk.empty()));
      const modelId = options.modelId || "deepseek-chat";

      const result = yield* Effect.tryPromise({
        try: () => generateText({
          model: deepseekProvider(modelId),
          messages: vercelMessages,
          system: options.system,
          tools: options.tools ? Object.fromEntries(
            options.tools.map(tool => [tool.name, {
              description: tool.description,
              parameters: tool.parameters
            }])
          ) : undefined,
          maxTokens: options.parameters?.maxTokens,
          temperature: options.parameters?.temperature,
          topP: options.parameters?.topP,
          topK: options.parameters?.topK,
          presencePenalty: options.parameters?.presencePenalty,
          frequencyPenalty: options.parameters?.frequencyPenalty,
          stopSequences: options.parameters?.stop,
          seed: options.parameters?.seed,
          maxRetries: 2,
          abortSignal: options.signal
        }),
        catch: (error) => new ProviderOperationError({
          providerName: "deepseek",
          operation: "chat",
          message: `Failed to generate text: ${error}`,
          module: "deepseek",
          method: "chat",
          cause: error
        })
      });

      const responseMessages = result.response?.messages || [];
      const eaMessages = responseMessages.map(msg => mapVercelMessageToEAEffectiveMessage(msg, modelId));

      const chatResult: GenerateTextResult = {
        id: `deepseek-${Date.now()}`,
        model: modelId,
        timestamp: new Date(),
        text: result.text,
        finishReason: mapFinishReason(result.finishReason),
        usage: {
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0
        },
        toolCalls: result.toolCalls?.map(tc => ({
          id: tc.toolCallId,
          type: "tool_call" as const,
          function: {
            name: tc.toolName,
            arguments: JSON.stringify(tc.args)
          }
        })) || [],
        reasoning: result.reasoning
      };

      return {
        data: chatResult,
        metadata: {
          model: modelId,
          provider: "deepseek",
          requestId: `deepseek-${Date.now()}`
        },
        usage: chatResult.usage,
        finishReason: chatResult.finishReason
      };
    }),

    // Model management
    getModels: () => Effect.succeed([]),

    getDefaultModelIdForProvider: (providerName: ProvidersType, capability: ModelCapability) => {
      if (providerName !== "deepseek") {
        return Effect.fail(new ProviderMissingModelIdError({
          providerName,
          capability,
          module: "deepseek",
          method: "getDefaultModelIdForProvider"
        }));
      }

      switch (capability) {
        case "chat":
        case "text-generation":
        case "object-generation":
        case "tool-use":
          return Effect.succeed("deepseek-chat");
        default:
          return Effect.fail(new ProviderMissingModelIdError({
            providerName,
            capability,
            module: "deepseek",
            method: "getDefaultModelIdForProvider"
          }));
      }
    },

    // Vercel provider integration
    setVercelProvider: (vercelProvider: EffectiveProviderApi) =>
      Effect.succeed(undefined)
  });
}

export { makeDeepseekClient };
