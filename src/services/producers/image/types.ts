/**
 * @file Type definitions for the ImageService
 * @module services/pipeline/producers/image/types
 */

import type { Option } from "effect/Option";
import type { Span } from "effect/Tracer";
import type { GenerateImageResult } from "@/services/ai/provider/types.js";
import type { EffectiveResponse } from "@/types.js";

/**
 * Result shape expected from the underlying provider client's generateImage method
 */
export type ProviderImageGenerationResult = EffectiveResponse<GenerateImageResult>;

/**
 * Supported image sizes
 */
export const ImageSizes = {
  SMALL: "256x256",
  MEDIUM: "512x512",
  LARGE: "1024x1024",
  WIDE: "1024x768",
  PORTRAIT: "768x1024"
} as const;

export type ImageSize = typeof ImageSizes[keyof typeof ImageSizes];

/**
 * Supported image quality levels
 */
export const ImageQualities = {
  STANDARD: "standard",
  HD: "hd"
} as const;

export type ImageQuality = typeof ImageQualities[keyof typeof ImageQualities];

/**
 * Supported image styles
 */
export const ImageStyles = {
  NATURAL: "natural",
  VIVID: "vivid"
} as const;

export type ImageStyle = typeof ImageStyles[keyof typeof ImageStyles];

/**
 * Options for image generation
 */
export interface ImageGenerationOptions {
  /** The model ID to use */
  readonly modelId?: string;
  /** The text prompt to process */
  readonly prompt: string;
  /** Negative prompt to exclude from generation */
  readonly negativePrompt?: string;
  /** The system prompt or instructions */
  readonly system: Option<string>;
  /** Image size to generate */
  readonly size?: ImageSize;
  /** Image quality level */
  readonly quality?: ImageQuality;
  /** Image style preference */
  readonly style?: ImageStyle;
  /** Number of images to generate */
  readonly n?: number;
  /** Tracing span for observability */
  readonly span?: Span;
  /** Optional signal to abort the operation */
  readonly signal?: AbortSignal;
  /** Optional parameters for model behavior */
  readonly parameters?: {
    /** Maximum tokens to generate */
    maxTokens?: number;
    /** Maximum retries on failure */
    maxRetries?: number;
    /** Temperature (0-2) */
    temperature?: number;
    /** Top-p sampling */
    topP?: number;
    /** Top-k sampling */
    topK?: number;
    /** Presence penalty */
    presencePenalty?: number;
    /** Frequency penalty */
    frequencyPenalty?: number;
    /** Random seed */
    seed?: number;
    /** Stop sequences */
    stop?: string[];
  };
}

/**
 * Result of the image generation
 */
export interface ImageGenerationResult {
  /** The primary generated image URL */
  readonly imageUrl: string;
  /** Additional generated images if multiple were requested */
  readonly additionalImages?: string[];
  /** Generation parameters used */
  readonly parameters: {
    /** Size of the generated image */
    readonly size?: string;
    /** Quality level used */
    readonly quality?: string;
    /** Style setting used */
    readonly style?: string;
  };
  /** The model used */
  readonly model: string;
  /** The timestamp of the generation */
  readonly timestamp: Date;
  /** The ID of the response */
  readonly id: string;
  /** Optional usage statistics */
  readonly usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}
