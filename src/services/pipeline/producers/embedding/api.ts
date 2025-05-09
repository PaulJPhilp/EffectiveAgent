import type { GenerateEmbeddingsResult } from "@/services/ai/provider/types.js";
import { Effect } from "effect";
import type { EmbeddingGenerationError, EmbeddingInputError, EmbeddingModelError, EmbeddingProviderError } from "./errors.js";

export interface EmbeddingGenerationOptions {
    /** Text to generate embeddings for */
    text: string;
    /** Model ID to use */
    modelId: string;
    /** Optional generation parameters */
    parameters?: Record<string, unknown>;
}

/**
 * EmbeddingService interface for generating vector embeddings.
 */
export interface EmbeddingServiceApi {
    /**
     * Generates embeddings from the given text using the specified model.
     * @param options - Options for embedding generation (text, modelId, parameters)
     * @returns Effect that resolves to embeddings or fails with an error
     */
    generate: (
        options: EmbeddingGenerationOptions
    ) => Effect.Effect<
        GenerateEmbeddingsResult,
        EmbeddingModelError | EmbeddingProviderError | EmbeddingGenerationError | EmbeddingInputError
    >;
}
