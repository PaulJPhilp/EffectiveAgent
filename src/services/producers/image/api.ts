/**
 * @file API interface for ImageService (AI image producer).
 * Defines the contract for image generation using AI models/providers.
 */

import type { Effect, Ref } from "effect";
import type { EffectiveResponse } from "@/types.js";
import type { ImageAgentState } from "./service.js";
import type { ImageGenerationOptions, ImageGenerationResult } from "./types.js";

export type { ImageGenerationOptions, ImageGenerationResult };

/**
 * API contract for the ImageService.
 */
export interface ImageServiceApi {
  /**
   * Generates an image based on the provided options.
   * @param options Options for image generation, including prompt and modelId.
   * @returns Effect that resolves to an EffectiveResponse or fails with an ImageServiceError.
   */
  readonly generate: (
    options: ImageGenerationOptions
  ) => Effect.Effect<EffectiveResponse<ImageGenerationResult>, Error>;

  /**
   * Get the current service state for monitoring/debugging
   * @returns Effect that resolves to the current ImageAgentState
   */
  readonly getAgentState: () => Effect.Effect<ImageAgentState, Error>;


  /**
   * Terminate the service (no-op since we don't have external runtime)
   * @returns Effect that succeeds
   */
  readonly terminate: () => Effect.Effect<void, Error>;
}
