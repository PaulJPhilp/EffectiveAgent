/**
 * @file Implements the TextService for handling AI text generation using the ProviderService.
 * @module services/ai/producers/text/service
 */

import { Message } from "@effect/ai/AiInput";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type { Span } from "effect/Tracer";
import { TextGenerationError, TextModelError, TextProviderError } from "./errors.js";
import { AiResponse } from "@effect/ai/AiResponse";
import type { TextServiceError } from "./errors.js";
import { AiRole } from '@effect/ai';
/**
 * TextService interface for handling AI text generation
 */
import { ProviderServiceApi } from '../../provider/api.js';
import type { TextServiceApi } from "./api.js";
import { ModelServiceApi } from "../../model/service.js";
import { TestConfig } from "effect/TestConfig";
import { EffectiveInput } from "../../input/service.js";

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
 * Dependencies for TextService.
 */
import type { AiTestConfig } from "../../test-utils/service.js";

export interface TextServiceDeps {
    readonly modelService: ModelServiceApi;
    readonly providerService: ProviderServiceApi;
    readonly config: AiTestConfig;
}

/**
 * TextService provides methods for generating AI text responses using configured providers.
 */
export class TextService implements TextServiceApi {
    constructor(private readonly deps: TextServiceDeps) { }

    /**
     * Generates a text completion from the given prompt and model.
     */
    generate(options: TextGenerationOptions): Effect.Effect<AiResponse, TextServiceError> {
        const { modelService, providerService } = this.deps;
        return Effect.gen(function* () {
            // Get model ID or fail
            const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                Effect.mapError(() => new TextModelError({
                    description: "Model ID must be provided",
                    module: "TextService",
                    method: "generate"
                }))
            );

            // Get provider name from model service
            const providerName = yield* modelService.getProviderName(modelId).pipe(
                Effect.mapError((error) => new TextProviderError({
                    description: "Failed to get provider name for model",
                    module: "TextService",
                    method: "generate",
                    cause: error
                }))
            );

            // Get provider client
            const providerClient = yield* providerService.getProviderClient(providerName).pipe(
                Effect.mapError((error) => new TextProviderError({
                    description: "Failed to get provider client",
                    module: "TextService",
                    method: "generate",
                    cause: error
                }))
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

            const result = yield* providerClient.generateText(
                effectiveInput,
                { modelId, system: systemPrompt, ...options.parameters }
            ).pipe(
                Effect.map((res) => ({
                    ...res,
                    metadata: {
                        ...res.metadata,
                        finishReason: res.metadata.finishReason ?? "unknown"
                    }
                })),
                Effect.mapError((error) => new TextGenerationError({
                    description: "Text generation failed",
                    module: "TextService",
                    method: "generate",
                    cause: error
                }))
            );

            // Map the result to AiResponse
            // You can extend this to add more parts or richer responses if needed
            return AiResponse.fromText({
                role: AiRole.model,
                content: result.data.text
            });
        }).pipe(
            Effect.withSpan("TextService.generate")
        );
    }
}

export default TextService;