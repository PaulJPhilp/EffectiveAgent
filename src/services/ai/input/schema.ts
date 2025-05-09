/**
 * @file Schema definitions for AI input types
 */

import { Chunk, Schema as S } from "effect";

/**
 * Unique symbol for part type identification
 */
export const PartTypeId = Symbol("PartTypeId");
export type PartTypeId = typeof PartTypeId;

/**
 * Base type for all part types
 */
export type Part = TextPart | ImagePart | ImageUrlPart | ToolCallPart | ToolCallResolvedPart | FilePart | ReasoningPart | RedactedReasoningPart | ToolPart | ToolResultPart;

/**
 * Text part containing string content
 */
export class TextPart extends S.Class<TextPart>("TextPart")({
    _tag: S.Literal("TextPart"),
    content: S.String
}) {
    constructor(props: { content: string }) {
        super({ _tag: "TextPart", content: props.content });
    }

    getContent(): string {
        return this.content
    }
}

/**
 * Image part containing image data
 */
export class ImagePart extends S.Class<ImagePart>("ImagePart")({
    _tag: S.Literal("ImagePart"),
    content: S.String
}) {
    constructor(props: { content: string }) {
        super({ _tag: "ImagePart", content: props.content });
    }
}

/**
 * Image URL part containing a URL to an image
 */
export class ImageUrlPart extends S.Class<ImageUrlPart>("ImageUrlPart")({
    _tag: S.Literal("ImageUrlPart"),
    url: S.String
}) {
    constructor(props: { url: string }) {
        super({ _tag: "ImageUrlPart", url: props.url });
    }
}

/**
 * Tool call part for requesting tool execution
 */
export class ToolCallPart extends S.Class<ToolCallPart>("ToolCallPart")({
    _tag: S.Literal("ToolCallPart"),
    name: S.String,
    arguments: S.String
}) {
    constructor(props: { name: string; arguments: string }) {
        super({ _tag: "ToolCallPart", ...props });
    }
}

/**
 * Tool call resolved part containing tool execution results
 */
export class ToolCallResolvedPart extends S.Class<ToolCallResolvedPart>("ToolCallResolvedPart")({
    _tag: S.Literal("ToolCallResolvedPart"),
    name: S.String,
    content: S.String
}) {
    constructor(props: { name: string; content: string }) {
        super({ _tag: "ToolCallResolvedPart", ...props });
    }
}

export class TextStreamPart extends S.Class<TextStreamPart>(
    "TextStreamPart"
)({
    _tag: S.Literal("TextStreamPart"),
    content: S.String
}) { }

export class FilePart extends S.Class<FilePart>(
    "FilePart"
)({
    _tag: S.Literal("FilePart"),
    fileName: S.String,
    fileContent: S.Uint8ArrayFromSelf,
    fileType: S.String
}) { }

export class ReasoningPart extends S.Class<ReasoningPart>(
    "ReasoningPart"
)({
    _tag: S.Literal("ReasoningPart"),
    type: S.Literal("reasoning"),
    text: S.String,
    signature: S.String.pipe(S.optional)
}) { }

export class RedactedReasoningPart extends S.Class<RedactedReasoningPart>(
    "RedactedReasoningPart"
)({
    _tag: S.Literal("RedactedReasoningPart"),
    type: S.Literal("redacted-reasoning"),
    data: S.String
}) { }

export class ToolPart extends S.Class<ToolPart>(
    "ToolPart"
)({
    _tag: S.Literal("ToolPart"),
    type: S.Literal("tool-call-part"),
    toolCallId: S.String,
    toolName: S.String,
    toolDescription: S.String,
    toolArguments: S.String
}) { }

export class ToolResultPart extends S.Class<ToolResultPart>(
    "ToolResultPart"
)({
    _tag: S.Literal("ToolResultPart"),
    type: S.Literal("tool-result"),
    data: S.String
}) { }

export declare namespace EffectivePart {
    export type Schema = S.Union<[
        typeof TextPart,
        typeof ImagePart,
        typeof ImageUrlPart,
        typeof ToolCallPart,
        typeof ToolCallResolvedPart,
        typeof FilePart,
        typeof ToolPart,
        typeof ToolResultPart,
        typeof ReasoningPart,
        typeof RedactedReasoningPart
    ]>;
}

export const EffectivePart: EffectivePart.Schema = S.Union(
    TextPart,
    ImagePart,
    ImageUrlPart,
    ToolCallPart,
    ToolCallResolvedPart,
    FilePart,
    ToolPart,
    ToolResultPart,
    ReasoningPart,
    RedactedReasoningPart
);

/**
 * Schema type for all possible part types
 */
export type EffectivePartType = S.Schema.Type<typeof EffectivePart>;

/**
 * Role types for messages
 */
export class User extends S.Class<User>("User")({
    kind: S.Literal("user")
}) {
    constructor() {
        super({ kind: "user" });
    }
}

export class UserWithName extends S.Class<UserWithName>("UserWithName")({
    kind: S.Literal("user"),
    name: S.String
}) {
    constructor(name: string) {
        super({ kind: "user", name });
    }
}

export class Model extends S.Class<Model>("Model")({
    kind: S.Literal("model")
}) {
    constructor() {
        super({ kind: "model" });
    }
}

export type Role = User | Model;

/**
 * Message schema containing role and parts
 */
export class Message extends S.Class<Message>("Message")({
    role: S.Union(User, Model),
    parts: S.Chunk(EffectivePart)
}) {
    static fromInput(finalPrompt: string): any {
        throw new Error("Method not implemented.");
    }
    constructor(props: { role: Role; parts: Chunk.Chunk<EffectivePartType> }) {
        super(props);
    }
}