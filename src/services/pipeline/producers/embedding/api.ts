import type { Effect } from "effect";
import type { EmbeddingGenerationOptions, EmbeddingGenerationResult } from "@/services/ai/producers/embedding/service.js";
import type { EmbeddingInputError, EmbeddingModelError, EmbeddingProviderError } from "@/services/ai/producers/embedding/errors.js";

/**
 * EmbeddingService interface for generating vector embeddings.
 */
export interface EmbeddingServiceApi {
    /**
     * Generates vector embeddings for the given input using the configured AI provider and model.
     *
     * @param options - The generation options, including input (string or string[]), modelId, and span.
     * @returns Effect that resolves to an EmbeddingGenerationResult on success, or fails with an AiError on error.
     * @throws {EmbeddingInputError} If the input is empty or invalid.
     * @throws {EmbeddingModelError} If the model service fails.
     * @throws {EmbeddingProviderError} If the provider service fails.
     */
    readonly generate: (
        options: EmbeddingGenerationOptions
    ) => Effect.Effect<EmbeddingGenerationResult, EmbeddingInputError | EmbeddingModelError | EmbeddingProviderError>;
}
