/**
 * @file Implements the ChatService for handling AI chat interactions using the ProviderService.
 * @module services/ai/producers/chat/service
 */

import type { GenerateTextResult } from "@/services/ai/provider/types.js";
import { EffectiveInput } from '@/services/ai/input/service.js';
import { ModelService } from "@/services/ai/model/service.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import { ProviderService } from "@/services/ai/provider/service.js";

import { AiError } from "@effect/ai/AiError";
import { Message } from "@effect/ai/AiInput";
import type { EffectiveResponse } from "@/services/pipeline/types/base.js";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import type * as JsonSchema from "effect/JSONSchema";
import * as Option from "effect/Option";
import type { Span } from "effect/Tracer";
import { ChatCompletionError, ChatModelError, ChatProviderError, ChatInputError } from "./errors.js";
import { mapEffectMessagesToClientCoreMessages } from "./utils.js";

/**
 * Extended options for chat interactions
 */
export interface ChatCompletionOptions {
    /** The model ID to use for the operation */
    readonly modelId: string;
    /** The system prompt or instructions */
    readonly system: Option.Option<string>;
    /** The input messages to process */
    readonly input: Chunk.NonEmptyChunk<Message>;
    /** Tools available for the model to use */
    readonly tools: Array<{
        readonly name: string;
        readonly description: string;
        readonly parameters: JsonSchema.JsonSchema7;
        readonly structured: boolean;
    }>;
    /** Whether tool use is required */
    readonly required: boolean | string;
    /** Tracing span for observability */
    readonly span: Span;
    /** Optional abort signal for cancellation */
    readonly signal?: AbortSignal;
    /** Optional parameters for model behavior */
    readonly parameters?: {
        /** Maximum tokens to generate */
        maxTokens?: number;
        /** Maximum retries on failure */
        maxRetries?: number;
        /** Temperature (0-2) */
        temperature?: number;
        /** Top-p sampling */
        topP?: number;
        /** Top-k sampling */
        topK?: number;
        /** Presence penalty */
        presencePenalty?: number;
        /** Frequency penalty */
        frequencyPenalty?: number;
        /** Random seed */
        seed?: number;
        /** Stop sequences */
        stop?: string[];
    };
}

/**
 * ChatService interface for handling AI chat interactions
 */
export interface ChatServiceApi {
    readonly create: (options: ChatCompletionOptions) => Effect.Effect<EffectiveResponse<GenerateTextResult>, AiError>;
}

/**
 * ChatService provides methods for generating AI chat responses using configured providers.
 */
export class ChatService extends Effect.Service<ChatServiceApi>()("ChatService", {
    effect: Effect.gen(function* () {
        // Get services
        const providerService = yield* ProviderService;
        const modelService: ModelServiceApi = yield* ModelService;

        return {
            create: (options: ChatCompletionOptions) =>
                Effect.gen(function* () {
                    // Validate input messages
                    if (Chunk.isEmpty(options.input)) {
                        return yield* Effect.fail(new ChatInputError({
                            description: "Input messages cannot be empty",
                            module: "ChatService",
                            method: "create"
                        }));
                    }

                    // Get model ID or fail
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                        Effect.mapError(() => new ChatModelError({
                            description: "Model ID must be provided",
                            module: "ChatService",
                            method: "create"
                        }))
                    );

                    // Get provider name from model service
                    const providerName = yield* modelService.getProviderName(modelId).pipe(
                        Effect.mapError((error) => new ChatProviderError({
                            description: "Failed to get provider name for model",
                            module: "ChatService",
                            method: "create",
                            cause: error
                        }))
                    );

                    // Get provider client
                    const providerClient = yield* providerService.getProviderClient(providerName).pipe(
                        Effect.mapError((error) => new ChatProviderError({
                            description: "Failed to get provider client",
                            module: "ChatService",
                            method: "create",
                            cause: error
                        }))
                    );

                    // Map messages
                    const messages = mapEffectMessagesToClientCoreMessages(options.input);
                    const systemPrompt = Option.getOrUndefined(options.system);

                    // Handle tool warning if needed
                    if (options.tools.length > 0) {
                        yield* Effect.logWarning("Tools are defined but may not be supported by the provider");
                    }

                    yield* Effect.annotateCurrentSpan("ai.provider.name", providerName);
                    yield* Effect.annotateCurrentSpan("ai.model.name", modelId);

                    // Create EffectiveInput instance
                    const effectiveInput = new EffectiveInput(options.input);

                    // Call provider chat method with proper options
                    const result = yield* (providerClient.chat(
                        effectiveInput,
                        {
                            modelId,
                            system: systemPrompt || "",
                            signal: options.signal,
                            parameters: {
                                maxTokens: options.parameters?.maxTokens,
                                maxRetries: options.parameters?.maxRetries,
                                temperature: options.parameters?.temperature,
                                topP: options.parameters?.topP,
                                topK: options.parameters?.topK,
                                presencePenalty: options.parameters?.presencePenalty,
                                frequencyPenalty: options.parameters?.frequencyPenalty,
                                seed: options.parameters?.seed,
                                stop: options.parameters?.stop
                            }
                        }
                    ) as Effect.Effect<EffectiveResponse<GenerateTextResult>, ChatCompletionError>).pipe(
                        Effect.mapError((error) => new ChatCompletionError({
                            description: "Chat completion failed",
                            module: "ChatService",
                            method: "create",
                            cause: error
                        }))
                    );

                    // Return the result directly
                    return {
                        data: result.data,
                        metadata: result.metadata
                    };
                }).pipe(
                    Effect.withSpan("ChatService.create")
                )
        };
    }),
    dependencies: [] as const
}) { }