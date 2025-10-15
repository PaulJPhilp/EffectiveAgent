import type { Effect, } from "effect";
import type { EffectiveResponse } from "@/types.js";
import type { EmbeddingAgentState } from "./service.js";
import type { EmbeddingGenerationOptions, EmbeddingGenerationResult } from "./types.js";

export type { EmbeddingGenerationOptions, EmbeddingGenerationResult };

export interface EmbeddingServiceApi {
    /**
     * Generates embeddings for the provided text input.
     * @param options Options for embedding generation, including text and modelId.
     * @returns Effect that resolves to an EffectiveResponse or fails with an EmbeddingServiceError.
     */
    readonly generate: (
        options: EmbeddingGenerationOptions
    ) => Effect.Effect<EffectiveResponse<EmbeddingGenerationResult>, Error>;

    /**
     * Get the current service state for monitoring/debugging
     * @returns Effect that resolves to the current EmbeddingAgentState
     */
    readonly getAgentState: () => Effect.Effect<EmbeddingAgentState, Error>;

    /**
     * Terminate the embedding service (resets internal state)
     * @returns Effect that resolves when termination is complete
     */
    readonly terminate: () => Effect.Effect<void, Error>;
}
