/**
 * @file Text service specific error types
 * @module services/ai/producers/text/errors
 */

import { AIError } from "@/services/ai/errors.js";

/**
 * Error thrown when there are issues with text model configuration or access
 */
export class TextModelError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "text_model_error",
            name: "TextModelError",
            module: "TextService",
            method: "generate"
        })
    }
}

/**
 * Error thrown when there are issues with text provider configuration or access
 */
export class TextProviderError extends AIError {
    constructor(message: string, options?: ErrorOptions & {
        status?: number;
        response?: unknown;
    }) {
        super(message, {
            ...options,
            code: "text_provider_error",
            name: "TextProviderError",
            module: "TextService",
            method: "generate"
        })
    }
}

/**
 * Error thrown when the text generation request fails
 */
export class TextGenerationError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "text_generation_error",
            name: "TextGenerationError",
            module: "TextService",
            method: "generate"
        })
    }
} 