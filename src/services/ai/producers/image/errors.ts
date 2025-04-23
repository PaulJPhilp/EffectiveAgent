/**
 * @file Image service specific error types
 * @module services/ai/producers/image/errors
 */

import { AIError } from "@/services/ai/errors.js";

/**
 * Error thrown when there are issues with image model configuration or access
 */
export class ImageModelError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "image_model_error",
            name: "ImageModelError",
            module: "ImageService",
            method: "generate"
        })
    }
}

/**
 * Error thrown when there are issues with image provider configuration or access
 */
export class ImageProviderError extends AIError {
    constructor(message: string, options?: ErrorOptions & {
        status?: number;
        response?: unknown;
    }) {
        super(message, {
            ...options,
            code: "image_provider_error",
            name: "ImageProviderError",
            module: "ImageService",
            method: "generate"
        })
    }
}

/**
 * Error thrown when the image generation request fails
 */
export class ImageGenerationError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "image_generation_error",
            name: "ImageGenerationError",
            module: "ImageService",
            method: "generate"
        })
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