/**
 * @file Error definitions for the EmbeddingService
 * @module services/ai/producers/embedding/errors
 */

import { EffectiveError } from "@/effective-error.js";

/**
 * Base error type for embedding-related errors.
 * @extends EffectiveError
 */
export class EmbeddingError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when there's an issue with the embedding model.
 * @extends EffectiveError
 */
export class EmbeddingModelError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when there's an issue with the embedding provider.
 * @extends EffectiveError
 */
export class EmbeddingProviderError extends EffectiveError {
    public readonly providerName?: string;
    constructor(params: { providerName?: string; description: string; module: string; method: string; cause?: unknown }) {
        super(params);
        this.providerName = params.providerName;
    }
}

/**
 * Error thrown when embedding generation fails.
 * @extends EffectiveError
 */
export class EmbeddingGenerationError extends EffectiveError {
    public readonly input?: string | string[];
    constructor(params: { input?: string | string[]; description: string; module: string; method: string; cause?: unknown }) {
        super(params);
        this.input = params.input;
    }
}

/**
 * Error thrown when input validation fails.
 * @extends EffectiveError
 */
export class EmbeddingInputError extends EffectiveError {
    public readonly input?: string | string[];
    constructor(params: { input?: string | string[]; description: string; module: string; method: string; cause?: unknown }) {
        super(params);
        this.input = params.input;
    }
}

/**
 * Union type of all embedding-related errors.
 */
export type EmbeddingServiceError =
  | EmbeddingError
  | EmbeddingModelError
  | EmbeddingProviderError
  | EmbeddingGenerationError
  | EmbeddingInputError;