/**
 * @file Base error types for AI services aligned with Vercel AI SDK
 * @module services/ai/errors
 */

import { Effect } from "effect"
import { EffectiveError } from "@/errors.js"

/**
 * Base error class for all AI service errors
 */
export class AIError extends EffectiveError {
    readonly code: string

    constructor(params: {
        message: string
        code?: string
        module?: string
        method?: string
        cause?: unknown
    }) {
        super({
            description: params.message,
            module: params.module || "ai",
            method: params.method || "unknown",
            cause: params.cause
        })
        this.code = params.code || "ai_error"
    }
}

/**
 * Base error class for AI-related errors
 */
export class ChatCompletionError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "ChatCompletion",
            method: params.method ?? "execute",
        });
    }
}

export class ChatModelError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "ChatModel",
            method: params.method ?? "execute",
        });
    }
}

export class ChatProviderError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "ChatProvider",
            method: params.method ?? "execute",
        });
    }
}

/**
 * Error thrown when authentication fails with the AI provider
 */
export class AuthenticationError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "Authentication",
            method: params.method ?? "authenticate",
        });
    }
}

/**
 * Error thrown when rate limits are exceeded
 */
export class RateLimitError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "RateLimit",
            method: params.method ?? "check",
        });
    }
}

/**
 * Error thrown when the request is invalid
 */
export class InvalidRequestError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "Request",
            method: params.method ?? "validate",
        });
    }
}

/**
 * Error thrown when the model is not found or invalid
 */
export class ModelError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "Model",
            method: params.method ?? "execute",
        });
    }
}

/**
 * Error thrown when the context length is exceeded
 */
export class ContextLengthError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "Context",
            method: params.method ?? "validate",
        });
    }
}

/**
 * Error thrown when there are content filtering/moderation issues
 */
export class ContentFilterError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "ContentFilter",
            method: params.method ?? "check",
        });
    }
}

/**
 * Error thrown when there are issues with the provider configuration
 */
export class ProviderConfigError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "ProviderConfig",
            method: params.method ?? "configure",
        });
    }
}

/**
 * Error thrown when the provider API returns an error
 */
export class ProviderAPIError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
        status?: number;
    }) {
        super({
            ...params,
            module: params.module ?? "ProviderAPI",
            method: params.method ?? "call",
        });
    }
}

/**
 * Error thrown when a timeout occurs
 */
export class TimeoutError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "Timeout",
            method: params.method ?? "check",
        });
    }
}

/**
 * Error thrown when there are streaming issues
 */
export class StreamingError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "Streaming",
            method: params.method ?? "process",
        });
    }
}

/**
 * Error thrown when there are validation issues
 */
export class ValidationError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "Validation",
            method: params.method ?? "validate",
        });
    }
}

/**
 * Error thrown when there are parsing issues
 */
export class ParsingError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "Parsing",
            method: params.method ?? "parse",
        });
    }
}

/**
 * Error thrown when there are rendering issues
 */
export class RenderingError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "Rendering",
            method: params.method ?? "render",
        });
    }
}

/**
 * Error thrown when there are parsing issues
 */
export class TemplateNotFoundError extends EffectiveError {
    readonly templateName: string;
    constructor(params: {
        description: string;
        templateName: string; // Added templateName
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            description: params.description,
            module: params.module ?? "Template",
            method: params.method ?? "find",
            cause: params.cause
        });
        this.templateName = params.templateName;
    }
}

export class PromptConfigError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "PromptConfig",
            method: params.method ?? "configure",
        });
    }
}

/**
 * Error thrown when input messages or content is empty when required
 */
export class EmptyInputError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "Input",
            method: params.method ?? "validate",
        });
    }
}

/**
 * Error thrown when a required model ID is missing
 */
export class MissingModelIdError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: params.module ?? "Model",
            method: params.method ?? "validate",
        });
    }
}

/**
 * Helper to map provider errors to our error types
 */
export function mapProviderError(error: Error): EffectiveError {
    if (error.message.includes("rate limit")) {
        return new RateLimitError({
            description: "Rate limit exceeded",
            cause: error,
        });
    }
    if (error.message.includes("authentication")) {
        return new AuthenticationError({
            description: "Authentication failed",
            cause: error,
        });
    }
    return new ProviderAPIError({
        description: "Provider API error",
        cause: error,
    });
}

/**
 * Effect middleware to map provider errors
 */
export const withErrorMapping = <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, EffectiveError, A> =>
    Effect.mapError(effect, (error) =>
        error instanceof Error ? mapProviderError(error) : new EffectiveError({
            description: "Unknown error",
            module: "Unknown",
            method: "unknown",
            cause: error,
        })
    )