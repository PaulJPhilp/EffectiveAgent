/**
 * @file API interface for ObjectService (AI structured object producer).
 * Defines the contract for object generation using AI models/providers.
 */

import type { Effect } from "effect";
import type { Option } from "effect/Option";
import type { Span } from "effect/Tracer";
import type { Schema } from "effect/Schema";
import type { AiError } from "@effect/ai/AiError";

/**
 * Options for generating a structured object via AI.
 * @template T The type of the object to generate.
 */
export interface ObjectGenerationOptions<T> {
  /** Model ID to use for generation. */
  readonly modelId?: string;
  /** Prompt to guide object generation. */
  readonly prompt: string;
  /** Optional system instructions. */
  readonly system: Option<string>;
  /** Schema to validate and parse the result. */
  readonly schema: Schema<T>;
  /** Tracing span for observability. */
  readonly span: Span;
  /** Optional model parameters. */
  readonly parameters?: {
    maxSteps?: number;
    maxRetries?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    seed?: number;
    stop?: string[];
  };
}

/**
 * Result of a structured object generation call.
 * @template T The type of the generated object.
 */
export interface ObjectGenerationResult<T> {
  /** The generated object. */
  readonly data: T;
  /** The model used. */
  readonly model: string;
  /** The timestamp of generation. */
  readonly timestamp: Date;
  /** The response ID. */
  readonly id: string;
  /** Optional usage statistics. */
  readonly usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * API contract for the ObjectService.
 */
export interface ObjectServiceApi {
  /**
   * Generate a structured object using an AI provider.
   * @template T The type of object to generate.
   * @param options Generation options (prompt, schema, etc.)
   * @returns Effect producing ObjectGenerationResult<T> or AiError
   */
  generate<T>(options: ObjectGenerationOptions<T>): Effect.Effect<ObjectGenerationResult<T>, AiError>;
}
