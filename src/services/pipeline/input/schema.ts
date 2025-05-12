
import { ImagePart } from "@effect/ai/AiInput";
import { ImageUrlPart, PartTypeId, TextPart, ToolCallPart } from "@effect/ai/AiResponse";
import { Schema as S } from "effect";



/**
 * Represents a file part in a message.
 * This is a custom part type that works with @effect/ai/AiResponse Part
 */
export class FilePart extends S.Class<FilePart>(
    "FilePart"
)({
    _tag: S.Literal("File"),
    fileName: S.String,
    fileContent: S.Uint8Array,
    fileType: S.String,
    url: S.String
}) {
    /**
     * Required by the Part interface for identification
     * @since 1.0.0
     */
    readonly [PartTypeId]: PartTypeId = PartTypeId;

    constructor(
        fileName: string,
        fileContent: Uint8Array,
        fileType: string
    ) {
        super({
            _tag: "File",
            fileName,
            fileContent,
            fileType,
            url: ""
        });
    }

    toString(): string {
        return `File: ${this.fileName} (${this.fileType})`;
    }
}

class TextStreamPart extends S.Class<TextStreamPart>(
    "TextStreamPart"
)({
    _tag: S.Literal("TextStreamPart"),
    content: S.String
}) { }



// === Main Model Definition Schema ===
// [DEPRECATED] All exports have been moved to input.service.ts
// This file will be deleted after migration.
class ReasoningPart extends S.Class<ReasoningPart>(
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

// [DEPRECATED] All exports have been moved to input.service.ts
// This file will be deleted after migration.
class RedactedReasoningPart extends S.Class<RedactedReasoningPart>(
    "RedactedReasoningPart"
)({
    _tag: S.Literal("RedactedReasoningPart"),
    type: S.Literal("redacted-reasoning"),
    data: S.String
}) {

    readonly [PartTypeId]: PartTypeId = PartTypeId

}

// [DEPRECATED] All exports have been moved to input.service.ts
// This file will be deleted after migration.
class ToolPart extends S.Class<ToolPart>(
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

// [DEPRECATED] All exports have been moved to input.service.ts
// This file will be deleted after migration.
class ToolResultPart extends S.Class<ToolResultPart>(
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

// [DEPRECATED] All exports have been moved to input.service.ts
// This file will be deleted after migration.
type Part = FilePart | ReasoningPart | RedactedReasoningPart | ToolPart | ToolResultPart;


// [DEPRECATED] All exports have been moved to input.service.ts
// This file will be deleted after migration.
declare namespace EffectivePart {
    // [DEPRECATED] All exports have been moved to input.service.ts
    // This file will be deleted after migration.
    type Schema = S.Union<[
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

// [DEPRECATED] All exports have been moved to input.service.ts
// This file will be deleted after migration.
const EffectivePart: EffectivePart.Schema = S.Union(TextPart, ImagePart, ImageUrlPart, ToolCallPart, FilePart, ToolPart, ToolResultPart, ReasoningPart, RedactedReasoningPart);

// FilePart is already exported by class declaration

