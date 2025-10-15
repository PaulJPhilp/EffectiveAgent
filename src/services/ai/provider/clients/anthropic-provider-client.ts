import {
  createProvider,
  toEffectiveMessages,
  toVercelMessages,
  toZodSchema,
} from "@effective-agent/ai-sdk";
import { generateText, type CoreMessage as VercelCoreMessage } from "ai";
import { Chunk, Effect, type Schema as S } from "effect";
import type { ModelCapability } from "@/schema.js";
import type { OrchestratorParameters } from "@/services/execution/orchestrator/api.js";
import { OrchestratorService } from "@/services/execution/orchestrator/service.js";
import type {
  EffectiveInput,
  FinishReason,
  ProviderEffectiveResponse,
} from "@/types.js";
import { ToolRegistryService } from "../../tool-registry/service.js";
import type { ToolDefinition } from "../../tools/schema.js";
import type { FullToolName } from "../../tools/types.js";
import type { ProviderClientApi } from "../api.js";
import {
  ProviderMissingModelIdError,
  type ProviderNotFoundError,
  ProviderOperationError,
  ProviderServiceConfigError,
  ProviderToolError,
} from "../errors.js";
import type { ProvidersType } from "../schema.js";
import type {
  GenerateTextResult,
  ProviderChatOptions,
  ProviderGenerateTextOptions
} from "../types.js";

function _isEffectImplementation(
  tool: ToolDefinition
): tool is ToolDefinition & {
  implementation: {
    _tag: "EffectImplementation";
    inputSchema: S.Schema<unknown>;
    execute: (args: unknown) => Effect.Effect<unknown, unknown, never>;
  };
} {
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

// Note: Message transformation functions are now imported from @effective-agent/ai-sdk:
// - toVercelMessages() replaces mapEAMessagesToVercelMessages()
// - toEffectiveMessages() replaces mapVercelMessageToEAEffectiveMessage()
// - toZodSchema() replaces convertEffectSchemaToZodSchema()

// Internal factory for ProviderService only
function makeAnthropicClient(
  apiKey: string
): Effect.Effect<
  ProviderClientApi,
  ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError,
  ToolRegistryService | OrchestratorService
> {
  return Effect.gen(function* () {
    // Use ai-sdk's createProvider for provider instance creation
    const anthropicProvider = yield* createProvider("anthropic", {
      apiKey,
    }).pipe(
      Effect.mapError(
        (error) =>
          new ProviderServiceConfigError({
            description: `Failed to create Anthropic provider: ${error.message}`,
            module: "AnthropicClient",
            method: "makeAnthropicClient",
          })
      )
    );

    const orchestrator = yield* OrchestratorService;

    // Orchestration configurations for Anthropic operations
    const ANTHROPIC_GENERATE_TEXT_CONFIG: OrchestratorParameters = {
      operationName: "anthropic-generateText",
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

    const ANTHROPIC_CHAT_CONFIG: OrchestratorParameters = {
      operationName: "anthropic-chat",
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
      // Tool-related methods
      validateToolInput: (toolName: string) =>
        Effect.fail(
          new ProviderToolError({
            description: `Tool validation not implemented for ${toolName}`,
            provider: "anthropic",
          })
        ),

      executeTool: (toolName: string) =>
        Effect.fail(
          new ProviderToolError({
            description: `Tool execution not implemented for ${toolName}`,
            provider: "anthropic",
          })
        ),

      processToolResult: (toolName: string) =>
        Effect.fail(
          new ProviderToolError({
            description: `Tool result processing not implemented for ${toolName}`,
            provider: "anthropic",
          })
        ),

      // Provider and capability methods
      getProvider: () =>
        Effect.fail(
          new ProviderOperationError({
            providerName: "anthropic",
            operation: "getProvider",
            message: "Not implemented",
            module: "anthropic",
            method: "getProvider",
          })
        ),

      getCapabilities: () =>
        Effect.succeed(
          new Set<ModelCapability>([
            "chat",
            "text-generation",
            "function-calling",
            "tool-use",
          ])
        ),

      // Core generation methods with orchestration
      generateText: (
        input: EffectiveInput,
        options: ProviderGenerateTextOptions
      ) =>
        orchestrator.execute(
          Effect.gen(function* () {
            const modelId = options.modelId;
            if (!modelId) {
              return yield* Effect.fail(
                new ProviderMissingModelIdError({
                  providerName: "anthropic",
                  capability: "text-generation",
                  module: "anthropic",
                  method: "generateText",
                })
              );
            }

            const messages: Message[] = [];
            if (options.system) {
              messages.push({ role: "system", content: options.system });
            }
            messages.push({ role: "user", content: input.text });

            const result = yield* Effect.tryPromise({
              try: () =>
                generateText({
                  messages,
                  model: anthropicProvider(modelId),
                  temperature: options.parameters?.temperature,
                  maxTokens: options.parameters?.maxTokens,
                  topP: options.parameters?.topP,
                  frequencyPenalty: options.parameters?.frequencyPenalty,
                  presencePenalty: options.parameters?.presencePenalty,
                }) as Promise<GenerateTextResponse>,
              catch: (error) =>
                new ProviderOperationError({
                  providerName: "anthropic",
                  operation: "generateText",
                  message:
                    error instanceof Error ? error.message : "Unknown error",
                  module: "anthropic",
                  method: "generateText",
                  cause: error,
                }),
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
                totalTokens: result.usage?.totalTokens || 0,
              },
            };

            return {
              data: textResult,
              metadata: {
                model: modelId,
                provider: "anthropic",
                requestId:
                  result.response?.id || `anthropic-text-${Date.now()}`,
                messageCount: messages.length,
                hasSystemPrompt: !!options.system,
              },
              usage: textResult.usage,
              finishReason: textResult.finishReason,
            };
          }),
          ANTHROPIC_GENERATE_TEXT_CONFIG
        ),

      generateObject: () =>
        Effect.fail(
          new ProviderOperationError({
            providerName: "anthropic",
            operation: "generateObject",
            message: "Not implemented",
            module: "anthropic",
            method: "generateObject",
          })
        ),

      generateSpeech: () =>
        Effect.fail(
          new ProviderOperationError({
            providerName: "anthropic",
            operation: "generateSpeech",
            message: "Not implemented",
            module: "anthropic",
            method: "generateSpeech",
          })
        ),

      transcribe: () =>
        Effect.fail(
          new ProviderOperationError({
            providerName: "anthropic",
            operation: "transcribe",
            message: "Not implemented",
            module: "anthropic",
            method: "transcribe",
          })
        ),

      generateEmbeddings: () =>
        Effect.fail(
          new ProviderOperationError({
            providerName: "anthropic",
            operation: "generateEmbeddings",
            message: "Not implemented",
            module: "anthropic",
            method: "generateEmbeddings",
          })
        ),

      generateImage: () =>
        Effect.fail(
          new ProviderOperationError({
            providerName: "anthropic",
            operation: "generateImage",
            message: "Not implemented",
            module: "anthropic",
            method: "generateImage",
          })
        ),

      // Chat method with tool support and orchestration
      chat: (
        input: EffectiveInput,
        options: ProviderChatOptions
      ): Effect.Effect<
        ProviderEffectiveResponse<GenerateTextResult>,
        ProviderOperationError | ProviderServiceConfigError | ProviderToolError,
        ToolRegistryService
      > =>
        orchestrator.execute(
          Effect.gen(function* () {
            const toolRegistryService = yield* ToolRegistryService;
            // Use ai-sdk's toVercelMessages for message transformation
            const vercelMessages: VercelCoreMessage[] = yield* toVercelMessages(
              input.messages || Chunk.empty()
            ).pipe(
              Effect.mapError(
                (error) =>
                  new ProviderOperationError({
                    providerName: "anthropic",
                    operation: "toVercelMessages",
                    message: `Failed to convert messages: ${error.message}`,
                    module: "AnthropicClient",
                    method: "chat",
                    cause: error,
                  })
              )
            );
            let llmTools: Record<string, any> | undefined ;
            const modelId = options.modelId || "claude-3-5-sonnet-20241022";

            if (options.tools && options.tools.length > 0) {
              llmTools = {};
              for (const tool of options.tools as ToolDefinition[]) {
                if (tool.implementation._tag === "EffectImplementation") {
                  const effectImpl = tool.implementation;
                  // Use ai-sdk's toZodSchema for schema conversion
                  const inputZodSchema = yield* toZodSchema(
                    effectImpl.inputSchema
                  ).pipe(
                    Effect.mapError(
                      (error) =>
                        new ProviderOperationError({
                          providerName: "anthropic",
                          operation: "toZodSchema",
                          message: `Failed to convert schema: ${error.message}`,
                          module: "AnthropicClient",
                          method: "chat",
                          cause: error,
                        })
                    )
                  );
                  llmTools[tool.metadata.name] = {
                    description: tool.metadata.description,
                    parameters: inputZodSchema,
                  };
                } else {
                  yield* Effect.logWarning(
                    `Skipping tool ${tool.metadata.name} due to unsupported implementation type: ${tool.implementation._tag}`
                  );
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
                catch: (error) =>
                  new ProviderOperationError({
                    providerName: "anthropic",
                    operation: "chat.generateText",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Unknown AI SDK error",
                    module: "AnthropicClient",
                    method: "chat.generateTextLoop",
                    cause: error,
                  }),
              });

              const assistantResponseContent = vercelResult.text;
              const assistantToolCalls = vercelResult.toolCalls;

              const assistantMessage: VercelCoreMessage = {
                role: "assistant",
                content: assistantResponseContent,
              };
              vercelMessages.push(assistantMessage);

              if (!assistantToolCalls || assistantToolCalls.length === 0) {
                const mappedFinishReason = mapFinishReason(
                  vercelResult.finishReason
                );
                // Convert new messages back to EffectiveMessages using ai-sdk
                const initialMessageCount = yield* Effect.try({
                  try: () =>
                    Chunk.toReadonlyArray(input.messages || Chunk.empty()).length,
                  catch: (error) =>
                    new ProviderOperationError({
                      providerName: "anthropic",
                      operation: "getMessageCount",
                      message: "Failed to get initial message count",
                      module: "AnthropicClient",
                      method: "chat",
                      cause: error,
                    }),
                });
                const newVercelMessages = vercelMessages.slice(initialMessageCount);
                const newEffectiveMessages = yield* toEffectiveMessages(
                  newVercelMessages,
                  modelId
                ).pipe(
                  Effect.mapError(
                    (error) =>
                      new ProviderOperationError({
                        providerName: "anthropic",
                        operation: "toEffectiveMessages",
                        message: `Failed to convert messages: ${error.message}`,
                        module: "AnthropicClient",
                        method: "chat",
                        cause: error,
                      })
                  )
                );

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
                  messages: Chunk.isChunk(input.messages)
                    ? input.messages.pipe(
                      Chunk.appendAll(Chunk.fromIterable(newEffectiveMessages))
                    )
                    : (Chunk.fromIterable(newEffectiveMessages) as any),
                };
                return {
                  data: effectiveResponse,
                  metadata: {
                    model: modelId,
                    provider: "anthropic",
                    requestId: (vercelResult as any).experimental_rawResponse
                      ?.id,
                  },
                  usage: effectiveResponse.usage,
                  finishReason: mappedFinishReason,
                };
              }

              const toolMessages: VercelCoreMessage[] = [];
              for (const toolCall of assistantToolCalls) {
                const toolName = toolCall.toolName;
                const _toolArgs = toolCall.args;
                let toolExecutionOutputString = "";

                // Get tool from registry
                const _toolResult = yield* toolRegistryService
                  .getTool(toolName as FullToolName)
                  .pipe(
                    Effect.catchAll((error) =>
                      Effect.gen(function* (_) {
                        yield* Effect.logWarning(
                          `Tool '${toolName}' not found in registry`,
                          error
                        );
                        toolExecutionOutputString = JSON.stringify({
                          error: `Tool '${toolName}' not found: ${error.message}`,
                        });
                        return yield* Effect.fail(
                          new ProviderToolError({
                            description: `Tool '${toolName}' not found in registry`,
                            provider: "anthropic",
                            module: "anthropic-provider-client",
                            method: "chat",
                            cause: error,
                          })
                        );
                      })
                    )
                  );

                // Validate and execute tool

                const toolMessage: VercelCoreMessage = {
                  role: "tool",
                  content: [
                    {
                      type: "tool-result" as const,
                      toolCallId: toolCall.toolCallId,
                      toolName,
                      result: toolExecutionOutputString,
                    },
                  ],
                };
                toolMessages.push(toolMessage);
              }
              vercelMessages.push(...toolMessages);
              llmTools = undefined;
            }

            yield* Effect.logError(
              "Maximum tool iterations reached for chat.",
              {
                modelId,
              }
            );
            return yield* Effect.fail(
              new ProviderOperationError({
                providerName: "anthropic",
                operation: "chat",
                message: "Maximum tool iterations reached.",
                module: "AnthropicClient",
                method: "chat.maxIterations",
              })
            );
          }),
          ANTHROPIC_CHAT_CONFIG
        ) as unknown as Effect.Effect<
          ProviderEffectiveResponse<GenerateTextResult>,
          ProviderOperationError | ProviderServiceConfigError | ProviderToolError,
          ToolRegistryService
        >,

      // Model management
      getModels: () => Effect.succeed([]),

      getDefaultModelIdForProvider: (
        providerName: ProvidersType,
        capability: ModelCapability
      ) =>
        Effect.fail(
          new ProviderMissingModelIdError({
            providerName,
            capability,
            module: "anthropic",
            method: "getDefaultModelIdForProvider",
          })
        ),

      // Vercel provider integration
      setVercelProvider: () =>
        Effect.fail(
          new ProviderOperationError({
            providerName: "anthropic",
            operation: "setVercelProvider",
            message: "Not implemented",
            module: "anthropic",
            method: "setVercelProvider",
          })
        ),
    };
  });
}

export { makeAnthropicClient };
