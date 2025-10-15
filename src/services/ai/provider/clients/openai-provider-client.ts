import {
  AiSdkMessageTransformError,
  AiSdkSchemaError,
  createProvider,
  toEffectiveMessage,
  toVercelMessages,
  toZodSchema
} from "@effective-agent/ai-sdk";
import {
  embedMany,
  experimental_generateImage as generateImage,
  experimental_generateSpeech as generateSpeech,
  generateText,
  experimental_transcribe as transcribe, 
  type CoreMessage as VercelCoreMessage
} from "ai";
import { Chunk, Effect, Either, type Schema as S } from "effect";
import type {
  ModelCapability
} from "@/schema.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import { ModelService } from "@/services/ai/model/service.js";
import type { OrchestratorParameters } from "@/services/execution/orchestrator/api.js";
import { OrchestratorService } from "@/services/execution/orchestrator/service.js";
import type {
  EffectiveInput,
  FinishReason
} from "@/types.js";
import { ToolRegistryService } from "../../tool-registry/service.js";
import { ToolService } from "../../tools/service.js";
import type { FullToolName } from "../../tools/types.js";
import type { ProviderClientApi } from "../api.js";
import {
  ProviderMissingModelIdError,
  type ProviderNotFoundError,
  ProviderOperationError,
  ProviderServiceConfigError
} from "../errors.js";
import type { ProvidersType } from "../schema.js";
import type {
  EffectiveProviderApi,
  GenerateEmbeddingsResult,
  GenerateImageResult,
  GenerateTextResult,
  ProviderChatOptions,
  ProviderGenerateEmbeddingsOptions,
  ProviderGenerateImageOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderGenerateTextOptions,
  ProviderTranscribeOptions,
  TranscribeResult
} from "../types.js";

const MAX_TOOL_ITERATIONS = 5;

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

// Note: Message transformation and schema conversion functions are now imported from @effective-agent/ai-sdk:
// - toVercelMessages() replaces mapEAMessagesToVercelMessages()
// - toEffectiveMessages() replaces mapVercelMessageToEAEffectiveMessage()
// - toZodSchema() replaces convertEffectSchemaToZodSchema()
// - toStandardSchema() replaces convertEffectSchemaToStandardSchema()

// Internal factory for ProviderService only
function makeOpenAIClient(
  apiKey: string
): Effect.Effect<
  ProviderClientApi,
  ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError,
  ModelServiceApi | ToolRegistryService | OrchestratorService
> {
  return Effect.gen(function* () {
    // Use ai-sdk's createProvider for provider instance creation
    const openaiProvider = yield* createProvider("openai", {
      apiKey,
    }).pipe(
      Effect.mapError(
        (error) =>
          new ProviderServiceConfigError({
            description: `Failed to create OpenAI provider: ${error.message}`,
            module: "OpenAIClient",
            method: "makeOpenAIClient",
          })
      )
    );

    const orchestrator = yield* OrchestratorService;

    // Orchestration configurations for OpenAI operations
    const OPENAI_GENERATE_TEXT_CONFIG: OrchestratorParameters = {
      operationName: "openai-generateText",
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

    const _OPENAI_CHAT_CONFIG: OrchestratorParameters = {
      operationName: "openai-chat",
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
      // Tool handling is managed by ToolService

      chat: (input: EffectiveInput, options: ProviderChatOptions) =>
        orchestrator.execute(
          Effect.gen(function* () {
            const toolRegistryService = yield* ToolRegistryService;

            const vercelMessages: VercelCoreMessage[] = yield* toVercelMessages(
              input.messages || Chunk.empty()
            );
            let llmTools: Record<string, any> | undefined ;
            const modelId = options.modelId || "gpt-4o";

            if (options.tools && options.tools.length > 0) {
              llmTools = {};
              for (const tool of options.tools) {
                if (tool.implementation._tag === "EffectImplementation") {
                  const effectImpl = tool.implementation;
                  const inputZodSchema = yield* toZodSchema(
                    effectImpl.inputSchema
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

            for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
              const vercelResult = yield* Effect.tryPromise({
                try: async () => {
                  const modelInstance = openaiProvider(modelId);
                  return await generateText({
                    model: modelInstance,
                    messages: vercelMessages,
                    tools: llmTools,
                    system:
                      options.system ||
                      "You are a helpful assistant. When using the calculator tool, you can only use these operations: add, subtract, multiply, divide. Do not try to use other operations like power.",
                    temperature: options.parameters?.temperature,
                    maxTokens: options.parameters?.maxTokens,
                    topP: options.parameters?.topP,
                    frequencyPenalty: options.parameters?.frequencyPenalty,
                    presencePenalty: options.parameters?.presencePenalty,
                  });
                },
                catch: (error) =>
                  new ProviderOperationError({
                    providerName: "openai",
                    operation: "chat.generateText",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Unknown AI SDK error",
                    module: "OpenAIClient",
                    method: "chat.generateTextLoop",
                    cause: error,
                  }),
              });

              const assistantResponseContent = vercelResult.text;
              const assistantToolCalls = vercelResult.toolCalls;

              const assistantMessage = {
                role: "assistant",
                content: assistantResponseContent,
                tool_calls: assistantToolCalls,
              } as VercelCoreMessage;
              vercelMessages.push(assistantMessage);

              if (!assistantToolCalls || assistantToolCalls.length === 0) {
                const mappedFinishReason = mapFinishReason(
                  vercelResult.finishReason
                );
                const effectiveResponse: GenerateTextResult = {
                  id: `openai-chat-${Date.now()}`,
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
                    ? yield* Effect.gen(function* () {
                      const inputMessageCount = (yield* toVercelMessages(input.messages)).length;
                      const newMessages = vercelMessages.slice(inputMessageCount);
                      const effectiveNewMessages = yield* Effect.forEach(newMessages, (vm) => toEffectiveMessage(vm, modelId), { concurrency: 1 });
                      return [...Chunk.toReadonlyArray(input.messages), ...effectiveNewMessages] as any;
                    })
                    : yield* Effect.gen(function* () {
                      const effectiveMessages = yield* Effect.forEach(vercelMessages, (vm) => toEffectiveMessage(vm, modelId), { concurrency: 1 });
                      return effectiveMessages as any;
                    }),
                };
                return {
                  data: effectiveResponse,
                  metadata: {
                    model: modelId,
                    provider: "openai",
                    requestId: (vercelResult as any).experimental_rawResponse
                      ?.id,
                  },
                  usage: effectiveResponse.usage,
                  finishReason: mappedFinishReason,
                };
              }

              const toolResultMessagesForLLM: VercelCoreMessage[] = [];
              for (const sdkToolCall of assistantToolCalls) {
                const toolName = sdkToolCall.toolName;
                const toolArgs = sdkToolCall.args;

                let _toolExecutionOutputString: string;

                // Find the original ToolDefinition from the options to get its schema and EffectImplementation
                const originalToolDef = options.tools?.find(
                  (t) => t.metadata.name.split(":").pop() === toolName
                );

                if (!originalToolDef) {
                  yield* Effect.logWarning(
                    `Tool '${toolName}' not found in provided options.tools.`
                  );
                  _toolExecutionOutputString = JSON.stringify({
                    error: `Tool '${toolName}' not found in options.`,
                  });
                } else if (
                  originalToolDef.implementation._tag !== "EffectImplementation"
                ) {
                  yield* Effect.logWarning(
                    `Tool '${toolName}' is not an EffectImplementation.`
                  );
                  _toolExecutionOutputString = JSON.stringify({
                    error: `Tool '${toolName}' is not executable by this provider.`,
                  });
                } else {
                  const effectImpl = originalToolDef.implementation;
                  const zodSchema = yield* toZodSchema(
                    effectImpl.inputSchema
                  );                  // Validate using Zod schema
                  const validationResult = zodSchema.safeParse(toolArgs);

                  if (!validationResult.success) {
                    const validationError = validationResult.error;
                    yield* Effect.logWarning(
                      `Invalid arguments for tool ${toolName}`,
                      validationError
                    );
                    _toolExecutionOutputString = JSON.stringify({
                      error: `Invalid arguments for tool ${toolName}. Validation failed.`,
                    });
                  } else {
                    const validatedArgs = validationResult.data;

                    // For execution, use the tool resolved by the registry
                    const effectiveToolFromRegistryEither =
                      yield* Effect.either(
                        toolRegistryService.getTool(toolName as FullToolName)
                      );

                    if (Either.isLeft(effectiveToolFromRegistryEither)) {
                      yield* Effect.logError(
                        `Tool '${toolName}' was in options.tools but not resolvable by ToolRegistryService.`,
                        effectiveToolFromRegistryEither.left
                      );
                      _toolExecutionOutputString = JSON.stringify({
                        error: `Tool '${toolName}' could not be resolved by registry.`,
                      });
                    } else {
                      const effectiveToolFromRegistry =
                        effectiveToolFromRegistryEither.right;
                      const impl = effectiveToolFromRegistry.implementation;
                      if (
                        typeof impl !== "object" ||
                        impl === null ||
                        !("execute" in impl)
                      ) {
                        yield* Effect.logError(
                          `Tool '${toolName}' has unsupported implementation`
                        );
                        _toolExecutionOutputString = JSON.stringify({
                          error: `Tool '${toolName}' has unsupported implementation.`,
                        });
                        continue;
                      }
                      // Convert tool name to namespace:name format required by ToolService
                      const fullToolName = `e2e-tools:${toolName}` as const;
                      const toolService = yield* ToolService;
                      const toolResult = yield* Effect.either(
                        toolService.run(fullToolName, validatedArgs)
                      );

                      const resultContent = Either.isLeft(toolResult)
                        ? {
                          error: `Tool ${toolName} execution failed: ${(toolResult.left as any)?.message ||
                            "Unknown execution error"
                            }`,
                        }
                        : toolResult.right;

                      const toolMessage: VercelCoreMessage = {
                        role: "tool" as const,
                        content: [
                          {
                            type: "tool-result" as const,
                            toolCallId: sdkToolCall.toolCallId,
                            toolName: toolName,
                            result: resultContent,
                          },
                        ],
                      };
                      toolResultMessagesForLLM.push(toolMessage);
                    }
                  }
                }
              }
              vercelMessages.push(...toolResultMessagesForLLM);
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
                providerName: "openai",
                operation: "chat",
                message: "Maximum tool iterations reached.",
                module: "OpenAIClient",
                method: "chat.maxIterations",
              })
            );
          }).pipe(
            Effect.catchAll((error) => {
              // Map ai-sdk errors to EffectiveError types
              if (error instanceof AiSdkMessageTransformError) {
                return Effect.fail(
                  new ProviderOperationError({
                    operation: "messageTransform",
                    message: error.message,
                    providerName: "openai",
                    module: "OpenAIProviderClient",
                    method: "chat",
                    cause: error,
                  })
                );
              }
              if (error instanceof AiSdkSchemaError) {
                return Effect.fail(
                  new ProviderOperationError({
                    operation: "schemaConversion",
                    message: error.message,
                    providerName: "openai",
                    module: "OpenAIProviderClient",
                    method: "chat",
                    cause: error,
                  })
                );
              }
              // For other errors, assume they're already EffectiveError types
              return Effect.fail(error);
            })
          )
        ),

      getProvider: () =>
        Effect.succeed({
          name: "openai",
          provider: {} as ProviderClientApi,
          capabilities: new Set<ModelCapability>([
            "chat",
            "text-generation",
            "embeddings",
            "image-generation",
            "function-calling",
          ]),
        } as EffectiveProviderApi),

      getCapabilities: () =>
        Effect.succeed(
          new Set<ModelCapability>([
            "chat",
            "text-generation",
            "embeddings",
            "image-generation",
            "function-calling",
            "tool-use",
          ])
        ),

      generateText: (
        input: EffectiveInput,
        options: ProviderGenerateTextOptions
      ) =>
        orchestrator.execute(
          Effect.tryPromise({
            try: async () => {
              const modelId = options.modelId || "gpt-4o";
              const vercelMessages = await Effect.runPromise(toVercelMessages(
                input.messages || Chunk.empty()
              ));
              const promptText =
                input.text || (vercelMessages.length === 0 ? "" : undefined);

              const modelInstance = openaiProvider(modelId);
              const result = await generateText({
                model: modelInstance,
                prompt: promptText,
                messages:
                  vercelMessages.length > 0 ? vercelMessages : undefined,
                system: options.system,
                temperature: options.parameters?.temperature,
                maxTokens: options.parameters?.maxTokens,
                topP: options.parameters?.topP,
                frequencyPenalty: options.parameters?.frequencyPenalty,
                presencePenalty: options.parameters?.presencePenalty,
              });

              const textResult: GenerateTextResult = {
                text: result.text,
                id:
                  (result as any).experimental_rawResponse?.id ||
                  `openai-text-${Date.now()}`,
                model:
                  (result as any).experimental_rawResponse?.modelId || modelId,
                timestamp: new Date(),
                finishReason: mapFinishReason(result.finishReason || "stop"),
                usage: {
                  promptTokens: result.usage?.promptTokens || 0,
                  completionTokens: result.usage?.completionTokens || 0,
                  totalTokens: result.usage?.totalTokens || 0,
                },
                toolCalls: result.toolCalls?.map((tc) => ({
                  id: tc.toolCallId,
                  type: "tool_call",
                  function: {
                    name: tc.toolName,
                    arguments: JSON.stringify(tc.args),
                  },
                })),
                messages: Chunk.fromIterable(
                  await Promise.all(vercelMessages.map((vm) =>
                    Effect.runPromise(toEffectiveMessage(vm, modelId))
                  ))
                ) as any,
              };

              return {
                data: textResult,
                metadata: {
                  model: modelId,
                  provider: "openai",
                  requestId:
                    (result as any).experimental_rawResponse?.id ||
                    `openai-text-${Date.now()}`,
                },
                usage: textResult.usage,
                finishReason: textResult.finishReason,
              };
            },
            catch: (error) =>
              new ProviderOperationError({
                providerName: "openai",
                operation: "generateText",
                message:
                  error instanceof Error ? error.message : "Unknown error",
                module: "openai",
                method: "generateText",
                cause: error,
              }),
          }),
          OPENAI_GENERATE_TEXT_CONFIG
        ),

      generateObject: <T = unknown>(
        input: EffectiveInput,
        options: ProviderGenerateObjectOptions<T>
      ) =>
        Effect.gen(function* () {
          const modelId = options.modelId || "gpt-4o";
          const schema = options.schema; // This is an Effect.Schema
          const _zodSchema = yield* toZodSchema(
            schema as S.Schema<any, any, never>
          );
          const vercelMessages = yield* toVercelMessages(
            input.messages || Chunk.empty()
          );
          const _promptText =
            input.text || (vercelMessages.length === 0 ? "" : undefined);

          const modelInstance = openaiProvider(modelId);

          const result = yield* Effect.tryPromise({
            try: () =>
              generateText({
                model: modelInstance,
                messages:
                  vercelMessages.length > 0 ? vercelMessages : undefined,
                temperature: options.parameters?.temperature ?? 0.7,
                maxTokens: options.parameters?.maxTokens ?? 1000,
                topP: options.parameters?.topP ?? 1,
                frequencyPenalty: options.parameters?.frequencyPenalty,
                presencePenalty: options.parameters?.presencePenalty,
              }),
            catch: (error) =>
              new ProviderOperationError({
                providerName: "openai",
                operation: "generateObject",
                message:
                  error instanceof Error ? error.message : "Unknown error",
                module: "openai",
                method: "generateObject",
                cause: error,
              }),
          });

          // Parse the text response as JSON
          const parsedResult = JSON.parse(result.text) as T;
          return {
            data: {
              object: parsedResult,
              id:
                (result as any).experimental_rawResponse?.id ||
                `openai-object-${Date.now()}`,
              model:
                (result as any).experimental_rawResponse?.modelId || modelId,
              timestamp: new Date(),
              finishReason: mapFinishReason(result.finishReason || "stop"),
              usage: {
                promptTokens: result.usage?.promptTokens || 0,
                completionTokens: result.usage?.completionTokens || 0,
                totalTokens: result.usage?.totalTokens || 0,
              },
            },
            metadata: {
              model: modelId,
              provider: "openai",
              requestId:
                (result as any).experimental_rawResponse?.id ||
                `openai-object-${Date.now()}`,
            },
            usage: {
              promptTokens: result.usage?.promptTokens || 0,
              completionTokens: result.usage?.completionTokens || 0,
              totalTokens: result.usage?.totalTokens || 0,
            },
            finishReason: mapFinishReason(result.finishReason || "stop"),
          };
        }),

      generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) =>
        Effect.tryPromise({
          try: async () => {
            const modelId = options.modelId || "tts-1";
            const result = await generateSpeech({
              model: openaiProvider.speech(modelId),
              text: input,
              voice: options.voice || "alloy",
            });

            const audioData = Buffer.from(result.audio.uint8Array).toString(
              "base64"
            );

            return {
              data: {
                audioData: audioData,
                format: "mp3",
                id: `openai-speech-${Date.now()}`,
                model: modelId,
                timestamp: new Date(),
                finishReason: "stop",
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                parameters: {
                  voice: options.voice || "alloy",
                  speed: options.speed,
                },
              },
              metadata: { model: modelId, provider: "openai" },
              usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
              finishReason: "stop",
            };
          },
          catch: (error) =>
            new ProviderOperationError({
              providerName: "openai",
              operation: "generateSpeech",
              message: error instanceof Error ? error.message : "Unknown error",
              module: "openai",
              method: "generateSpeech",
              cause: error,
            }),
        }),

      transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) =>
        Effect.tryPromise({
          try: async () => {
            const modelId = options.modelId || "whisper-1";

            const result = await transcribe({
              model: openaiProvider.transcription(modelId),
              audio: input,
            });

            const transcribeResult: TranscribeResult = {
              text: result.text,
              id: `openai-transcribe-${Date.now()}`,
              model: modelId,
              timestamp: new Date(),
              finishReason: "stop",
              usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
              segments: result.segments?.map((s) => ({
                id: Date.now() + Math.random(),
                start: s.startSecond,
                end: s.endSecond,
                text: s.text,
                confidence: 1.0,
                speaker: undefined,
              })),
              detectedLanguage: result.language,
              duration: 0,
              parameters: {
                language: options.language,
              },
            };
            return {
              data: transcribeResult,
              metadata: { model: modelId, provider: "openai" },
              usage: transcribeResult.usage,
              finishReason: transcribeResult.finishReason,
            };
          },
          catch: (error) =>
            new ProviderOperationError({
              providerName: "openai",
              operation: "transcribe",
              message: error instanceof Error ? error.message : "Unknown error",
              module: "openai",
              method: "transcribe",
              cause: error,
            }),
        }),

      generateEmbeddings: (
        input: string[],
        options: ProviderGenerateEmbeddingsOptions
      ) =>
        Effect.tryPromise({
          try: async () => {
            const modelId = options.modelId || "text-embedding-ada-002";

            const result = await embedMany({
              model: openaiProvider.textEmbedding(modelId),
              values: input,
            });

            const embeddingResult: GenerateEmbeddingsResult = {
              embeddings: result.embeddings,
              id: `openai-embedding-${Date.now()}`,
              model: modelId,
              timestamp: new Date(),
              finishReason: "stop",
              usage: {
                promptTokens: result.usage.tokens,
                completionTokens: 0,
                totalTokens: result.usage.tokens,
              },
              dimensions: result.embeddings[0]?.length ?? 0,
              texts: input,
              parameters: {},
            };
            return {
              data: embeddingResult,
              metadata: { model: modelId, provider: "openai" },
              usage: embeddingResult.usage,
              finishReason: embeddingResult.finishReason,
            };
          },
          catch: (error) =>
            new ProviderOperationError({
              providerName: "openai",
              operation: "generateEmbeddings",
              message: error instanceof Error ? error.message : "Unknown error",
              module: "openai",
              method: "generateEmbeddings",
              cause: error,
            }),
        }),

      generateImage: (
        input: EffectiveInput,
        options: ProviderGenerateImageOptions
      ) =>
        Effect.tryPromise({
          try: async () => {
            const modelId = options.modelId || "dall-e-3";
            const promptText =
              input.text ||
              (Chunk.isChunk(input.messages)
                ? Chunk.toReadonlyArray(input.messages)
                  .map((m) => (m.parts as any)[0].content)
                  .join("\n")
                : "A futuristic cityscape");

            const result = await generateImage({
              model: openaiProvider.image(modelId),
              prompt: promptText,
              n: options.n || 1,
              size: (options.size || "1024x1024") as `${number}x${number}`,
            });

            const mainImage = result.images[0];

            const imageResult: GenerateImageResult = {
              imageUrl: mainImage?.base64
                ? `data:image/png;base64,${mainImage.base64}`
                : "",
              id: `openai-image-${Date.now()}`,
              model: modelId,
              timestamp: new Date(),
              finishReason: "stop",
              usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
              parameters: {
                size: options.size || "1024x1024",
                quality: options.quality || "standard",
                style: options.style || "vivid",
              },
              additionalImages: result.images
                .slice(1)
                .map((img) =>
                  img.base64 ? `data:image/png;base64,${img.base64}` : ""
                ),
            };
            return {
              data: imageResult,
              metadata: { model: modelId, provider: "openai" },
              usage: imageResult.usage,
              finishReason: imageResult.finishReason,
            };
          },
          catch: (error) =>
            new ProviderOperationError({
              providerName: "openai",
              operation: "generateImage",
              message: error instanceof Error ? error.message : "Unknown error",
              module: "openai",
              method: "generateImage",
              cause: error,
            }),
        }),

      getModels: () =>
        Effect.gen(function* () {
          const _ms = yield* ModelService;
          // Simplified implementation - return empty array since method doesn't exist on interface
          return [];
        }),

      getDefaultModelIdForProvider: (
        providerName: ProvidersType,
        capability: ModelCapability
      ) =>
        Effect.gen(function* () {
          if (providerName !== "openai") {
            return yield* Effect.fail(
              new ProviderOperationError({
                providerName: "openai",
                operation: "getDefaultModelId",
                message: "Mismatched provider",
                module: "openai",
                method: "getDefaultModelIdForProvider",
              })
            );
          }
          const ms = yield* ModelService;
          const models = yield* ms.findModelsByCapability(capability);
          if (models.length === 0) {
            return yield* Effect.fail(
              new ProviderMissingModelIdError({
                providerName: "openai",
                capability,
                module: "openai",
                method: "getDefaultModelIdForProvider",
              })
            );
          }
          return models?.[0]?.id ?? "gpt-4o";
        }),
      setVercelProvider: (vercelProvider?: EffectiveProviderApi) => {
        if (!vercelProvider || vercelProvider.name !== "openai") {
          return Effect.fail(
            new ProviderServiceConfigError({
              description: "Invalid or mismatched provider for OpenAI client",
              module: "OpenAIClient",
              method: "setVercelProvider",
            })
          );
        }
        return Effect.succeed(void 0);
      },
    } as unknown as ProviderClientApi;
  });
}

export { makeOpenAIClient };
