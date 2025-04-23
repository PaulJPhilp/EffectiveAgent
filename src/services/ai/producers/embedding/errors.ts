/**
 * @file Error definitions for the EmbeddingService
 * @module services/ai/producers/embedding/errors
 */

import { AiServiceError } from "@/services/ai/core/errors.js";

/**
 * Base error class for embedding-related errors
 */
export class EmbeddingError extends AiServiceError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "EmbeddingError";
    }
}

/**
 * Error thrown when there's an issue with the embedding model
 */
export class EmbeddingModelError extends EmbeddingError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "EmbeddingModelError";
    }
}

/**
 * Error thrown when there's an issue with the embedding provider
 */
export class EmbeddingProviderError extends EmbeddingError {
    constructor(message: string, options?: ErrorOptions & { providerName?: string }) {
        super(message, options);
        this.name = "EmbeddingProviderError";
    }
}

/**
 * Error thrown when embedding generation fails
 */
export class EmbeddingGenerationError extends EmbeddingError {
    constructor(message: string, options?: ErrorOptions & { input?: string | string[] }) {
        super(message, options);
        this.name = "EmbeddingGenerationError";
    }
}

/**
 * Error thrown when input validation fails
 */
export class EmbeddingInputError extends EmbeddingError {
    constructor(message: string, options?: ErrorOptions & { input?: string | string[] }) {
        super(message, options);
        this.name = "EmbeddingInputError";
    }
} 