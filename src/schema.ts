/**
 * @file Defines core Effect schemas used across the application.
 */

import { EffectiveRole } from "@/types.js"; // Added import for EffectiveRole
import { Schema as S } from "effect";

/**
 * Text part in a message
 */
export class TextPart extends S.Class<TextPart>("TextPart")({
  _tag: S.Literal("Text"),
  content: S.String
}) { }

/**
 * Tool call part in a message
 */
export class ToolCallPart extends S.Class<ToolCallPart>("ToolCallPart")({
  _tag: S.Literal("ToolCall"),
  toolCall: S.String
}) { }

/**
 * Image URL part in a message
 */
export class ImageUrlPart extends S.Class<ImageUrlPart>("ImageUrlPart")({
  _tag: S.Literal("ImageUrl"),
  url: S.String
}) { }

/**
 * Union type for all message parts
 */
export type Part = TextPart | ToolCallPart | ImageUrlPart;

// --- Core String Schemas ---

/**
 * Schema for a name identifier with length and pattern constraints.
 */
export const Name = S.String.pipe(
  S.minLength(1),
  S.maxLength(64),
  S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$"))
);

/**
 * Schema for a short identifier with length and pattern constraints.
 */
export const Identifier = S.String.pipe(
  S.minLength(1),
  S.maxLength(16),
  S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,16}$"))
);

/**
 * Schema for semantic versioning strings (e.g., 0.1.0).
 */
export const Version = S.String.pipe(
  S.pattern(/^\d+\.\d+\.\d+$/)
);

/**
 * Schema for URLs with validation.
 */
export const Url = S.String.pipe(
  S.pattern(/^https?:\/\/[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!$&'()*+,;=.]+$/)
);

/**
 * Schema for descriptions with max length.
 */
export const Description = S.String.pipe(
  S.maxLength(256)
);

// --- Core Number Schemas ---

/**
 * Schema representing a positive integer.
 */
export const PositiveInt = S.Number.pipe(
  S.int(),
  S.greaterThan(0)
);

/**
 * Schema representing a non-negative number.
 */
export const PositiveNumber = S.Number.pipe(
  S.greaterThanOrEqualTo(0)
);

// --- Core Record Schemas ---

/**
 * Schema for metadata records.
 */
export class MetadataRecord extends S.Class<MetadataRecord>("MetadataRecord")({
  key: S.String,
  value: S.Unknown
}) { }

export class MetadataMap extends S.Class<MetadataMap>("MetadataMap")({
  entries: S.Record({ key: S.String, value: MetadataRecord })
}) { }

// --- Core Entity Schemas ---

/**
 * Base schema for database entities with standard metadata fields.
 * Used as the foundation for entity schemas across services.
 */
export class BaseEntitySchema extends S.Class<BaseEntitySchema>("BaseEntitySchema")({
  /** Unique identifier for the entity */
  id: S.String,
  /** When the entity was created (ISO format timestamp) */
  createdAt: S.String,
  /** When the entity was last updated (ISO format timestamp) */
  updatedAt: S.String,
}) { }

/**
 * Type for the base entity structure.
 */
export type BaseEntity = S.Schema.Type<typeof BaseEntitySchema>;

// --- Core AI Schemas ---

/**
 * Schema for model capabilities.
 */
export const ModelCapability = S.Union(
  S.Literal("text-generation"),
  S.Literal("chat"),
  S.Literal("function-calling"),
  S.Literal("vision"),
  S.Literal("reasoning"),
  S.Literal("code-generation"),
  S.Literal("audio"),
  S.Literal("image-generation"),
  S.Literal("embeddings"),
  S.Literal("tool-use"),
  S.Literal("search"),
  S.Literal("research")
);

export type ModelCapability = S.Schema.Type<typeof ModelCapability>;

/**
 * Schema for model context window size.
 */
export const ContextWindowSize = PositiveInt;

/**
 * Schema for rate limit information.
 * Used across services for controlling API usage.
 */
export class RateLimit extends S.Class<RateLimit>("RateLimit")({
  /** Maximum requests per minute */
  requestsPerMinute: PositiveInt.pipe(S.optional),
  /** Maximum tokens per minute */
  tokensPerMinute: PositiveInt.pipe(S.optional),
  /** Optional scope for rate limiting */
  scope: S.Union(
    S.Literal("user"),
    S.Literal("global")
  ).pipe(S.optional)
}) { }

/** Describes proficiency for a specific sub-dimension of a capability */
export class SubDimensionProficiency extends S.Class<SubDimensionProficiency>("SubDimensionProficiency")({
  // ... fields ...
}) { }

// --- Core Schema Types ---

/**
 * Schema for a name field.
 * Must be a non-empty string.
 */
export const NameField = S.String.pipe(S.minLength(1));

/**
 * Schema for a description field.
 * Must be a non-empty string.
 */
export const DescriptionField = S.String.pipe(S.minLength(1));

/**
 * Schema for metadata records.
 * Allows any JSON-serializable value.
 */
export const Metadata = S.Record({
  key: S.String,
  value: S.Unknown
})

/**
 * Schema for a message in a conversation.
 */
export class Message extends S.Class<Message>("Message")({
  /** Role of the message sender */
  role: EffectiveRole,
  /** Parts that make up the message content */
  parts: S.Chunk(S.Union(TextPart, ToolCallPart, ImageUrlPart)),
  /** Optional metadata */
  metadata: S.optional(Metadata)
}) { }
