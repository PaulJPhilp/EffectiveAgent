/**
 * @file Implements the ChatService for handling AI chat interactions using the ProviderService.
 * @module services/ai/producers/chat/service
 */

import { ModelService, type ModelServiceApi } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import type { ChatOptions } from "@/services/ai/provider/types.js";
import { AiError } from "@effect/ai/AiError";
import { Message } from "@effect/ai/AiInput";
import { AiResponse } from "@effect/ai/AiResponse";
import { Layer } from "effect";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import type * as JsonSchema from "effect/JSONSchema";
import * as Option from "effect/Option";
import type { Span } from "effect/Tracer";
import { ChatCompletionError, ChatModelError, ChatProviderError } from "./errors.js";
import { mapEffectMessagesToClientCoreMessages } from "./utils.js";

/**
 * Extended options for chat interactions
 */
export interface ChatCompletionOptions extends Omit<ChatOptions, 'messages' | 'system'> {
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
    /** Optional parameters for model behavior */
    readonly parameters?: {
        /** Maximum steps to take in generation */
        maxSteps?: number;
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
    readonly create: (options: ChatCompletionOptions) => Effect.Effect<AiResponse, AiError>;
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
                    // Get model ID or fail
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                        Effect.mapError(() => new ChatModelError("Model ID must be provided"))
                    );

                    // Get provider name from model service
                    const providerName = yield* modelService.getProviderName(modelId).pipe(
                        Effect.mapError((error) => new ChatProviderError("Failed to get provider name for model", { cause: error }))
                    );

                    // Get provider client
                    const providerClient = yield* providerService.getProviderClient(providerName).pipe(
                        Effect.mapError((error) => new ChatProviderError("Failed to get provider client", { cause: error }))
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

                    // Call provider chat method with proper options
                    const result = yield* providerClient.chat({
                        modelId,
                        messages,
                        system: systemPrompt || "",
                        onToken: options.onToken,
                        ...options.parameters
                    }).pipe(
                        Effect.mapError((error) => new ChatCompletionError("Chat completion failed", { cause: error }))
                    );

                    // Map the result to AiResponse
                    return {
                        text: result.text,
                        reasoning: result.reasoning,
                        reasoningDetails: result.reasoningDetails,
                        sources: result.sources,
                        messages: result.messages,
                        warnings: result.warnings,
                        usage: result.usage,
                        finishReason: result.finishReason,
                        model: result.model,
                        timestamp: result.timestamp,
                        id: result.id
                    };
                }).pipe(
                    Effect.withSpan("ChatService.create")
                )
        };
    })
}) { }

/**
 * Default Layer for ChatService
 */
export const ChatServiceLive = Layer.effect(
    ChatService,
    ChatService
);