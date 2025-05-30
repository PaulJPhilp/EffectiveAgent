/**
 * @file API interface for ImageService (AI image producer).
 * Defines the contract for image generation using AI models/providers.
 */

import type { AgentRuntime } from "@/agent-runtime/types.js";
import { GenerateImageResult } from "@/services/ai/provider/types.js";
import { Effect } from "effect";
// Import these types directly as they're being moved from service.ts
// The build system will resolve this correctly once the service.ts is updated
import type { ImageGenerationError, ImageModelError, ImageProviderError, ImageSizeError } from "./errors.js";
import type { ImageAgentState } from "./service.js";
import type { ImageGenerationOptions } from "./types.js";

/**
 * API contract for the ImageService.
 */
export interface ImageServiceApi {
  /**
   * Generates images from the given prompt using the specified model.
   * @param options - Options for image generation (prompt, modelId, parameters)
   * @returns Effect that resolves to image generation result or fails with an error
   */
  readonly generate: (
    options: ImageGenerationOptions
  ) => Effect.Effect<
    GenerateImageResult,
    ImageModelError | ImageProviderError | ImageGenerationError | ImageSizeError
  >;

  /**
   * Get the current agent state for monitoring/debugging
   * @returns Effect that resolves to the current ImageAgentState
   */
  readonly getAgentState: () => Effect.Effect<ImageAgentState, Error>;

  /**
   * Get the agent runtime for advanced operations
   * @returns The AgentRuntime instance
   */
  readonly getRuntime: () => AgentRuntime<ImageAgentState>;

  /**
   * Terminate the image service agent
   * @returns Effect that resolves when termination is complete
   */
  readonly terminate: () => Effect.Effect<void, Error>;
}
