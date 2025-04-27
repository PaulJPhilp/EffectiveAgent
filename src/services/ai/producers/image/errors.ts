/**
 * @file Image service specific error types
 * @module services/ai/producers/image/errors
 */

import { EffectiveError } from "@/effective-error.js";

/**
 * Error thrown when there are issues with image model configuration or access
 */
/**
 * Error thrown when there are issues with image model configuration or access.
 * @extends EffectiveError
 */
export class ImageModelError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when there are issues with image provider configuration or access
 */
/**
 * Error thrown when there are issues with image provider configuration or access.
 * @extends EffectiveError
 */
export class ImageProviderError extends EffectiveError {
    public readonly status?: number;
    public readonly response?: unknown;
    constructor(params: { status?: number; response?: unknown; description: string; module: string; method: string; cause?: unknown }) {
        super(params);
        this.status = params.status;
        this.response = params.response;
    }
}

/**
 * Error thrown when the image generation request fails
 */
/**
 * Error thrown when the image generation request fails.
 * @extends EffectiveError
 */
export class ImageGenerationError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when trying to generate an unsupported image size
 */
export class ImageSizeError extends AIError {
    constructor(message: string, options?: ErrorOptions & {
        requestedSize?: string;
        supportedSizes?: string[];
    }) {
        super(message, {
            ...options,
            code: "image_size_error",
            name: "ImageSizeError",
            module: "ImageService",
            method: "generate"
        })
    }
} 