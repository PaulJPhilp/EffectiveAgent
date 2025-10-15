/**
 * @file Text service specific error types
 * @module services/ai/producers/text/errors
 */

import { EffectiveError } from "@/errors.js";

/**
 * Error thrown when there are issues with text model configuration or access.
 * @extends EffectiveError
 */
export class TextModelError extends EffectiveError {
}

/**
 * Error thrown when there are issues with text provider configuration or access.
 * @extends EffectiveError
 */
export class TextProviderError extends EffectiveError {
    public readonly status?: number;
    public readonly response?: unknown;
    constructor(params: { status?: number; response?: unknown; description: string; module: string; method: string; cause?: unknown }) {
        super(params);
        this.status = params.status;
        this.response = params.response;
    }
}

/**
 * Error thrown when the text generation request fails.
 * @extends EffectiveError
 */
export class TextGenerationError extends EffectiveError {
}

/**
 * Error thrown when the text generation request fails.
 * @extends EffectiveError
 */
export class TextInputError extends EffectiveError {
}

// Custom error for text completion
export class TextCompletionError extends EffectiveError {
  constructor(params: { description: string; cause?: unknown }) {
    super({ ...params, module: "TextCompletionPipeline", method: "unknown" }); // Consider updating module/method if this is producer-specific
  }
}

/**
 * Union type of all text-related errors.
 */
export type TextServiceError =
  | TextModelError
  | TextProviderError
  | TextGenerationError
  | TextInputError
  | TextCompletionError;