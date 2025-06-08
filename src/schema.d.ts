/**
 * @file Defines core Effect schemas used across the application.
 */
import { Schema as S } from "effect";
/**
 * Schema for model roles.
 */
export declare const EffectiveRole: S.Union<[S.Literal<["user"]>, S.Literal<["model"]>, S.Literal<["system"]>, S.Literal<["assistant"]>, S.Literal<["tool"]>]>;
export type EffectiveRole = S.Schema.Type<typeof EffectiveRole>;
declare const TextPart_base: S.Class<TextPart, {
    _tag: S.Literal<["Text"]>;
    content: typeof S.String;
}, S.Struct.Encoded<{
    _tag: S.Literal<["Text"]>;
    content: typeof S.String;
}>, never, {
    readonly content: string;
} & {
    readonly _tag: "Text";
}, {}, {}>;
/**
 * Text part in a message
 */
export declare class TextPart extends TextPart_base {
}
declare const ToolCallPart_base: S.Class<ToolCallPart, {
    _tag: S.Literal<["ToolCall"]>;
    toolCall: typeof S.String;
}, S.Struct.Encoded<{
    _tag: S.Literal<["ToolCall"]>;
    toolCall: typeof S.String;
}>, never, {
    readonly _tag: "ToolCall";
} & {
    readonly toolCall: string;
}, {}, {}>;
/**
 * Tool call part in a message
 */
export declare class ToolCallPart extends ToolCallPart_base {
}
declare const ImageUrlPart_base: S.Class<ImageUrlPart, {
    _tag: S.Literal<["ImageUrl"]>;
    url: typeof S.String;
}, S.Struct.Encoded<{
    _tag: S.Literal<["ImageUrl"]>;
    url: typeof S.String;
}>, never, {
    readonly _tag: "ImageUrl";
} & {
    readonly url: string;
}, {}, {}>;
/**
 * Image URL part in a message
 */
export declare class ImageUrlPart extends ImageUrlPart_base {
}
/**
 * Union type for all message parts
 */
export type Part = TextPart | ToolCallPart | ImageUrlPart;
/**
 * Schema for a name identifier with length and pattern constraints.
 */
export declare const Name: S.filter<S.filter<S.filter<typeof S.String>>>;
/**
 * Schema for a short identifier with length and pattern constraints.
 */
export declare const Identifier: S.filter<S.filter<S.filter<typeof S.String>>>;
/**
 * Schema for semantic versioning strings (e.g., 0.1.0).
 */
export declare const Version: S.filter<typeof S.String>;
/**
 * Schema for URLs with validation.
 */
export declare const Url: S.filter<typeof S.String>;
/**
 * Schema for descriptions with max length.
 */
export declare const Description: S.filter<typeof S.String>;
/**
 * Schema representing a positive integer.
 */
export declare const PositiveInt: S.filter<S.filter<typeof S.Number>>;
/**
 * Schema representing a non-negative number.
 */
export declare const PositiveNumber: S.filter<typeof S.Number>;
declare const MetadataRecord_base: S.Class<MetadataRecord, {
    key: typeof S.String;
    value: typeof S.Unknown;
}, S.Struct.Encoded<{
    key: typeof S.String;
    value: typeof S.Unknown;
}>, never, {
    readonly key: string;
} & {
    readonly value: unknown;
}, {}, {}>;
/**
 * Schema for metadata records.
 */
export declare class MetadataRecord extends MetadataRecord_base {
}
declare const MetadataMap_base: S.Class<MetadataMap, {
    entries: S.Record$<typeof S.String, typeof MetadataRecord>;
}, S.Struct.Encoded<{
    entries: S.Record$<typeof S.String, typeof MetadataRecord>;
}>, never, {
    readonly entries: {
        readonly [x: string]: MetadataRecord;
    };
}, {}, {}>;
export declare class MetadataMap extends MetadataMap_base {
}
/**
 * Base schema for database entities with standard metadata fields.
 * Used as the foundation for entity schemas across services.
 */
export declare const BaseEntitySchema: S.Struct<{
    /** Unique identifier for the entity */
    id: typeof S.String;
    /** When the entity was created */
    createdAt: typeof S.Date;
    /** When the entity was last updated */
    updatedAt: typeof S.Date;
}>;
/**
 * Type for the base entity structure.
 */
export type BaseEntity = S.Schema.Type<typeof BaseEntitySchema>;
/**
 * Schema for model capabilities.
 */
export declare const ModelCapability: S.Union<[S.Literal<["text-generation"]>, S.Literal<["chat"]>, S.Literal<["function-calling"]>, S.Literal<["vision"]>, S.Literal<["reasoning"]>, S.Literal<["code-generation"]>, S.Literal<["audio"]>, S.Literal<["image-generation"]>, S.Literal<["embeddings"]>, S.Literal<["tool-use"]>, S.Literal<["search"]>, S.Literal<["research"]>]>;
export type ModelCapability = S.Schema.Type<typeof ModelCapability>;
/**
 * Schema for model context window size.
 */
export declare const ContextWindowSize: S.filter<S.filter<typeof S.Number>>;
declare const RateLimit_base: S.Class<RateLimit, {
    /** Maximum requests per minute */
    requestsPerMinute: S.optional<S.filter<S.filter<typeof S.Number>>>;
    /** Maximum tokens per minute */
    tokensPerMinute: S.optional<S.filter<S.filter<typeof S.Number>>>;
    /** Optional scope for rate limiting */
    scope: S.optional<S.Union<[S.Literal<["user"]>, S.Literal<["global"]>]>>;
}, S.Struct.Encoded<{
    /** Maximum requests per minute */
    requestsPerMinute: S.optional<S.filter<S.filter<typeof S.Number>>>;
    /** Maximum tokens per minute */
    tokensPerMinute: S.optional<S.filter<S.filter<typeof S.Number>>>;
    /** Optional scope for rate limiting */
    scope: S.optional<S.Union<[S.Literal<["user"]>, S.Literal<["global"]>]>>;
}>, never, {
    readonly requestsPerMinute?: number | undefined;
} & {
    readonly tokensPerMinute?: number | undefined;
} & {
    readonly scope?: "user" | "global" | undefined;
}, {}, {}>;
/**
 * Schema for rate limit information.
 * Used across services for controlling API usage.
 */
export declare class RateLimit extends RateLimit_base {
}
declare const SubDimensionProficiency_base: S.Class<SubDimensionProficiency, {}, S.Struct.Encoded<{}>, never, unknown, {}, {}>;
/** Describes proficiency for a specific sub-dimension of a capability */
export declare class SubDimensionProficiency extends SubDimensionProficiency_base {
}
/**
 * Schema for a name field.
 * Must be a non-empty string.
 */
export declare const NameField: S.filter<typeof S.String>;
/**
 * Schema for a description field.
 * Must be a non-empty string.
 */
export declare const DescriptionField: S.filter<typeof S.String>;
/**
 * Schema for metadata records.
 * Allows any JSON-serializable value.
 */
export declare const Metadata: S.Record$<typeof S.String, typeof S.Unknown>;
declare const Message_base: S.Class<Message, {
    /** Role of the message sender */
    role: S.Union<[S.Literal<["user"]>, S.Literal<["model"]>, S.Literal<["system"]>, S.Literal<["assistant"]>, S.Literal<["tool"]>]>;
    /** Parts that make up the message content */
    parts: S.Chunk<S.Union<[typeof TextPart, typeof ToolCallPart, typeof ImageUrlPart]>>;
    /** Optional metadata */
    metadata: S.optional<S.Record$<typeof S.String, typeof S.Unknown>>;
}, S.Struct.Encoded<{
    /** Role of the message sender */
    role: S.Union<[S.Literal<["user"]>, S.Literal<["model"]>, S.Literal<["system"]>, S.Literal<["assistant"]>, S.Literal<["tool"]>]>;
    /** Parts that make up the message content */
    parts: S.Chunk<S.Union<[typeof TextPart, typeof ToolCallPart, typeof ImageUrlPart]>>;
    /** Optional metadata */
    metadata: S.optional<S.Record$<typeof S.String, typeof S.Unknown>>;
}>, never, {
    readonly role: "user" | "model" | "system" | "assistant" | "tool";
} & {
    readonly parts: import("effect/Chunk").Chunk<TextPart | ToolCallPart | ImageUrlPart>;
} & {
    readonly metadata?: {
        readonly [x: string]: unknown;
    } | undefined;
}, {}, {}>;
/**
 * Schema for a message in a conversation.
 */
export declare class Message extends Message_base {
}
export { Message as EffectiveMessage };
export type { Part as EffectiveLocalPart };
//# sourceMappingURL=schema.d.ts.map