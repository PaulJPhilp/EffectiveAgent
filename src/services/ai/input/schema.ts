import { Part as AiInputPart, ImagePart, ImageUrlPart, PartTypeId, TextPart, ToolCallPart, ToolCallResolvedPart } from "@effect/ai/AiInput";
import {Schema as S } from "effect";


// === Main Model Definition Schema ===
export class FilePart extends S.Class<FilePart>(
    "FilePart"
)({
    _tag: S.Literal("FilePart"),
    fileName: S.String,
    fileContent: S.Uint8ArrayFromSelf,
    fileType: S.String
}) {
    /**
     * @since 1.0.0
     */
    readonly [PartTypeId]: PartTypeId = PartTypeId

}

// === Main Model Definition Schema ===
export class ReasoningPart extends S.Class<ReasoningPart>(
    "ReasoningPart"
)({
    _tag: S.Literal("ReasoningPart"),
    type: S.Literal("reasoning"),
    text: S.String,
    signature: S.String.pipe(S.optional),
}) {
    /**
     * @since 1.0.0
     */
    readonly [PartTypeId]: PartTypeId = PartTypeId

}

export class RedactedReasoningPart extends S.Class<RedactedReasoningPart>(
    "RedactedReasoningPart"
)({
    _tag: S.Literal("RedactedReasoningPart"),
    type: S.Literal("redacted-reasoning"),
    data: S.String
}) {

    readonly [PartTypeId]: PartTypeId = PartTypeId

}

export class ToolPart extends S.Class<ToolPart>(
    "ToolPart"
)({
    _tag: S.Literal("ToolPart"),
    type: S.Literal("tool-call-part"),
    toolCallId: S.String,
    toolName: S.String,
    toolDescription: S.String,
    toolArguments: S.String,
}) {
    /**
     * @since 1.0.0
     */
    readonly [PartTypeId]: PartTypeId = PartTypeId

}

export class ToolResultPart extends S.Class<ToolResultPart>(
    "ToolResultPart"
)({
    _tag: S.Literal("ToolResultPart"),
    type: S.Literal("tool-result"),
    data: S.String
}) {
    /**
     * @since 1.0.0
     */
    readonly [PartTypeId]: PartTypeId = PartTypeId

}

export type Part = AiInputPart | FilePart | ReasoningPart | RedactedReasoningPart | ToolPart | ToolResultPart ;


export declare namespace EffectivePart {
    export type Schema = S.Union<[
        typeof TextPart,
        typeof ImagePart,
        typeof ImageUrlPart,
        typeof ToolCallPart,
        typeof FilePart,
        typeof ToolPart,
        typeof ToolResultPart,
        typeof ReasoningPart,
        typeof RedactedReasoningPart
    ]>;
}

export const EffectivePart: EffectivePart.Schema = S.Union(TextPart, ImagePart, ImageUrlPart, ToolCallPart, FilePart, ToolPart, ToolResultPart, ReasoningPart, RedactedReasoningPart);

export type EffectivePartType = S.Schema.Type<typeof EffectivePart>

export { TextPart, ImagePart, ImageUrlPart, ToolCallPart}