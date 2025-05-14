/**
 * @file Implements the ChatService for handling AI chat interactions using the ProviderService.
 * @module services/ai/producers/chat/service
 */

import { Message, TextPart } from "@/schema.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { EffectiveInput } from "@/types.js";
import { Effect } from "effect";
import * as Chunk from "effect/Chunk";
import { ChatCompletionError, ChatInputError, ChatModelError, ChatProviderError } from "./errors.js";
import type { ChatCompletionOptions, ChatCompletionResult, ChatServiceApi } from "./types.js";

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
        // Generate completion
        return yield* provider.generateText(
            effectiveInput,
            {
                modelId: options.modelId,
                system: options.system,
                parameters: {
                    temperature: options.parameters?.temperature ?? 0.7,
                    maxTokens: options.parameters?.maxTokens ?? 1000,
                    topP: options.parameters?.topP,
                    presencePenalty: options.parameters?.presencePenalty,
                    frequencyPenalty: options.parameters?.frequencyPenalty,
                    stop: options.parameters?.stop
                },
                signal: options.signal
            }
        ).pipe(
            Effect.map((result) => ({
                data: {
                    content: result.output,
                    usage: result.usage,
                    finishReason: result.finishReason,
                    providerMetadata: result.providerMetadata,
                    toolCalls: result.toolCalls
                } as ChatCompletionResult,
                messages: effectiveInput.messages
            })),
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
    dependencies: [] // Remove problematic dependencies for now, will be added to Default layer
}) { }