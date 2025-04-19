import { Schema as S } from "effect"

export const Name = S.String.pipe(S.minLength(1), S.maxLength(64), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$")))
export const Identifier = S.String.pipe(S.minLength(1), S.maxLength(16), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,16}$")))

/**
 * Schema representing a positive integer.
 */
export const PositiveInt = S.Number.pipe(
    S.int(),
    S.greaterThan(0),
);

export const PositiveNumber = S.Number.pipe(
    S.greaterThanOrEqualTo(0)
);


export const Metadata = S.Record({
    key: S.String,
    value: S.Unknown
});

export const Version = S.String.pipe(
    S.pattern(/^\d+\.\d+\.\d+$/) // e.g., 0.1.0
);

export const ModelCapability = S.Literal(
    "text-generation", "chat", "function-calling", "vision", "reasoning",
    "code-generation", "audio", "image-generation", "embeddings", "tool-use"
);

export const ContextWindowSize = S.Literal("small", "medium", "large");

export const Description = S.String.pipe(S.maxLength(256));

/**
 * Schema for the core structure of rate limit information.
 */
export class RateLimit extends S.Class<RateLimit>("RateLimit")({
    requestsPerMinute: PositiveInt.pipe(S.optional),
    tokensPerMinute: PositiveInt.pipe(S.optional),
}) {}

export const Url = S.String.pipe(S.pattern(/^https?:\/\/[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!$&'()*+,;=.]+$/));
