import type { AgentRuntime } from "@/agent-runtime/types.js";
import type { GenerateEmbeddingsResult } from "@/services/ai/provider/types.js";
import { Effect } from "effect";
import type { EmbeddingGenerationError, EmbeddingInputError, EmbeddingModelError, EmbeddingProviderError } from "./errors.js";
import type { EmbeddingAgentState } from "./service.js";

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

    /**
     * Get the current agent state for monitoring/debugging
     * @returns Effect that resolves to the current EmbeddingAgentState
     */
    getAgentState: () => Effect.Effect<EmbeddingAgentState, Error>;

    /**
     * Get the agent runtime for advanced operations
     * @returns The AgentRuntime instance
     */
    getRuntime: () => AgentRuntime<EmbeddingAgentState>;

    /**
     * Terminate the embedding service agent
     * @returns Effect that resolves when termination is complete
     */
    terminate: () => Effect.Effect<void, Error>;
}
