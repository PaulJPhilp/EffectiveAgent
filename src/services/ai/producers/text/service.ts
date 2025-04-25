/**
 * @file Implements the TextService for handling AI text generation using the ProviderService.
 * @module services/ai/producers/text/service
 */

import { EffectiveInput } from '@/services/ai/input/service.js';
import { ModelService, type ModelServiceApi } from "@/services/ai/model/service.js";
import { ProviderService, ProviderServiceApi } from "@/services/ai/provider/service.js";
import { AiError } from "@effect/ai/AiError";
import { Message } from "@effect/ai/AiInput";
import { AiResponse } from "@effect/ai/AiResponse";
import { Layer } from "effect";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type { Span } from "effect/Tracer";
import { TextGenerationError, TextModelError, TextProviderError } from "./errors.js";

/**
 * Result shape expected from the underlying provider client's generateText method
 */
export interface ProviderTextGenerationResult {
    readonly data: {
        readonly text: string;
        readonly reasoning?: string;
        readonly reasoningDetails?: unknown;
        readonly sources?: unknown[];
        readonly messages?: unknown[];
        readonly warnings?: unknown[];
    };
    readonly metadata: {
        readonly usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
        readonly finishReason: string;
        readonly model: string;
        readonly timestamp: Date;
        readonly id: string;
    };
}

/**
 * Options for text generation
 */
export interface TextGenerationOptions {
    /** The model ID to use */
    readonly modelId?: string;
    /** The text prompt to process */
    readonly prompt: string;
    /** The system prompt or instructions */
    readonly system: Option.Option<string>;
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
 * TextService interface for handling AI text generation
 */
export interface TextServiceApi {
    readonly generate: (options: TextGenerationOptions) => Effect.Effect<AiResponse, AiError>;
}

/**
 * TextService provides methods for generating AI text responses using configured providers.
 */
export class TextService extends Effect.Service<TextServiceApi>()("TextService", {
    effect: Effect.gen(function* () {
        // Get services
        const providerService: ProviderServiceApi = yield* ProviderService;
        const modelService: ModelServiceApi = yield* ModelService;

        return {
            generate: (options: TextGenerationOptions) =>
                Effect.gen(function* () {
                    // Get model ID or fail
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                        Effect.mapError(() => new TextModelError("Model ID must be provided"))
                    );

                    // Get provider name from model service
                    const providerName = yield* modelService.getProviderName(modelId).pipe(
                        Effect.mapError((error) => new TextProviderError("Failed to get provider name for model", { cause: error }))
                    );

                    // Get provider client
                    const providerClient = yield* providerService.getProviderClient(providerName).pipe(
                        Effect.mapError((error) => new TextProviderError("Failed to get provider client", { cause: error }))
                    );

                    // If system prompt is provided, prepend it to the prompt
                    let finalPrompt = options.prompt;
                    const systemPrompt = Option.getOrUndefined(options.system);
                    if (systemPrompt) {
                        finalPrompt = `${systemPrompt}\n\n${finalPrompt}`;
                    }

                    yield* Effect.annotateCurrentSpan("ai.provider.name", providerName);
                    yield* Effect.annotateCurrentSpan("ai.model.name", modelId);

                    // Create EffectiveInput from the final prompt
                    const effectiveInput = new EffectiveInput(Chunk.make(Message.fromInput(finalPrompt)));

                    // Call Vercel AI SDK's generateText function via providerClient
                    const result = yield* Effect.promise(
                        (): Promise<ProviderTextGenerationResult> => Effect.runPromise(providerClient.generateText(
                            effectiveInput,
                            {
                                modelId,
                                system: systemPrompt,
                                ...options.parameters
                            }
                        ))
                    ).pipe(
                        Effect.mapError((error) => new TextGenerationError("Text generation failed", { cause: error }))
                    );

                    // Map the result to AiResponse
                    return {
                        text: result.data.text,
                        reasoning: result.data.reasoning,
                        reasoningDetails: result.data.reasoningDetails,
                        sources: result.data.sources,
                        messages: result.data.messages,
                        warnings: result.data.warnings,
                        usage: result.metadata.usage,
                        finishReason: result.metadata.finishReason,
                        model: result.metadata.model,
                        timestamp: result.metadata.timestamp,
                        id: result.metadata.id
                    };
                }).pipe(
                    Effect.withSpan("TextService.generate")
                )
        };
    })
}) { }

/**
 * Default Layer for TextService
 */
export const TextServiceLive = Layer.effect(
    TextService,
    TextService
); 