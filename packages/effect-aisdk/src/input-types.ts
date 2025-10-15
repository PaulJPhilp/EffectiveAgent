/**
 * @file Input types for AI operations
 * @module @effective-agent/ai-sdk/input-types
 */

import type { Chunk } from "effect";
import type { Schema } from "effect";
import type { EffectiveMessage } from "./message.js";
import type { BaseAiOptions, BaseAiParameters } from "./types.js";

/**
 * Core input type for AI operations
 */
export interface EffectiveInput {
  /** The input text/prompt to process */
  readonly text?: string;
  /** Messages in the conversation */
  readonly messages?: Chunk.Chunk<EffectiveMessage>;
  /** Optional metadata for the request */
  readonly metadata?: {
    /** Operation name for tracing */
    readonly operationName?: string;
    /** Model parameters */
    readonly parameters?: BaseAiParameters;
    /** Provider-specific metadata */
    readonly providerMetadata?: Record<string, unknown>;
  };
}

/**
 * Options for text generation
 */
export interface GenerateTextOptions extends BaseAiOptions {
  /** Optional system prompt or instructions */
  readonly system?: string;
}

/**
 * Options for structured object generation
 */
export interface GenerateObjectOptions<T = unknown> extends BaseAiOptions {
  /** The schema for the object to be generated */
  readonly schema: Schema.Schema<T, any, never>;
  /** Optional system prompt or instructions */
  readonly system?: string;
}

/**
 * Options for chat completion
 */
export interface ChatOptions extends BaseAiOptions {
  /** Optional system prompt or instructions */
  readonly system?: string;
  /** Optional list of tool definitions to make available */
  readonly tools?: ToolDefinition[];
}

/**
 * Options for embedding generation
 */
export interface GenerateEmbeddingsOptions extends BaseAiOptions {
  /** Optional batch size for processing embeddings */
  readonly batchSize?: number;
}

/**
 * Options for image generation
 */
export interface GenerateImageOptions extends BaseAiOptions {
  /** Number of images to generate */
  readonly n?: number;
  /** Desired size of the image (e.g., '1024x1024') */
  readonly size?: string;
  /** Quality setting (e.g., 'hd', 'standard') */
  readonly quality?: string;
  /** Artistic style (e.g., 'vivid', 'natural') */
  readonly style?: string;
}

/**
 * Options for speech generation
 */
export interface GenerateSpeechOptions extends BaseAiOptions {
  /** Voice ID or name */
  readonly voice?: string;
  /** Speed/rate adjustment */
  readonly speed?: string;
}

/**
 * Options for transcription
 */
export interface TranscribeOptions extends BaseAiOptions {
  /** Language hint */
  readonly language?: string;
  /** Enable speaker diarization */
  readonly diarization?: boolean;
  /** Enable timestamps */
  readonly timestamps?: boolean;
}

/**
 * Options for streaming text generation
 */
export interface StreamTextOptions extends GenerateTextOptions {
  /** Callback for each text chunk */
  readonly onChunk?: (chunk: string) => void;
  /** Callback for completion */
  readonly onComplete?: (text: string) => void;
}

/**
 * Options for streaming object generation
 */
export interface StreamObjectOptions<T = unknown> extends GenerateObjectOptions<T> {
  /** Callback for each partial object */
  readonly onChunk?: (partial: Partial<T>) => void;
  /** Callback for completion */
  readonly onComplete?: (object: T) => void;
}

/**
 * Tool definition for function calling
 * TODO: Full implementation in Phase 4
 */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: unknown;
}
