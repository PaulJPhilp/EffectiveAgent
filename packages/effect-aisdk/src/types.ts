/**
 * @file Core types for the Effect AI SDK wrapper
 * @module @effective-agent/ai-sdk/types
 */

import type { EffectiveMessage } from "./message.js";

/**
 * Unified type for operation finish reasons across all AI operations
 */
export type FinishReason =
  | "stop"
  | "length"
  | "content_filter"
  | "tool_calls"
  | "function_call"
  | "error";

/**
 * Token usage information for AI operations
 */
export interface EffectiveUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

/**
 * Base result type containing common fields for all AI generation results
 */
export interface GenerateBaseResult {
  /** Unique identifier of the response */
  readonly id: string;
  /** Model identifier used for generation */
  readonly model: string;
  /** Timestamp of the response */
  readonly timestamp: Date;
  /** Reason the generation finished */
  readonly finishReason: FinishReason;
  /** Token/compute usage details */
  readonly usage: EffectiveUsage;
  /** Provider-specific metadata */
  readonly providerMetadata?: Record<string, unknown>;
  /** Optional raw response headers */
  readonly headers?: Record<string, string>;
  /** Optional raw response body */
  readonly body?: unknown;
}

/**
 * Base response type for all AI operations
 */
export interface EffectiveResponse<T> {
  /** The operation result */
  readonly data: T;
  /** Response metadata */
  readonly metadata: {
    readonly model: string;
    readonly provider: string;
    readonly [key: string]: unknown;
  };
  /** Usage statistics */
  readonly usage?: EffectiveUsage;
  /** Reason for completion */
  readonly finishReason?: FinishReason;
  /** Provider-specific metadata */
  readonly providerMetadata?: Record<string, unknown>;
}

/**
 * Extended response type for provider operations that return assistant messages
 */
export interface ProviderEffectiveResponse<T> extends EffectiveResponse<T> {
  /** The assistant's response message, if applicable */
  readonly effectiveMessage?: EffectiveMessage;
}

/**
 * Base options common to many AI operations
 */
export interface BaseAiParameters {
  /** Maximum tokens to generate */
  readonly maxTokens?: number;
  /** Temperature for sampling (0-2) */
  readonly temperature?: number;
  /** Top-p sampling */
  readonly topP?: number;
  /** Top-k sampling */
  readonly topK?: number;
  /** Presence penalty (-2 to 2) */
  readonly presencePenalty?: number;
  /** Frequency penalty (-2 to 2) */
  readonly frequencyPenalty?: number;
  /** Random seed for deterministic outputs */
  readonly seed?: number;
  /** Stop sequences */
  readonly stop?: string[];
}

/**
 * Base options shared by all AI operations
 */
export interface BaseAiOptions {
  /** The model ID to use for the operation */
  readonly modelId: string;
  /** Optional signal for cancellation */
  readonly signal?: AbortSignal;
  /** Optional parameters for model behavior */
  readonly parameters?: BaseAiParameters;
}
