import { EffectiveMessage, ModelCapability, TextPart, ToolCallPart } from "@/schema.js";
import type { EffectiveInput, FinishReason, ProviderEffectiveResponse } from "@/types.js";
import type { ToolDefinition } from "../../tools/schema.js";

import { createAnthropic } from "@ai-sdk/anthropic";
import { type CoreMessage as VercelCoreMessage, generateText } from "ai";
import { Chunk, Effect, Schema as S } from "effect";
import { z } from "zod";
import type { ModelServiceApi } from "../../model/api.js";
import { ModelService } from "../../model/service.js";
import type { ToolRegistryApi } from "../../tool-registry/api.js";
import { ToolRegistryService } from "../../tool-registry/service.js";
import type { FullToolName } from '../../tools/types.js';
import type { ProviderClientApi } from "../api.js";
import {
  ProviderMissingModelIdError,
  ProviderNotFoundError,
  ProviderOperationError,
  ProviderServiceConfigError,
  ProviderToolError
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
  ToolCallRequest
} from "../types.js";

function isEffectImplementation(tool: ToolDefinition): tool is ToolDefinition & { implementation: { _tag: "EffectImplementation", inputSchema: S.Schema<unknown>, execute: (args: unknown) => Effect.Effect<unknown, unknown, never> } } {
  return tool.implementation._tag === "EffectImplementation";
}

const MAX_TOOL_ITERATIONS = 5;

type Message = { role: "system" | "user"; content: string };
type GenerateTextResponse = {
  text: string;
  response?: {
    id?: string;
    modelId?: string;
  };
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

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
      eaParts.push(new ToolCallPart({
        _tag: "ToolCall",
        id: toolCallRequest.id,
        name: toolCallRequest.function.name,
        args: JSON.parse(toolCallRequest.function.arguments)
      }));
    });
  }

  return new EffectiveMessage({
    role: vercelMsg.role as EffectiveMessage["role"],
    parts: Chunk.fromIterable(eaParts),
    metadata: { model: modelId, eaMessageId: `ea-${Date.now()}` }
  });
}

// Helper function to convert Effect Schema to Zod Schema for Vercel AI SDK tool definitions
function convertEffectSchemaToZodSchema(schema: S.Schema<any, any, any>) {
  return Effect.try({
    try: () => {
      // For Vercel AI SDK tool definitions, we create a flexible Zod schema
      // Since we don't have sophisticated schema introspection, 
      // we'll create a basic object schema that accepts any properties
      return z.object({}).passthrough();
    },
    catch: (error) => new ProviderOperationError({
      providerName: "anthropic",
      operation: "schema-conversion",
      message: `Failed to convert Effect Schema to Zod Schema: ${error}`,
      module: "AnthropicClient",
      method: "convertEffectSchemaToZodSchema",
      cause: error
    })
  });
}

// Internal factory for ProviderService only
function makeAnthropicClient(apiKey: string): Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError, ToolRegistryApi> {
  const anthropicProvider = createAnthropic({ apiKey });

  return Effect.gen(function* () {

    return {
      // Tool-related methods
      validateToolInput: (toolName: string) =>
        Effect.fail(new ProviderToolError({
          description: `Tool validation not implemented for ${toolName}`,
          provider: "anthropic"
        })),

      executeTool: (toolName: string) =>
        Effect.fail(new ProviderToolError({
          description: `Tool execution not implemented for ${toolName}`,
          provider: "anthropic"
        })),

      processToolResult: (toolName: string) =>
        Effect.fail(new ProviderToolError({
          description: `Tool result processing not implemented for ${toolName}`,
          provider: "anthropic"
        })),

      // Provider and capability methods
      getProvider: () => Effect.fail(new ProviderOperationError({
        providerName: "anthropic",
        operation: "getProvider",
        message: "Not implemented",
        module: "anthropic",
        method: "getProvider"
      })),

      getCapabilities: () =>
        Effect.succeed(new Set<ModelCapability>(["chat", "text-generation", "function-calling", "tool-use"])),

      // Core generation methods
      generateText: (input: EffectiveInput, options: ProviderGenerateTextOptions) =>
        Effect.gen(function* () {
          const modelId = options.modelId;
          if (!modelId) {
            return yield* Effect.fail(new ProviderMissingModelIdError({
              providerName: "anthropic",
              capability: "text-generation",
              module: "anthropic",
              method: "generateText"
            }));
          }

          const messages: Message[] = [];
          if (options.system) {
            messages.push({ role: "system", content: options.system });
          }
          messages.push({ role: "user", content: input.text });

          const result = yield* Effect.tryPromise({
            try: () => generateText({
              messages,
              model: anthropicProvider(modelId),
              temperature: options.parameters?.temperature,
              maxTokens: options.parameters?.maxTokens,
              topP: options.parameters?.topP,
              frequencyPenalty: options.parameters?.frequencyPenalty,
              presencePenalty: options.parameters?.presencePenalty
            }) as Promise<GenerateTextResponse>,
            catch: error => new ProviderOperationError({
              providerName: "anthropic",
              operation: "generateText",
              message: error instanceof Error ? error.message : "Unknown error",
              module: "anthropic",
              method: "generateText",
              cause: error
            })
          });

          const textResult: GenerateTextResult = {
            text: result.text || "",
            id: result.response?.id || `anthropic-text-${Date.now()}`,
            model: result.response?.modelId || modelId,
            timestamp: new Date(),
            finishReason: (result.finishReason || "stop") as FinishReason,
            usage: {
              promptTokens: result.usage?.promptTokens || 0,
              completionTokens: result.usage?.completionTokens || 0,
              totalTokens: result.usage?.totalTokens || 0
            }
          };

          return {
            data: textResult,
            metadata: {
              model: modelId,
              provider: "anthropic",
              requestId: result.response?.id || `anthropic-text-${Date.now()}`,
              messageCount: messages.length,
              hasSystemPrompt: !!options.system
            },
            usage: textResult.usage,
            finishReason: textResult.finishReason
          };
        }),

      generateObject: () =>
        Effect.fail(new ProviderOperationError({
          providerName: "anthropic",
          operation: "generateObject",
          message: "Not implemented",
          module: "anthropic",
          method: "generateObject"
        })),

      generateSpeech: () =>
        Effect.fail(new ProviderOperationError({
          providerName: "anthropic",
          operation: "generateSpeech",
          message: "Not implemented",
          module: "anthropic",
          method: "generateSpeech"
        })),

      transcribe: () =>
        Effect.fail(new ProviderOperationError({
          providerName: "anthropic",
          operation: "transcribe",
          message: "Not implemented",
          module: "anthropic",
          method: "transcribe"
        })),

      generateEmbeddings: () =>
        Effect.fail(new ProviderOperationError({
          providerName: "anthropic",
          operation: "generateEmbeddings",
          message: "Not implemented",
          module: "anthropic",
          method: "generateEmbeddings"
        })),

      generateImage: () =>
        Effect.fail(new ProviderOperationError({
          providerName: "anthropic",
          operation: "generateImage",
          message: "Not implemented",
          module: "anthropic",
          method: "generateImage"
        })),

      // Chat method with tool support
      chat: (input: EffectiveInput, options: ProviderChatOptions): Effect.Effect<ProviderEffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderServiceConfigError | ProviderToolError, ToolRegistryApi> => Effect.gen(function* () {
        const toolRegistryService = yield* ToolRegistryService;
        let vercelMessages: VercelCoreMessage[] = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages || Chunk.empty()));
        let llmTools: Record<string, any> | undefined = undefined;
        const modelId = options.modelId || "claude-3-5-sonnet-20241022";

        if (options.tools && options.tools.length > 0) {
          llmTools = {};
          for (const tool of options.tools as ToolDefinition[]) {
            if (tool.implementation._tag === "EffectImplementation") {
              const effectImpl = tool.implementation;
              const inputZodSchema = yield* convertEffectSchemaToZodSchema(effectImpl.inputSchema);
              llmTools[tool.metadata.name] = {
                description: tool.metadata.description,
                parameters: inputZodSchema,
              };
            } else {
              yield* Effect.logWarning(`Skipping tool ${tool.metadata.name} due to unsupported implementation type: ${tool.implementation._tag}`);
            }
          }
        }

        const vercelModel = anthropicProvider(modelId);

        for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
          const vercelResult = yield* Effect.tryPromise({
            try: async () => {
              return await generateText({
                model: vercelModel,
                messages: vercelMessages,
                tools: llmTools,
                system: options.system,
                temperature: options.parameters?.temperature,
                maxTokens: options.parameters?.maxTokens,
                topP: options.parameters?.topP,
              });
            },
            catch: (error) => new ProviderOperationError({
              providerName: "anthropic",
              operation: "chat.generateText",
              message: error instanceof Error ? error.message : "Unknown AI SDK error",
              module: "AnthropicClient",
              method: "chat.generateTextLoop",
              cause: error
            })
          });

          const assistantResponseContent = vercelResult.text;
          const assistantToolCalls = vercelResult.toolCalls;

          const assistantMessage: VercelCoreMessage = {
            role: 'assistant',
            content: assistantResponseContent
          };
          vercelMessages.push(assistantMessage);

          if (!assistantToolCalls || assistantToolCalls.length === 0) {
            const mappedFinishReason = mapFinishReason(vercelResult.finishReason);
            const effectiveResponse: GenerateTextResult = {
              id: `anthropic-chat-${Date.now()}`,
              model: modelId,
              timestamp: new Date(),
              text: assistantResponseContent,
              finishReason: mappedFinishReason,
              usage: {
                promptTokens: vercelResult.usage.promptTokens,
                completionTokens: vercelResult.usage.completionTokens,
                totalTokens: vercelResult.usage.totalTokens,
              },
              messages: Chunk.isChunk(input.messages) ? input.messages.pipe(Chunk.appendAll(Chunk.fromIterable(vercelMessages.slice(mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages)).length).map(vm => mapVercelMessageToEAEffectiveMessage(vm, modelId))))) : Chunk.fromIterable(vercelMessages.map(vm => mapVercelMessageToEAEffectiveMessage(vm, modelId))) as any,
            };
            return {
              data: effectiveResponse,
              metadata: { model: modelId, provider: "anthropic", requestId: (vercelResult as any).experimental_rawResponse?.id },
              usage: effectiveResponse.usage,
              finishReason: mappedFinishReason,
            };
          }

          const toolMessages: VercelCoreMessage[] = [];
          for (const toolCall of assistantToolCalls) {
            const toolName = toolCall.toolName;
            const toolArgs = toolCall.args;
            let toolExecutionOutputString = "";

            // Get tool from registry
            const toolResult = yield* toolRegistryService.getTool(toolName as FullToolName).pipe(
              Effect.catchAll((error) => Effect.gen(function* (_) {
                yield* Effect.logWarning(`Tool '${toolName}' not found in registry`, error);
                toolExecutionOutputString = JSON.stringify({ error: `Tool '${toolName}' not found: ${error.message}` });
                return yield* Effect.fail(new ProviderToolError({
                  description: `Tool '${toolName}' not found in registry`,
                  provider: "anthropic",
                  module: "anthropic-provider-client",
                  method: "chat",
                  cause: error
                }));
              }))
            );

            // Validate and execute tool

            const toolMessage: VercelCoreMessage = {
              role: 'tool',
              content: [{
                type: "tool-result" as const,
                toolCallId: toolCall.toolCallId,
                toolName,
                result: toolExecutionOutputString
              }]
            };
            toolMessages.push(toolMessage);
          }
          vercelMessages.push(...toolMessages);
          llmTools = undefined;
        }

        yield* Effect.logError("Maximum tool iterations reached for chat.", { modelId });
        return yield* Effect.fail(new ProviderOperationError({
          providerName: "anthropic",
          operation: "chat",
          message: "Maximum tool iterations reached.",
          module: "AnthropicClient",
          method: "chat.maxIterations"
        }));

      }),

      // Model management
      getModels: () => Effect.succeed([]),

      getDefaultModelIdForProvider: (providerName: ProvidersType, capability: ModelCapability) =>
        Effect.fail(new ProviderMissingModelIdError({
          providerName,
          capability,
          module: "anthropic",
          method: "getDefaultModelIdForProvider"
        })),

      // Vercel provider integration
      setVercelProvider: () =>
        Effect.fail(new ProviderOperationError({
          providerName: "anthropic",
          operation: "setVercelProvider",
          message: "Not implemented",
          module: "anthropic",
          method: "setVercelProvider"
        }))
    };

  });
}

export { makeAnthropicClient };
