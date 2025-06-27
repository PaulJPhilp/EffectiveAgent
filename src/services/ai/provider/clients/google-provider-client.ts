import { EffectiveMessage, ModelCapability, TextPart, ToolCallPart } from "@/schema.js";
import type { EffectiveInput, EffectiveResponse, FinishReason, ProviderEffectiveResponse } from "@/types.js";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
    LanguageModelV1,
    type LanguageModelV1CallOptions,
    type LanguageModelV1CallWarning,
    type LanguageModelV1FinishReason,
    type LanguageModelV1StreamPart
} from "@ai-sdk/provider";
import { generateObject, generateText } from "ai";
import { Chunk, Effect, Either, Option } from "effect";

import { ModelService } from "@/services/ai/model/service.js";
import { ToolService } from "@/services/ai/tools/service.js";
import { z } from "zod";
import type { ModelServiceApi } from "../../model/api.js";
import type { ToolRegistryApi } from "../../tool-registry/api.js";
import type { FullToolName } from '../../tools/types.js';
import type { ProviderClientApi } from "../api.js";
import {
    ProviderMissingCapabilityError,
    ProviderNotFoundError,
    ProviderOperationError,
    ProviderServiceConfigError,
    ProviderToolError
} from "../errors.js";
import { ProvidersType } from "../schema.js";
import type {
    ChatResult,
    EffectiveProviderApi,
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

const MAX_TOOL_ITERATIONS = 5;
const DEFAULT_MODEL_ID = "gemini-1.5-flash-latest";

function mapFinishReason(finishReason?: string | null): FinishReason {
    if (!finishReason) return "stop";
    switch (finishReason) {
        case "stop": return "stop";
        case "length": return "length";
        case "content-filter":
        case "content_filter": return "content_filter";
        case "tool-calls":
        case "tool_calls": return "tool_calls";
        case "error": return "error";
        default: return "stop";
    }
}

interface GoogleMessage {
    role: "user" | "assistant" | "system" | "tool";
    content: string | any[];
    toolCalls?: Array<{
        toolCallId: string;
        toolName: string;
        args: any;
    }>;
}

function mapEAMessagesToGoogleMessages(eaMessages: ReadonlyArray<EffectiveMessage>): GoogleMessage[] {
    return eaMessages.map(msg => {
        const messageParts = Chunk.toReadonlyArray(msg.parts);
        const textContent = messageParts.filter(TextPart.is).map(part => part.content).join("\n");
        const toolCallParts = messageParts.filter(ToolCallPart.is);

        switch (msg.role) {
            case "user":
            case "system":
                return { role: msg.role, content: textContent };
            case "assistant":
                if (toolCallParts.length > 0) {
                    return {
                        role: "assistant",
                        content: textContent,
                        toolCalls: toolCallParts.map(tcp => ({
                            toolCallId: tcp.id,
                            toolName: tcp.name,
                            args: tcp.args
                        }))
                    };
                }
                return { role: "assistant", content: textContent };
            case "tool":
                return {
                    role: "tool",
                    content: []
                };
            default:
                return { role: "user", content: textContent };
        }
    });
}

function mapGoogleMessageToEAEffectiveMessage(googleMsg: GoogleMessage, modelId: string): EffectiveMessage {
    const eaParts: Array<TextPart | ToolCallPart> = [];

    if (typeof googleMsg.content === "string" && googleMsg.content.length > 0) {
        eaParts.push(new TextPart({ _tag: "Text", content: googleMsg.content }));
    }

    if (googleMsg.toolCalls) {
        for (const toolCall of googleMsg.toolCalls) {
            eaParts.push(new ToolCallPart({
                _tag: "ToolCall",
                id: toolCall.toolCallId,
                name: toolCall.toolName as FullToolName,
                args: toolCall.args
            }));
        }
    }

    return new EffectiveMessage({
        role: googleMsg.role === "tool" ? "tool" : googleMsg.role,
        parts: Chunk.fromIterable(eaParts)
    });
}

export function makeGoogleClient(apiKey: string): Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError, ModelServiceApi | ToolRegistryApi> {
    return Effect.gen(function* () {
        const modelService = yield* ModelService;
        const googleProvider = createGoogleGenerativeAI({ apiKey });

        function getModel(id: string) {
            return googleProvider(id);
        }

        const clientImplementation: ProviderClientApi = {
            // Required interface methods, but not used since we delegate to ToolService
            validateToolInput: (_toolName: FullToolName, input: unknown) =>
                Effect.succeed(input) as Effect.Effect<unknown, ProviderToolError, never>,

            executeTool: (_toolName: FullToolName, _input: unknown) =>
                Effect.fail(new ProviderToolError({
                    description: 'Tool execution is handled by ToolService',
                    module: 'GoogleClient',
                    method: 'executeTool'
                })),

            processToolResult: (_toolName: FullToolName, _result: unknown) =>
                Effect.fail(new ProviderToolError({
                    description: 'Tool result processing is handled by ToolService',
                    module: 'GoogleClient',
                    method: 'processToolResult'
                })),

            getProvider: () => Effect.succeed(googleProvider as any),
            getCapabilities: () => Effect.succeed(new Set<ModelCapability>([
                "chat",
                "text-generation",
                "code-generation",
                "embeddings",
                "image-generation",
                "audio",
                "function-calling"
            ])),

            generateText: (effectiveInput: EffectiveInput, options: ProviderGenerateTextOptions) => Effect.gen(function* () {
                const modelId = options.modelId ?? DEFAULT_MODEL_ID;

                const messages: any[] = [];
                if (options.system) {
                    messages.push({ role: "system", content: options.system });
                }
                messages.push({ role: "user", content: effectiveInput.text });

                const result = yield* Effect.tryPromise({
                    try: () => generateText({
                        messages,
                        model: getModel(modelId),
                        temperature: options.parameters?.temperature,
                        maxTokens: options.parameters?.maxTokens,
                        topP: options.parameters?.topP,
                        frequencyPenalty: options.parameters?.frequencyPenalty,
                        presencePenalty: options.parameters?.presencePenalty,
                        seed: options.parameters?.seed
                    }),
                    catch: (error) => new ProviderOperationError({
                        providerName: "google",
                        operation: "generateText",
                        message: `Failed to generate text: ${String(error)}`,
                        module: "GoogleClient",
                        method: "generateText",
                        cause: error
                    })
                });

                const textResult: GenerateTextResult = {
                    id: `google-text-${Date.now()}`,
                    text: result.text,
                    model: modelId,
                    timestamp: new Date(),
                    finishReason: mapFinishReason(result.finishReason),
                    usage: result.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                };

                const response: EffectiveResponse<GenerateTextResult> = {
                    data: textResult,
                    metadata: {
                        model: modelId,
                        provider: "google",
                        requestId: `google-text-${Date.now()}`,
                        messageCount: messages.length,
                        hasSystemPrompt: !!options.system
                    },
                    usage: textResult.usage,
                    finishReason: textResult.finishReason
                };

                return response;
            }),

            chat: (effectiveInput: EffectiveInput, options: ProviderChatOptions): Effect.Effect<ProviderEffectiveResponse<ChatResult>, ProviderOperationError | ProviderServiceConfigError | ProviderToolError, ToolRegistryApi> =>
                Effect.gen(function* () {
                    const modelId = options.modelId ?? DEFAULT_MODEL_ID;

                    let messages: any[] = [];
                    if (options.system) {
                        messages.push({ role: "system", content: options.system });
                    }

                    // Add current input
                    messages.push({ role: "user", content: effectiveInput.text });

                    let iteration = 0;
                    let currentMessages = [...messages];

                    while (iteration < MAX_TOOL_ITERATIONS) {
                        const result = yield* Effect.tryPromise({
                            try: () => generateText({
                                messages: currentMessages,
                                model: getModel(modelId),
                                temperature: options.parameters?.temperature,
                                tools: options.tools ? Object.fromEntries(
                                    Object.entries(options.tools).map(([name, tool]) => [
                                        name,
                                        {
                                            description: (tool as any).description || "",
                                            parameters: (tool as any).parameters || z.object({})
                                        }
                                    ])
                                ) : undefined
                            }),
                            catch: (error: unknown) => {
                                if (error instanceof Error) {
                                    return new ProviderOperationError({
                                        providerName: "google",
                                        operation: "chat",
                                        message: `Failed to generate chat response: ${error.message}`,
                                        module: "GoogleClient",
                                        method: "chat",
                                        cause: error
                                    });
                                } else {
                                    return new ProviderOperationError({
                                        providerName: "google",
                                        operation: "chat",
                                        message: `Failed to generate chat response: ${String(error)}`,
                                        module: "GoogleClient",
                                        method: "chat",
                                        cause: error
                                    });
                                }
                            }
                        });

                        // Convert result to EffectiveMessage
                        const responseMessage = mapGoogleMessageToEAEffectiveMessage({
                            role: "assistant",
                            content: result.text,
                            toolCalls: result.toolCalls
                        }, modelId);

                        const responseMessages = Chunk.of(responseMessage);

                        // Check if there are tool calls to execute
                        if (result.toolCalls && result.toolCalls.length > 0) {
                            const toolResults = yield* Effect.forEach(result.toolCalls, (toolCall) =>
                                Effect.gen(function* () {
                                    yield* Effect.logDebug(`Executing tool: ${toolCall.toolName}`);

                                    // Use ToolService for tool execution
                                    const fullToolName = `e2e-tools:${toolCall.toolName}` as const;
                                    const toolService = yield* ToolService;
                                    const toolResult = yield* Effect.either(
                                        toolService.run(fullToolName, toolCall.args)
                                    );

                                    const processedResult = Either.match(toolResult, {
                                        onLeft: (error) => ({
                                            error: `Tool ${toolCall.toolName} execution failed: ${String(error)}`
                                        }),
                                        onRight: (result) => result
                                    });

                                    return {
                                        type: "tool-result" as const,
                                        toolCallId: toolCall.toolCallId,
                                        toolName: toolCall.toolName as FullToolName,
                                        result: processedResult
                                    };
                                }).pipe(
                                    Effect.catchAll((error: unknown) => Effect.succeed({
                                        type: "tool-result" as const,
                                        toolCallId: toolCall.toolCallId,
                                        toolName: toolCall.toolName as FullToolName,
                                        result: { error: typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error) }
                                    }))
                                )
                            );

                            // Add tool results to conversation
                            currentMessages.push({
                                role: "assistant",
                                content: result.text,
                                toolCalls: result.toolCalls
                            });
                            currentMessages.push({
                                role: "tool",
                                content: toolResults
                            });

                            iteration++;
                            continue;
                        }

                        // No tool calls, return final response
                        yield* Effect.logDebug(`Chat completed after ${iteration + 1} iterations`);
                        const chatResult: GenerateTextResult = {
                            id: `google-chat-${Date.now()}`,
                            text: result.text,
                            model: modelId,
                            timestamp: new Date(),
                            finishReason: mapFinishReason(result.finishReason),
                            usage: result.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                        };

                        return yield* Effect.succeed({
                            data: chatResult,
                            metadata: {
                                model: modelId,
                                provider: "google",
                                requestId: `google-chat-${Date.now()}`
                            },
                            usage: chatResult.usage,
                            finishReason: chatResult.finishReason,
                            effectiveMessage: Option.some(responseMessage)
                        });
                    }

                    // Max iterations reached
                    yield* Effect.logWarning(`Maximum tool iterations (${MAX_TOOL_ITERATIONS}) reached`);
                    return yield* Effect.fail(new ProviderOperationError({
                        providerName: "google",
                        operation: "chat",
                        message: `Maximum tool iterations (${MAX_TOOL_ITERATIONS}) reached`,
                        module: "GoogleClient",
                        method: "chat"
                    }));
                }),

            setVercelProvider: (vercelProvider: EffectiveProviderApi) => Effect.void,

            generateObject: <T = unknown>(effectiveInput: EffectiveInput, options: ProviderGenerateObjectOptions<T>): Effect.Effect<EffectiveResponse<GenerateObjectResult<T>>, ProviderOperationError | ProviderServiceConfigError> =>
                Effect.gen(function* () {
                    const modelId = options.modelId ?? DEFAULT_MODEL_ID;

                    const messages: any[] = [];
                    if (options.system) {
                        messages.push({ role: "system", content: options.system });
                    }
                    messages.push({ role: "user", content: effectiveInput.text });

                    const result = yield* Effect.tryPromise({
                        try: () => generateObject({
                            messages,
                            model: getModel(modelId),
                            output: "no-schema",
                            temperature: options.parameters?.temperature,
                            maxTokens: options.parameters?.maxTokens,
                            topP: options.parameters?.topP,
                            frequencyPenalty: options.parameters?.frequencyPenalty,
                            presencePenalty: options.parameters?.presencePenalty,
                            seed: options.parameters?.seed
                        }),
                        catch: (error) => new ProviderOperationError({
                            providerName: "google",
                            operation: "generateObject",
                            message: `Failed to generate object: ${error instanceof Error ? error.message : String(error)}`,
                            module: "GoogleClient",
                            method: "generateObject",
                            cause: error
                        })
                    });

                    // We know the object is validated by the schema, so it's safe to cast
                    const validatedObject = result.object as T;

                    const objectResult: GenerateObjectResult<T> = {
                        id: `google-object-${Date.now()}`,
                        object: validatedObject,
                        model: modelId,
                        timestamp: new Date(),
                        finishReason: mapFinishReason(result.finishReason),
                        usage: result.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                    };

                    return {
                        data: objectResult,
                        metadata: {
                            model: modelId,
                            provider: "google",
                            requestId: `google-object-${Date.now()}`,
                            messageCount: messages.length,
                            hasSystemPrompt: !!options.system
                        },
                        usage: objectResult.usage,
                        finishReason: objectResult.finishReason
                    };
                }),

            generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) =>
                Effect.fail(new ProviderOperationError({
                    providerName: "google",
                    operation: "generateSpeech",
                    message: "Speech generation not implemented for Google provider",
                    module: "GoogleClient",
                    method: "generateSpeech"
                })),

            transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) =>
                Effect.fail(new ProviderOperationError({
                    providerName: "google",
                    operation: "transcribe",
                    message: "Transcription not implemented for Google provider",
                    module: "GoogleClient",
                    method: "transcribe"
                })),

            generateEmbeddings: (input: string[], options: ProviderGenerateEmbeddingsOptions) =>
                Effect.fail(new ProviderOperationError({
                    providerName: "google",
                    operation: "generateEmbeddings",
                    message: "Embeddings not implemented for Google provider",
                    module: "GoogleClient",
                    method: "generateEmbeddings"
                })),

            generateImage: (input: EffectiveInput, options: ProviderGenerateImageOptions) =>
                Effect.fail(new ProviderMissingCapabilityError({
                    providerName: "google",
                    capability: "image-generation",
                    module: "GoogleClient",
                    method: "generateImage"
                })),

            getModels: (): Effect.Effect<LanguageModelV1[], ProviderServiceConfigError, ModelServiceApi> =>
                Effect.gen(function* () {
                    const models = yield* modelService.getModelsForProvider("google");
                    // Convert readonly array to mutable array and map to LanguageModelV1
                    return models.map((model): LanguageModelV1 => ({
                        modelId: model.id,
                        provider: "google",
                        specificationVersion: "v1",
                        defaultObjectGenerationMode: "json",
                        doGenerate: async (options: LanguageModelV1CallOptions) => {
                            const result = await generateText({
                                messages: Array.isArray(options.prompt) ? options.prompt : [options.prompt],
                                model: getModel(model.id),
                                temperature: options.temperature,
                                maxTokens: options.maxTokens,
                                topP: options.topP,
                                frequencyPenalty: options.frequencyPenalty,
                                presencePenalty: options.presencePenalty,
                                seed: options.seed
                            });
                            return {
                                text: result.text,
                                reasoning: [{ type: "text", text: result.text }],
                                finishReason: result.finishReason as LanguageModelV1FinishReason,
                                usage: {
                                    promptTokens: result.usage?.promptTokens ?? 0,
                                    completionTokens: result.usage?.completionTokens ?? 0,
                                    totalTokens: result.usage?.totalTokens ?? 0
                                },
                                rawCall: {
                                    rawPrompt: options.prompt,
                                    rawSettings: {
                                        temperature: options.temperature,
                                        maxTokens: options.maxTokens,
                                        topP: options.topP
                                    } as Record<string, unknown>
                                },
                                rawResponse: { headers: {} },
                                request: { body: JSON.stringify(options.prompt) },
                                warnings: [] as LanguageModelV1CallWarning[]
                            };
                        },
                        doStream: async (options: LanguageModelV1CallOptions) => {
                            const result = await generateText({
                                messages: Array.isArray(options.prompt) ? options.prompt : [options.prompt],
                                model: getModel(model.id),
                                temperature: options.temperature,
                                maxTokens: options.maxTokens,
                                topP: options.topP,
                                frequencyPenalty: options.frequencyPenalty,
                                presencePenalty: options.presencePenalty,
                                seed: options.seed
                            });
                            const stream = new ReadableStream<LanguageModelV1StreamPart>({
                                start(controller) {
                                    controller.enqueue({ type: "text-delta", textDelta: result.text });
                                    controller.close();
                                }
                            });
                            return {
                                stream,
                                rawCall: {
                                    rawPrompt: options.prompt,
                                    rawSettings: {
                                        temperature: options.temperature,
                                        maxTokens: options.maxTokens,
                                        topP: options.topP
                                    } as Record<string, unknown>
                                },
                                rawResponse: { headers: {} },
                                request: { body: JSON.stringify(options.prompt) },
                                warnings: [] as LanguageModelV1CallWarning[]
                            };
                        }
                    }));
                }),

            getDefaultModelIdForProvider: (providerName: ProvidersType, capability: ModelCapability) =>
                Effect.gen(function* () {
                    if (providerName !== "google") {
                        return yield* Effect.fail(new ProviderServiceConfigError({
                            description: `Invalid provider: ${providerName}`,
                            module: "GoogleClient",
                            method: "getDefaultModelIdForProvider"
                        }));
                    }
                    return DEFAULT_MODEL_ID;
                })
        };

        return clientImplementation;
    });
}


