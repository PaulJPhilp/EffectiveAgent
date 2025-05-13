/**
 * @file Defines message part types for the input pipeline
 */

import { Schema as S } from "effect";

/**
 * Unique symbol for part type identification
 */
export const PartTypeId = Symbol.for("@effect/ai/AiResponse/Part");
export type PartTypeId = typeof PartTypeId;

/**
 * Text part in a message
 */
export class TextPart extends S.Class<TextPart>("TextPart")({
    _tag: S.Literal("Text"),
    content: S.String
}) {
    readonly [PartTypeId]: PartTypeId = PartTypeId;

    constructor(params: { content: string }) {
        super({
            _tag: "Text",
            content: params.content
        });
    }
}

/**
 * Tool call part in a message
 */
export class ToolCallPart extends S.Class<ToolCallPart>("ToolCallPart")({
    _tag: S.Literal("ToolCall"),
    toolCall: S.String
}) {
    readonly [PartTypeId]: PartTypeId = PartTypeId;

    constructor(params: { toolCall: string }) {
        super({
            _tag: "ToolCall",
            toolCall: params.toolCall
        });
    }
}

/**
 * Image URL part in a message
 */
export class ImageUrlPart extends S.Class<ImageUrlPart>("ImageUrlPart")({
    _tag: S.Literal("ImageUrl"),
    url: S.String
}) {
    readonly [PartTypeId]: PartTypeId = PartTypeId;

    constructor(params: { url: string }) {
        super({
            _tag: "ImageUrl",
            url: params.url
        });
    }
}

/**
 * Union type for all part types
 */
export type Part = TextPart | ToolCallPart | ImageUrlPart;
