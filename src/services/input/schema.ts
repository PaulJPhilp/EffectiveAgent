import { ImageUrlPart as BaseImageUrlPart, TextPart as BaseTextPart, ToolCallPart as BaseToolCallPart } from "@effective-agent/ai-sdk"; // Import base parts
import { Schema as S } from "effect";

/**
 * Represents a file part in a message.
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
}

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
}

// [DEPRECATED] All exports have been moved to input.service.ts
// This file will be deleted after migration.
// This local 'Part' union should be reviewed. For now, keeping its existing definition.
type Part = FilePart | ReasoningPart | RedactedReasoningPart | ToolPart | ToolResultPart;


// [DEPRECATED] All exports have been moved to input.service.ts
// This file will be deleted after migration.
declare namespace EffectivePart {
    // [DEPRECATED] All exports have been moved to input.service.ts
    // This file will be deleted after migration.
    type Schema = S.Union<[
        typeof BaseTextPart, // Use BaseTextPart from root schema
        // ImagePart removed as its source from @effect/ai/AiInput is gone and its specific structure isn't locally defined here yet.
        typeof BaseImageUrlPart, // Use BaseImageUrlPart from root schema
        typeof BaseToolCallPart, // Use BaseToolCallPart from root schema
        typeof FilePart,
        typeof ToolPart,
        typeof ToolResultPart,
        typeof ReasoningPart,
        typeof RedactedReasoningPart
    ]>;
}

// [DEPRECATED] All exports have been moved to input.service.ts
// This file will be deleted after migration.
const EffectivePart: EffectivePart.Schema = S.Union(BaseTextPart, BaseImageUrlPart, BaseToolCallPart, FilePart, ToolPart, ToolResultPart, ReasoningPart, RedactedReasoningPart);