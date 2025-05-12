/**
 * @file Defines globally shared primitive types for the application services.
 */

import { Message } from "@/schema.js";
import { Effect, Schema as S } from "effect";
import * as Chunk from "effect/Chunk";

// Re-export Message
export { Message } from "@/schema.js";

/**
 * Core input type for AI operations.
 * Used across pipeline and AI services.
 */
export class EffectiveInput extends S.Class<EffectiveInput>("EffectiveInput")({
  /** The input text/prompt to process */
  text: S.String,
  /** Messages in the conversation */
  messages: S.Chunk(Message),
  /** Optional metadata for the request */
  metadata: S.optional(S.Struct({
    /** Operation name for tracing */
    operationName: S.optional(S.String),
    /** Model parameters */
    parameters: S.optional(S.Struct({
      temperature: S.optional(S.Number),
      maxTokens: S.optional(S.Number),
      topP: S.optional(S.Number),
      frequencyPenalty: S.optional(S.Number),
      presencePenalty: S.optional(S.Number),
      stop: S.optional(S.Array(S.String))
    })),
    /** Provider-specific metadata */
    providerMetadata: S.optional(S.Record({ key: S.String, value: S.Unknown }))
  }))
}) {
  constructor(text: string, messages: Chunk.Chunk<Message>, metadata?: {
    operationName?: string;
    parameters?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      stop?: string[];
    };
    providerMetadata?: Record<string, unknown>;
  }) {
    super({ text, messages, metadata });
  }
}

/**
 * Base response type for all operations
 */
export interface EffectiveResponse<T> {
  metadata: any;
  /** The operation result */
  data: T;
  /** Usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Reason for completion */
  finishReason?: "stop" | "length" | "content_filter" | "tool_calls" | "function_call";
  /** Provider-specific metadata */
  providerMetadata?: Record<string, unknown>;
  /** Messages in the conversation */
  messages?: Chunk.Chunk<Message>;
}

/**
 * Base error type for all operations
 */
export interface EffectiveError {
  /** Error description */
  description: string;
  /** Module where the error occurred */
  module: string;
  /** Method where the error occurred */
  method: string;
  /** Optional cause of the error */
  cause?: unknown;
}

/**
 * Error thrown when tool execution fails
 */
export class ToolExecutionError extends Error implements EffectiveError {
  readonly _tag = "ToolExecutionError";
  constructor(
    public readonly description: string,
    public readonly module: string,
    public readonly method: string,
    public readonly cause?: unknown
  ) {
    super(description);
    this.name = "ToolExecutionError";
  }
}

/**
 * Error thrown when tool input validation fails
 */
export class ToolInputValidationError extends Error implements EffectiveError {
  readonly _tag = "ToolInputValidationError";
  constructor(
    public readonly description: string,
    public readonly module: string,
    public readonly method: string,
    public readonly cause?: unknown
  ) {
    super(description);
    this.name = "ToolInputValidationError";
  }
}

/**
 * Error thrown when tool output validation fails
 */
export class ToolOutputValidationError extends Error implements EffectiveError {
  readonly _tag = "ToolOutputValidationError";
  constructor(
    public readonly description: string,
    public readonly module: string,
    public readonly method: string,
    public readonly cause?: unknown
  ) {
    super(description);
    this.name = "ToolOutputValidationError";
  }
}

/**
 * Base toolkit interface for all tools
 */
export interface EffectiveToolkit {
  readonly name: string;
  readonly description: string;
  readonly tools: EffectiveTool[];
}

/**
 * Base tool API interface with proper typing
 */
export interface EffectiveToolApi {
  <Input extends Record<string, unknown>, Output = unknown>(
    input: Input
  ): Effect.Effect<
    Output,
    | ToolExecutionError
    | ToolInputValidationError
    | ToolOutputValidationError
  >;
}

/**
 * Base tool interface with improved typing
 */
export interface EffectiveTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly [key: string]: {
      readonly type: string;
      readonly description: string;
      readonly required?: boolean;
      readonly default?: unknown;
    };
  };
  readonly execute: EffectiveToolApi;
}

// --- Core JSON Types ---

/**
 * Represents a generic JSON object structure.
 * Useful for representing unstructured or semi-structured data payloads,
 * often used in logging context or API responses/requests before validation.
 *
 * Use specific, validated types derived from schemas whenever possible
 * instead of relying heavily on JsonObject.
 */
export type JsonObject = { [key: string]: JsonValue };

/**
 * Represents any valid JSON value (primitive, array, or object).
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;

/**
 * Represents a JSON array structure.
 */
export type JsonArray = JsonValue[];

// --- Core Entity Types ---

/**
 * Represents a unique identifier, typically a string (like UUID).
 * Using a branded type can help prevent accidental misuse, although
 * simple `string` is often sufficient if strictness isn't paramount.
 * Example: type UserId = Brand<string, "UserId">;
 */
export type EntityId = string;

/**
 * Represents a timestamp, typically stored as the number of milliseconds
 * since the Unix epoch. Consistent with `Clock.currentTimeMillis`.
 */
export type Timestamp = number;

/**
 * Core metadata type used across services.
 */
export type Metadata = Record<string, JsonValue>;

/**
 * Represents a tuple of two values.
 */
export type Tuple<T1, T2> = [T1, T2];

// --- Auth Types ---

/**
 * Core authentication record containing user identity information.
 * Used across services for authorization and policy checks.
 */
export interface AuthRecord {
  readonly userId: string;
  readonly tenantId?: string;
  readonly roles?: readonly string[];
  readonly [key: string]: unknown;
}

// --- Provider Types ---

/**
 * Provider-specific metadata for responses and operations.
 * Used across AI services for extended provider information.
 */
export interface ProviderMetadata {
  readonly provider: string;
  readonly model: string;
  readonly [key: string]: unknown;
}

/**
 * Token usage information for AI operations.
 */
export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Source used during generation (e.g., web search)
 */
export interface Source {
  sourceType: 'url'
  id: string
  url: string
  title?: string
  providerMetadata?: ProviderMetadata
}

/**
 * Response message from the model (assistant or tool)
 */
export interface ResponseMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

/**
 * Warning from the provider (e.g., unsupported settings)
 */
export interface Warning {
  message: string
}

export interface Mailbox {
  /** Maximum size of the mailbox */
  readonly size: number
  /** Whether to enable message prioritization */
  readonly enablePrioritization: boolean
  /** Size of each priority queue when prioritization is enabled */
  readonly priorityQueueSize: number
  /** Timeout for backpressure in milliseconds */
  readonly backpressureTimeout: number
}

/**
 * Represents an imported type from an external module
 * Used for type-safe dynamic imports across the application
 */
export type ImportedType<T> = T extends { default: unknown }
  ? T["default"]
  : T

/**
 * Base type for all entities in the system
 */
export interface BaseEntity {
  readonly id: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly [key: string]: unknown
}

/**
 * Base type for all service errors
 */
export interface ServiceError {
  readonly _tag: string
  readonly message: string
  readonly cause?: unknown
}

/**
 * Base type for all configuration files
 */
export interface BaseConfig {
  readonly name: string
  readonly version: string
  readonly [key: string]: unknown
}

/**
 * Represents a user in the system
 */
export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles?: readonly string[];
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
