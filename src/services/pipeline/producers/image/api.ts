/**
 * @file Defines the API interface for the ImageService
 * @module services/pipeline/producers/image/api
 */

import { GenerateImageResult } from "@/services/ai/provider/types.js";
import { Effect } from "effect";
// Import these types directly as they're being moved from service.ts
// The build system will resolve this correctly once the service.ts is updated
import type { ImageGenerationError, ImageModelError, ImageProviderError, ImageSizeError } from "./errors.js";

// Define the options interface here for now to avoid import cycles
// We'll refactor this when updating service.ts
export interface ImageGenerationOptions {
  /** The model ID to use */
  readonly modelId?: string;
  /** The text prompt to process */
  readonly prompt: string;
  /** Negative prompt to exclude from generation */
  readonly negativePrompt?: string;
  /** The system prompt or instructions */
  readonly system: unknown; // Will be Option<string>
  /** Image size to generate */
  readonly size?: string;
  /** Image quality level */
  readonly quality?: string;
  /** Image style preference */
  readonly style?: string;
  /** Other settings */
  readonly [key: string]: unknown;
}

/**
 * ImageService interface for handling AI image generation
 */
export interface ImageServiceApi {
  /**
   * Generates images from the given prompt using the specified model.
   * @param options - Options for image generation (prompt, modelId, parameters)
   * @returns Effect that resolves to image generation result or fails with an error
   */
  generate: (
    options: ImageGenerationOptions
  ) => Effect.Effect<
    GenerateImageResult, 
    ImageModelError | ImageProviderError | ImageGenerationError | ImageSizeError
  >;
}
