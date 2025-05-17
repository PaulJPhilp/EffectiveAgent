import { Schema as S } from "effect";

/**
 * Text part in a message
 */
export class TextPart extends S.Class<TextPart>("TextPart")({
  _tag: S.Literal("Text"),
  content: S.String
}) {}

/**
 * Tool call part in a message
 */
export class ToolCallPart extends S.Class<ToolCallPart>("ToolCallPart")({
  _tag: S.Literal("ToolCall"),
  toolCall: S.String
}) {}

/**
 * Image URL part in a message
 */
export class ImageUrlPart extends S.Class<ImageUrlPart>("ImageUrlPart")({
  _tag: S.Literal("ImageUrl"),
  url: S.String
}) {}

/**
 * Union type for all message parts
 */
export type Part = TextPart | ToolCallPart | ImageUrlPart;

/**
 * Schema for a message in a conversation.
 */
export class EffectiveMessage extends S.Class<EffectiveMessage>("Message")({
  /** Role of the message sender */
  role: S.Union(
    S.Literal("user"),
    S.Literal("model"),
    S.Literal("system"),
    S.Literal("assistant"),
    S.Literal("tool")
  ),
  /** Parts that make up the message content */
  parts: S.Chunk(S.Union(TextPart, ToolCallPart, ImageUrlPart)),
  /** Optional metadata */
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown }))
}) {}
