import { EffectiveMessage, ModelCapability, TextPart, ToolCallPart } from "@/schema.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import type { EffectiveInput, FinishReason } from "@/types.js";
import { createPerplexity } from "@ai-sdk/perplexity";
import { type CoreMessage as VercelCoreMessage, generateText } from "ai";
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

  return new EffectiveMessage({
    role: vercelMsg.role as EffectiveMessage["role"],
    parts: Chunk.fromIterable(eaParts),
    metadata: { model: modelId, eaMessageId: `ea-${Date.now()}` }
  });
}

// Internal factory for ProviderService only
function makePerplexityClient(apiKey: string): Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError, ModelServiceApi | ToolRegistryService> {
  const perplexityProvider = createPerplexity({ apiKey });

  return Effect.succeed({
    // Tool-related methods - Perplexity does not support tools
    validateToolInput: (toolName: string, input: unknown) =>
      Effect.fail(new ProviderMissingCapabilityError({
        providerName: "perplexity",
        capability: "tool-use",
        module: "perplexity",
        method: "validateToolInput"
      })),

    executeTool: (toolName: string, input: unknown) =>
      Effect.fail(new ProviderMissingCapabilityError({
        providerName: "perplexity",
        capability: "tool-use",
        module: "perplexity",
        method: "executeTool"
      })),

    processToolResult: (toolName: string, result: unknown) =>
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
        const vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages || Chunk.empty()));
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
        const eaMessages = responseMessages.map(msg => mapVercelMessageToEAEffectiveMessage(msg, modelId));

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
    }),

    generateObject: <T = unknown>(input: EffectiveInput, options: ProviderGenerateObjectOptions<T>) =>
      Effect.fail(new ProviderMissingCapabilityError({
        providerName: "perplexity",
        capability: "function-calling",
        module: "perplexity",
        method: "generateObject"
      })),

    generateImage: (input: EffectiveInput, options: ProviderGenerateImageOptions) =>
      Effect.fail(new ProviderMissingCapabilityError({
        providerName: "perplexity",
        capability: "image-generation",
        module: "perplexity",
        method: "generateImage"
      })),

    // Unsupported capabilities
    generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) =>
      Effect.fail(new ProviderMissingCapabilityError({
        providerName: "perplexity",
        capability: "audio",
        module: "perplexity",
        method: "generateSpeech"
      })),

    transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) =>
      Effect.fail(new ProviderMissingCapabilityError({
        providerName: "perplexity",
        capability: "audio",
        module: "perplexity",
        method: "transcribe"
      })),

    generateEmbeddings: (input: string[], options: ProviderGenerateEmbeddingsOptions) =>
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
      const vercelMessages = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(effectiveInput.messages || Chunk.empty()));
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
      const eaMessages = responseMessages.map(msg => mapVercelMessageToEAEffectiveMessage(msg, modelId));

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
    }),

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
    setVercelProvider: (vercelProvider: EffectiveProviderApi) =>
      Effect.succeed(undefined)
  });
}

export { makePerplexityClient };
