/**
 * @file Image service specific error types
 * @module services/ai/producers/image/errors
 */

import { EffectiveError } from "@/errors.js";

/**
 * Error thrown when there are issues with image model configuration or access
 */
/**
 * Error thrown when there are issues with image model configuration or access.
 * @extends EffectiveError
 */
export class ImageModelError extends EffectiveError {
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
}

/**
 * Error thrown when trying to generate an unsupported image size
 */
/**
 * Error thrown when trying to generate an unsupported image size
 * @extends EffectiveError
 */
export class ImageSizeError extends EffectiveError {
  public readonly requestedSize?: string;
  public readonly supportedSizes?: string[];
  constructor(params: {
    description: string;
    module: string;
    method: string;
    requestedSize?: string;
    supportedSizes?: string[];
    cause?: unknown;
  }) {
    super(params);
    this.requestedSize = params.requestedSize;
    this.supportedSizes = params.supportedSizes;
  }
}