/**
 * @file Implements the ChatService for handling AI chat interactions using the ProviderService.
 * @module services/ai/producers/chat/service
 */

import { Message, TextPart } from "@/schema.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { EffectiveInput, EffectiveResponse } from "@/types.js";
import { Effect } from "effect";
import * as Chunk from "effect/Chunk";
import { ProviderServiceConfigError, ProviderMissingCapabilityError, ProviderOperationError } from "@/services/ai/provider/errors.js";
import type { GenerateTextResult, ProviderGenerateTextOptions, ToolCallRequest } from "@/services/ai/provider/types.js";
import { ChatCompletionError, ChatInputError, ChatModelError, ChatProviderError } from "./errors.js";
import type { ChatCompletionOptions, ChatCompletionResult, ChatServiceApi, ToolCall } from "./types.js";

/**
 * Chat service implementation
 */
export { ChatCompletionOptions };

const chatServiceEffect = Effect.succeed({
    create: (options: ChatCompletionOptions) => Effect.gen(function* () {
        // Validate input
        if (!options.input?.trim()) {
            return yield* Effect.fail(new ChatInputError({
                description: "Input text is required",
                module: "ChatService",
                method: "create"
            }));
        }

        // Create message
        const textPart = new TextPart({ _tag: "Text", content: options.input });
        const message = new Message({
            role: "user",
            parts: Chunk.make(textPart)
        });

        // Create input
        const effectiveInput = new EffectiveInput(
            options.input,
            Chunk.make(message),
            {
                operationName: "chat",
                parameters: {
                    temperature: options.parameters?.temperature ?? 0.7,
                    maxTokens: options.parameters?.maxTokens ?? 1000,
                    topP: options.parameters?.topP,
                    presencePenalty: options.parameters?.presencePenalty,
                    frequencyPenalty: options.parameters?.frequencyPenalty,
                }
            }
        );

        // Return a ChatCompletionResult
        return {
            content: options.input,
            usage: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0
            },
            finishReason: "stop",
            providerMetadata: {
                model: options.modelId,
                provider: "mock"
            },
            toolCalls: []
        };
    }),
    generate: (options: ChatCompletionOptions) => Effect.gen(function* () {
        // Validate input
        if (!options.input?.trim()) {
            return yield* Effect.fail(new ChatInputError({
                description: "Input text is required",
                module: "ChatService",
                method: "generate"
            }));
        }

        // Create message
        const textPart = new TextPart({ _tag: "Text", content: options.input });
        const message = new Message({
            role: "user",
            parts: Chunk.make(textPart)
        });

        // Create input
        const effectiveInput = new EffectiveInput(
            options.input,
            Chunk.make(message),
            {
                operationName: "chat",
                parameters: {
                    temperature: options.parameters?.temperature ?? 0.7,
                    maxTokens: options.parameters?.maxTokens ?? 1000,
                    topP: options.parameters?.topP,
                    presencePenalty: options.parameters?.presencePenalty,
                    frequencyPenalty: options.parameters?.frequencyPenalty,

                    stop: options.parameters?.stop
                }
            }
        );

        // Get model
        const modelService = yield* ModelService;
        const exists = yield* modelService.exists(options.modelId).pipe(
            Effect.mapError((error) => new ChatModelError({
                description: `Model ${options.modelId} not found`,
                module: "ChatService",
                method: "generate",
                cause: error
            }))
        );

        if (!exists) {
            return yield* Effect.fail(new ChatModelError({
                description: `Model ${options.modelId} not found`,
                module: "ChatService",
                method: "generate"
            }));
        }

        // Get provider
        const providerService = yield* ProviderService;
        const providerName = yield* modelService.getProviderName(options.modelId);
        const provider = yield* providerService.getProviderClient(providerName).pipe(
            Effect.mapError((error) => new ChatProviderError({
                description: `Provider ${providerName} not found`,
                module: "ChatService",
                method: "generate",
                cause: error
            }))
        );

        return yield* Effect.succeed({ resolvedModelId: options.modelId, providerName, effectiveInput, chatOptions: options, providerClient: provider })
            .pipe(
                Effect.flatMap(({ resolvedModelId, providerName, effectiveInput, chatOptions, providerClient }) => {
                    const providerTextOpts: ProviderGenerateTextOptions = {
                        modelId: chatOptions.modelId,
                        system: chatOptions.system,
                        parameters: chatOptions.parameters,
                    };

                    return providerClient.generateText(effectiveInput, providerTextOpts)
                        .pipe(
                            Effect.mapError((err: ProviderServiceConfigError | ProviderOperationError | ProviderMissingCapabilityError) => {
                                let op = "generateText";
                                // Use providerName from outer scope as a default
                                let pName = providerName; 
                                const mod = "ChatService";
                                const meth = "generate";

                                if (err instanceof ProviderOperationError) {
                                    op = err.operation;
                                    pName = err.providerName;
                                } else if (err instanceof ProviderMissingCapabilityError) {
                                    pName = err.providerName;
                                    op = `missing_capability: ${err.capability}`;
                                } else if (err instanceof ProviderServiceConfigError) {
                                    op = "providerConfigurationError";
                                    // pName remains the outer scope providerName
                                }

                                return new ProviderOperationError({
                                    operation: op,
                                    message: err.message || "Provider operation failed",
                                    providerName: pName,
                                    module: mod,
                                    method: meth,
                                    cause: err,
                                });
                            }),
                            Effect.map((response: EffectiveResponse<GenerateTextResult>) => {
                                const sourceProviderMeta = response.data.providerMetadata ?? {};
                                const { capabilities, configSchema, model, provider, ...restCompatibleProviderMeta } = sourceProviderMeta as any;

                                const mappedToolCalls: ToolCall[] = (response.data.toolCalls ?? []).map((req: ToolCallRequest) => {
                                    let parsedArgs: Record<string, string | number | boolean | null> = {};
                                    try {
                                        parsedArgs = JSON.parse(req.function.arguments);
                                    } catch (e) {
                                        Effect.logWarning(`Failed to parse arguments for tool call ${req.id}: ${req.function.arguments}`)
                                    }
                                    return {
                                        id: req.id,
                                        type: 'function' as const, // Ensure literal type
                                        function: {
                                            name: req.function.name,
                                            arguments: parsedArgs,
                                        },
                                    };
                                });

                                return {
                                    data: {
                                        content: response.data.text,
                                        usage: response.data.usage,
                                        finishReason: response.data.finishReason,
                                        providerMetadata: {
                                            model: resolvedModelId,
                                            provider: providerName,
                                            ...restCompatibleProviderMeta,
                                        },
                                        toolCalls: mappedToolCalls,
                                    } as ChatCompletionResult,
                                    messages: effectiveInput.messages,
                                };
                            })
                        );
                })
            )
            .pipe(
                Effect.mapError((error) => new ChatCompletionError({
                    description: "Failed to generate chat completion",
                    module: "ChatService",
                    method: "generate",
                    cause: error
                }))
            );
    }),
});

export class ChatService extends Effect.Service<ChatServiceApi>()("ChatService", {
    effect: chatServiceEffect,
    dependencies: [ModelService.Default, ProviderService.Default]
}) { }