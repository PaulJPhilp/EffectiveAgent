/**
 * @file Message types for the Effect AI SDK wrapper
 * @module @effective-agent/ai-sdk/message
 */

import { Schema as S } from "effect";

/**
 * Schema for model roles
 */
export const EffectiveRole = S.Union(
  S.Literal("user"),
  S.Literal("model"),
  S.Literal("system"),
  S.Literal("assistant"),
  S.Literal("tool")
);
export type EffectiveRole = S.Schema.Type<typeof EffectiveRole>;

/**
 * Text part in a message
 */
export class TextPart extends S.Class<TextPart>("TextPart")({
  _tag: S.Literal("Text"),
  content: S.String
}) {
  static is(part: Part): part is TextPart {
    return part._tag === "Text";
  }
}

/**
 * Tool call part in a message
 */
export class ToolCallPart extends S.Class<ToolCallPart>("ToolCallPart")({
  _tag: S.Literal("ToolCall"),
  id: S.String,
  name: S.String,
  args: S.Record({ key: S.String, value: S.Any })
}) {
  static is(part: Part): part is ToolCallPart {
    return part._tag === "ToolCall";
  }
}

/**
 * Tool result part in a message
 */
export class ToolPart extends S.Class<ToolPart>("ToolPart")({
  _tag: S.Literal("Tool"),
  tool_call_id: S.String,
  content: S.String
}) {
  static is(part: Part): part is ToolPart {
    return part._tag === "Tool";
  }
}

/**
 * Image URL part in a message
 */
export class ImageUrlPart extends S.Class<ImageUrlPart>("ImageUrlPart")({
  _tag: S.Literal("ImageUrl"),
  url: S.String
}) {
  static is(part: Part): part is ImageUrlPart {
    return part._tag === "ImageUrl";
  }
}

/**
 * Union type for all message parts
 */
export const Part = S.Union(TextPart, ToolCallPart, ImageUrlPart, ToolPart);
export type Part = S.Schema.Type<typeof Part>;

/**
 * Schema for metadata records
 */
export const Metadata = S.Record({
  key: S.String,
  value: S.Unknown
});

/**
 * Schema for a message in a conversation
 */
export class Message extends S.Class<Message>("Message")({
  role: EffectiveRole,
  parts: S.Chunk(Part),
  metadata: S.optional(Metadata)
}) {}

/**
 * Alias for Message to match the main codebase naming
 */
export type EffectiveMessage = Message;
