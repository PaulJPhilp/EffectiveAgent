/**
 * @file Defines globally shared primitive types for the application services.
 */
import { EffectiveMessage } from "@/schema.js";
import { Schema as S } from "effect";
/**
 * Core input type for AI operations.
 * Used across pipeline and AI services.
 */
export class EffectiveInput extends S.Class("EffectiveInput")({
    /** The input text/prompt to process */
    text: S.String,
    /** Messages in the conversation */
    messages: S.Chunk(EffectiveMessage),
    /** Optional metadata for the request */
    metadata: S.optional(S.Struct({
        /** Operation name for tracing */
        operationName: S.optional(S.String),
        /** Model parameters */
        parameters: S.optional(S.Struct({
            temperature: S.optional(S.Number),
            maxTokens: S.optional(S.Number),
            topP: S.optional(S.Number),
            frequencyPenalty: S.optional(S.Number),
            presencePenalty: S.optional(S.Number),
            stop: S.optional(S.Array(S.String))
        })),
        /** Provider-specific metadata */
        providerMetadata: S.optional(S.Record({ key: S.String, value: S.Unknown }))
    }))
}) {
    constructor(text, messages, metadata) {
        super({ text, messages, metadata });
    }
}
/**
 * Error thrown when tool execution fails
 */
export class ToolExecutionError extends Error {
    description;
    module;
    method;
    cause;
    _tag = "ToolExecutionError";
    constructor(description, module, method, cause) {
        super(description);
        this.description = description;
        this.module = module;
        this.method = method;
        this.cause = cause;
        this.name = "ToolExecutionError";
    }
}
/**
 * Error thrown when tool input validation fails
 */
export class ToolInputValidationError extends Error {
    description;
    module;
    method;
    cause;
    _tag = "ToolInputValidationError";
    constructor(description, module, method, cause) {
        super(description);
        this.description = description;
        this.module = module;
        this.method = method;
        this.cause = cause;
        this.name = "ToolInputValidationError";
    }
}
/**
 * Error thrown when tool output validation fails
 */
export class ToolOutputValidationError extends Error {
    description;
    module;
    method;
    cause;
    _tag = "ToolOutputValidationError";
    constructor(description, module, method, cause) {
        super(description);
        this.description = description;
        this.module = module;
        this.method = method;
        this.cause = cause;
        this.name = "ToolOutputValidationError";
    }
}
// Re-export for backward compatibility
export { EffectiveMessage };
//# sourceMappingURL=types.js.map