import { AgentRuntimeService } from '@/agent-runtime/service.js';
import { EffectiveMessage, ModelCapability, TextPart, ToolCallPart } from "@/schema.js";
import type { EffectiveInput, FinishReason } from "@/types.js";
import { createAnthropic } from "@ai-sdk/anthropic";
import { type LanguageModelV1, type CoreMessage as VercelCoreMessage, generateText } from "ai";
import { Chunk, Effect, Either, Schema as S } from "effect";
import { z } from "zod";
import type { ModelServiceApi } from "../../model/api.js";
import { ModelService } from "../../model/service.js";
import { ToolRegistryService } from '../../tool-registry/service.js';
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
      eaParts.push(new ToolCallPart({ _tag: "ToolCall", toolCall: JSON.stringify(toolCallRequest) }));
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
function makeAnthropicClient(apiKey: string): Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError, ModelServiceApi | ToolRegistryService | AgentRuntimeService> {
  const anthropicProvider = createAnthropic({ apiKey });

  return Effect.gen(function* () {
    const toolRegistryService = yield* ToolRegistryService;
    const agentRuntime = yield* AgentRuntimeService;
    const modelService = yield* ModelService;

    return {
      // Tool-related methods
      validateToolInput: (toolName: string, input: unknown) =>
        Effect.fail(new ProviderToolError({
          description: `Tool validation not implemented for ${toolName}`,
          provider: "anthropic"
        })),

      executeTool: (toolName: string, input: unknown) =>
        Effect.fail(new ProviderToolError({
          description: `Tool execution not implemented for ${toolName}`,
          provider: "anthropic"
        })),

      processToolResult: (toolName: string, result: unknown) =>
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
              model: modelId as unknown as LanguageModelV1,
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

      generateObject: <T = unknown>(input: EffectiveInput, options: ProviderGenerateObjectOptions<T>) =>
        Effect.fail(new ProviderOperationError({
          providerName: "anthropic",
          operation: "generateObject",
          message: "Not implemented",
          module: "anthropic",
          method: "generateObject"
        })),

      generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) =>
        Effect.fail(new ProviderOperationError({
          providerName: "anthropic",
          operation: "generateSpeech",
          message: "Not implemented",
          module: "anthropic",
          method: "generateSpeech"
        })),

      transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) =>
        Effect.fail(new ProviderOperationError({
          providerName: "anthropic",
          operation: "transcribe",
          message: "Not implemented",
          module: "anthropic",
          method: "transcribe"
        })),

      generateEmbeddings: (input: string[], options: ProviderGenerateEmbeddingsOptions) =>
        Effect.fail(new ProviderOperationError({
          providerName: "anthropic",
          operation: "generateEmbeddings",
          message: "Not implemented",
          module: "anthropic",
          method: "generateEmbeddings"
        })),

      generateImage: (input: EffectiveInput, options: ProviderGenerateImageOptions) =>
        Effect.fail(new ProviderOperationError({
          providerName: "anthropic",
          operation: "generateImage",
          message: "Not implemented",
          module: "anthropic",
          method: "generateImage"
        })),

      // Chat method with tool support
      chat: (input: EffectiveInput, options: ProviderChatOptions) => Effect.gen(function* () {

        let vercelMessages: VercelCoreMessage[] = mapEAMessagesToVercelMessages(Chunk.toReadonlyArray(input.messages || Chunk.empty()));
        let llmTools: Record<string, any> | undefined = undefined;
        const modelId = options.modelId || "claude-3-5-sonnet-20241022";

        if (options.tools && options.tools.length > 0) {
          llmTools = {};
          for (const tool of options.tools) {
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

        for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
          const vercelResult = yield* Effect.tryPromise({
            try: async () => {
              const modelInstance = anthropicProvider(modelId);
              return await generateText({
                model: modelInstance,
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

          const toolResultMessagesForLLM: VercelCoreMessage[] = [];
          for (const sdkToolCall of assistantToolCalls) {
            const toolName = sdkToolCall.toolName;
            const toolArgs = sdkToolCall.args;

            let toolExecutionOutputString: string;

            // Find the original ToolDefinition from the options to get its schema and EffectImplementation
            const originalToolDef = options.tools?.find(t => t.metadata.name === toolName);

            if (!originalToolDef) {
              yield* Effect.logWarning(`Tool '${toolName}' not found in provided options.tools.`);
              toolExecutionOutputString = JSON.stringify({ error: `Tool '${toolName}' not found in options.` });
            } else if (originalToolDef.implementation._tag !== "EffectImplementation") {
              yield* Effect.logWarning(`Tool '${toolName}' is not an EffectImplementation.`);
              toolExecutionOutputString = JSON.stringify({ error: `Tool '${toolName}' is not executable by this provider.` });
            } else {
              const effectImpl = originalToolDef.implementation;
              const toolInputZodSchema = yield* convertEffectSchemaToZodSchema(effectImpl.inputSchema);

              // Attempt to validate arguments using the original Effect Schema first for better error messages
              const validatedArgsEither = yield* Effect.either(S.decode(effectImpl.inputSchema)(toolArgs));

              if (Either.isLeft(validatedArgsEither)) {
                const validationError = validatedArgsEither.left;
                yield* Effect.logWarning(`Invalid arguments for tool ${toolName}`, validationError);
                toolExecutionOutputString = JSON.stringify({ error: `Invalid arguments for tool ${toolName}. Validation failed.` });
              } else {
                const validatedArgs = validatedArgsEither.right;

                // For execution, use the tool resolved by the registry
                const effectiveToolFromRegistryEither = yield* Effect.either(toolRegistryService.getTool(toolName as FullToolName));

                if (Either.isLeft(effectiveToolFromRegistryEither)) {
                  yield* Effect.logError(`Tool '${toolName}' was in options.tools but not resolvable by ToolRegistryService.`, effectiveToolFromRegistryEither.left);
                  toolExecutionOutputString = JSON.stringify({ error: `Tool '${toolName}' could not be resolved by registry.` });
                } else {
                  const effectiveToolFromRegistry = effectiveToolFromRegistryEither.right;
                  const toolEffectToRun = effectiveToolFromRegistry.execute(validatedArgs as Record<string, unknown>);

                  const toolRunResultEither = yield* Effect.either(
                    Effect.tryPromise({
                      try: () => agentRuntime.run(toolEffectToRun),
                      catch: (e) => e as Effect.Effect.Error<typeof toolEffectToRun>
                    })
                  );

                  if (Either.isLeft(toolRunResultEither)) {
                    const execError = toolRunResultEither.left;
                    yield* Effect.logError(`Tool ${toolName} execution failed`, execError);
                    toolExecutionOutputString = JSON.stringify({ error: `Tool ${toolName} execution failed: ${(execError as any)?.message || 'Unknown execution error'}` });
                  } else {
                    toolExecutionOutputString = JSON.stringify(toolRunResultEither.right);
                  }
                }
              }
            }
            const toolMessage: VercelCoreMessage = {
              role: 'tool',
              content: [{
                type: "tool-result" as const,
                toolCallId: sdkToolCall.toolCallId,
                toolName: toolName,
                result: toolExecutionOutputString
              }]
            };
            toolResultMessagesForLLM.push(toolMessage);
          }
          vercelMessages.push(...toolResultMessagesForLLM);
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
      setVercelProvider: (vercelProvider: EffectiveProviderApi) =>
        Effect.fail(new ProviderOperationError({
          providerName: "anthropic",
          operation: "setVercelProvider",
          message: "Not implemented",
          module: "anthropic",
          method: "setVercelProvider"
        }))
    } as unknown as ProviderClientApi;
  }) as Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError, ModelServiceApi | ToolRegistryService | AgentRuntimeService>;
}

export { makeAnthropicClient };
