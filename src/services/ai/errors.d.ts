/**
 * @file Base error types for AI services aligned with Vercel AI SDK
 * @module services/ai/errors
 */
import { EffectiveError } from "@/errors.js";
import { Effect } from "effect";
/**
 * Base error class for all AI service errors
 */
export declare class AIError extends EffectiveError {
    readonly code: string;
    constructor(params: {
        message: string;
        code?: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Base error class for AI-related errors
 */
export declare class ChatCompletionError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
export declare class ChatModelError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
export declare class ChatProviderError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when authentication fails with the AI provider
 */
export declare class AuthenticationError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when rate limits are exceeded
 */
export declare class RateLimitError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when the request is invalid
 */
export declare class InvalidRequestError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when the model is not found or invalid
 */
export declare class ModelError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when the context length is exceeded
 */
export declare class ContextLengthError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when there are content filtering/moderation issues
 */
export declare class ContentFilterError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when there are issues with the provider configuration
 */
export declare class ProviderConfigError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when the provider API returns an error
 */
export declare class ProviderAPIError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
        status?: number;
    });
}
/**
 * Error thrown when a timeout occurs
 */
export declare class TimeoutError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when there are streaming issues
 */
export declare class StreamingError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when there are validation issues
 */
export declare class ValidationError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when there are parsing issues
 */
export declare class ParsingError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when there are rendering issues
 */
export declare class RenderingError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when there are parsing issues
 */
export declare class TemplateNotFoundError extends EffectiveError {
    readonly templateName: string;
    constructor(params: {
        description: string;
        templateName: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
export declare class PromptConfigError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when input messages or content is empty when required
 */
export declare class EmptyInputError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when a required model ID is missing
 */
export declare class MissingModelIdError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
    });
}
/**
 * Helper to map provider errors to our error types
 */
export declare function mapProviderError(error: Error): EffectiveError;
/**
 * Effect middleware to map provider errors
 */
export declare const withErrorMapping: <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, EffectiveError, A>;
//# sourceMappingURL=errors.d.ts.map