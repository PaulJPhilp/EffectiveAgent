/**
 * @file Embedding service exports
 * @module services/pipeline/producers/embedding
 */

export type { EmbeddingGenerationOptions, EmbeddingServiceApi } from "./api.js";
export {
    EmbeddingError, EmbeddingGenerationError,
    EmbeddingInputError, EmbeddingModelError,
    EmbeddingProviderError, type EmbeddingServiceError
} from "./errors.js";
export { EmbeddingService, type EmbeddingAgentState } from "./service.js";

