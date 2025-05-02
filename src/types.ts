/**
 * @file Defines globally shared primitive types for the application services.
 */

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
 * Core input type for AI operations.
 * Used across pipeline and AI services.
 */
export interface EffectiveInput {
  readonly text: string;
  readonly metadata?: Metadata;
  readonly context?: unknown;
}

// --- AI Response Types ---

/**
 * Reason for completion finish.
 */
export type FinishReason = "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other" | "unknown";

/**
 * Detailed reasoning for generateText results
 */
export interface TextReasoningDetail {
  type: 'text'
  text: string
  signature?: string
}

export interface RedactedReasoningDetail {
  type: 'redacted'
  data: string
}

export type ReasoningDetail = TextReasoningDetail | RedactedReasoningDetail

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
