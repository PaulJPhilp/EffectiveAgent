/**
 * @file Base error types for AI services aligned with Vercel AI SDK
 * @module services/ai/errors
 */

import { EffectiveError } from "@/errors.js"
import { Effect } from "effect"

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

export class ChatCompletionError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "chat_completion_error",
            ...options
        })
    }
}

export class ChatModelError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "chat_model_error",
            ...options
        })
    }
}

export class ChatProviderError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "chat_provider_error",
            ...options
        })
    }
}

/**
 * Error thrown when authentication fails with the AI provider
 */
export class AuthenticationError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "authentication_error",
            ...options
        })
    }
}

/**
 * Error thrown when rate limits are exceeded
 */
export class RateLimitError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "rate_limit_error",
            ...options
        })
    }
}

/**
 * Error thrown when the request is invalid
 */
export class InvalidRequestError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "invalid_request_error",
            ...options
        })
    }
}

/**
 * Error thrown when the model is not found or invalid
 */
export class ModelError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "model_error",
            ...options
        })
    }
}

/**
 * Error thrown when the context length is exceeded
 */
export class ContextLengthError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "context_length_exceeded",
            ...options
        })
    }
}

/**
 * Error thrown when there are content filtering/moderation issues
 */
export class ContentFilterError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "content_filter_error",
            ...options
        })
    }
}

/**
 * Error thrown when there are issues with the provider configuration
 */
export class ProviderConfigError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "provider_config_error",
            ...options
        })
    }
}

/**
 * Error thrown when the provider API returns an error
 */
export class ProviderAPIError extends AIError {
    readonly status?: number
    readonly response?: unknown

    constructor(message: string, options?: ErrorOptions & {
        status?: number
        response?: unknown
    }) {
        super({
            message,
            code: "provider_api_error",
            ...options
        })
        this.status = options?.status
        this.response = options?.response
    }
}

/**
 * Error thrown when a timeout occurs
 */
export class TimeoutError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "timeout_error",
            ...options
        })
    }
}

/**
 * Error thrown when there are streaming issues
 */
export class StreamingError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "streaming_error",
            ...options
        })
    }
}

/**
 * Error thrown when there are validation issues
 */
export class ValidationError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "validation_error",
            ...options
        })
    }
}

/**
 * Error thrown when there are parsing issues
 */
export class ParsingError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "parsing_error",
            ...options
        })
    }
}

/**
 * Error thrown when there are rendering issues
 */
export class RenderingError extends AIError {
    readonly templateSnippet?: string
    readonly templateName?: string

    constructor(options: {
        message: string
        cause?: Error
        templateSnippet?: string
        templateName?: string
    }) {
        super({
            message: options.message,
            code: "rendering_error",
            cause: options.cause
        })
        this.templateSnippet = options.templateSnippet
        this.templateName = options.templateName
    }
}

/**
 * Error thrown when there are parsing issues
 */
export class TemplateNotFoundError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "template_not_found_error",
            ...options
        })
    }
}

export class PromptConfigError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            message,
            code: "prompt_config_error",
            ...options
        })
    }
}

/**
 * Error thrown when input messages or content is empty when required
 */
export class EmptyInputError extends AIError {
    constructor(options: {
        module: string
        method: string
        description?: string
        cause?: unknown
    }) {
        super({
            message: options.description ?? "Input messages or content cannot be empty",
            code: "empty_input_error",
            module: options.module,
            method: options.method,
            cause: options.cause
        })
    }
}

/**
 * Error thrown when a required model ID is missing
 */
export class MissingModelIdError extends AIError {
    constructor(options: {
        module: string
        method: string
        description?: string
        cause?: unknown
    }) {
        super({
            message: options.description ?? "Model ID is required",
            code: "missing_model_id_error",
            module: options.module,
            method: options.method,
            cause: options.cause
        })
    }
}

/**
 * Helper to map provider errors to our error types
 */
export function mapProviderError(error: Error): AIError {
    // Map common provider error patterns
    if (error.name === "AuthenticationError" || error.message.includes("auth")) {
        return new AuthenticationError(error.message, { cause: error })
    }
    if (error.name === "RateLimitError" || error.message.includes("rate limit")) {
        return new RateLimitError(error.message, { cause: error })
    }
    if (error.message.includes("context length") || error.message.includes("token limit")) {
        return new ContextLengthError(error.message, { cause: error })
    }
    if (error.message.includes("content filter") || error.message.includes("moderation")) {
        return new ContentFilterError(error.message, { cause: error })
    }
    if (error.name === "TimeoutError" || error.message.toLowerCase().includes("timed out") || error.message.toLowerCase().includes("timeout")) {
        return new TimeoutError(error.message, { cause: error })
    }

    // Default to provider API error
    return new ProviderAPIError(error.message, { cause: error })
}

/**
 * Effect middleware to map provider errors
 */
export const withErrorMapping = <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, AIError, A> =>
    Effect.mapError(effect, error =>
        error instanceof Error ? mapProviderError(error) : new AIError({
            message: String(error),
            module: "ai",
            method: "unknown"
        })
    )