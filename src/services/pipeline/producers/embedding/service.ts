import type { ModelServiceApi } from "@/services/ai/model/api.js";
/**
 * @file Implements the EmbeddingService for generating vector embeddings from text.
 * @module services/ai/producers/embedding/service
 */
import { ModelService } from "@/services/ai/model/service.js";
import type { ProviderServiceApi } from "@/services/ai/provider/api.js";
import { ProviderConfigError, ProviderNotFoundError, ProviderOperationError } from "@/services/ai/provider/errors.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import type { LanguageModelV1 } from "@ai-sdk/provider";
import * as Effect from "effect/Effect";
import type { Span } from "effect/Tracer";
import type { EmbeddingServiceApi } from "./api.js";
import { EmbeddingInputError, EmbeddingModelError, EmbeddingProviderError } from "./errors.js";

/**
 * Options for generating embeddings
 */
interface EmbeddingGenerationOptions {
    /** Model ID to use for generating embeddings */
    modelId?: string;
    /** Input text or array of texts to generate embeddings for */
    input: string | string[];
    /** Additional parameters for the embedding generation */
    parameters?: {
        /** Number of dimensions for the embeddings */
        dimensions?: number;
        /** User identifier for billing purposes */
        user?: string;
        /** Encoding format for the embeddings */
        encoding?: string;
    };
}

/**
 * Result of embedding generation
 */
interface EmbeddingGenerationResult {
    /** Generated embeddings */
    embeddings: number[][];
    /** Model used for generation */
    model: string;
    /** Timestamp of generation */
    timestamp: Date;
    /** Unique identifier for this generation */
    id: string;
    /** Usage statistics if available */
    usage?: {
        promptTokens: number;
        totalTokens: number;
    };
}

/**
 * EmbeddingService provides methods for generating vector embeddings using AI providers.
 */
export class EmbeddingService extends Effect.Service<EmbeddingServiceApi>()(
    "EmbeddingService",
    {
        effect: Effect.gen(function* () {
            const modelService = yield* ModelService;
            const providerService = yield* ProviderService;

            const generate = (options: EmbeddingGenerationOptions) =>
                Effect.gen(function* () {
                    // Validate input
                    if (Array.isArray(options.input) && options.input.length === 0) {
                        return yield* Effect.fail(new EmbeddingInputError({
                            description: "Input array cannot be empty",
                            module: "EmbeddingService",
                            method: "generate"
                        }));
                    }

                    if (!Array.isArray(options.input) && options.input.trim() === "") {
                        return yield* Effect.fail(new EmbeddingInputError({
                            description: "Input text cannot be empty",
                            module: "EmbeddingService",
                            method: "generate"
                        }));
                    }

                    // Get model ID or fail
                    if (!options.modelId) {
                        return yield* Effect.fail(new EmbeddingModelError({
                            description: "Model ID must be provided",
                            module: "EmbeddingService",
                            method: "generate"
                        }));
                    }

                    // Get provider name from model service
                    const providerName = yield* modelService.getProviderName(options.modelId);

                    if (!providerName) {
                        return yield* Effect.fail(new EmbeddingProviderError({
                            description: "Failed to get provider name for model",
                            module: "EmbeddingService",
                            method: "generate",
                            cause: new Error("Provider name not found")
                        }));
                    }

                    // Get provider client
                    const providerClient = yield* providerService.getProviderClient(providerName);

                    if (!providerClient) {
                        return yield* Effect.fail(new EmbeddingProviderError({
                            description: "Failed to get provider client",
                            module: "EmbeddingService",
                            method: "generate",
                            cause: new Error("Provider client not found"),
                            providerName
                        }));
                    }

                    yield* Effect.annotateCurrentSpan("ai.provider.name", providerName);
                    yield* Effect.annotateCurrentSpan("ai.model.name", options.modelId);

                    // Generate the embeddings using the provider's generateEmbeddings method
                    const inputArray: string[] = Array.isArray(options.input)
                        ? options.input
                        : [options.input];

                    const response = yield* providerClient.generateEmbeddings(
                        inputArray,
                        {
                            modelId: options.modelId || "",
                            ...options.parameters
                        }
                    );
                    
                    const result = response.data;
                    
                    return {
                        embeddings: result.embeddings || [],
                        model: result.model || options.modelId || "",
                        timestamp: new Date(),
                        id: result.id || "",
                        usage: result.usage ? {
                            promptTokens: result.usage.promptTokens || 0,
                            totalTokens: result.usage.totalTokens || 0
                        } : undefined
                    } as EmbeddingGenerationResult;
                }).pipe(
                    Effect.withSpan("EmbeddingService.generate")
                );

            return { generate };
        })
    }
) {

}
