/**
 * @file Base error types for AI services aligned with Vercel AI SDK
 * @module services/ai/errors
 */

import { Effect } from "effect"

/**
 * Base error class for all AI service errors
 */
export class AIError extends Error {
    constructor(message: string, options?: ErrorOptions & {
        code?: string
        name?: string
        module?: string
        method?: string
    }) {
        super(message, options)
        this.name = options?.name || "AIError"
        this.code = options?.code || "ai_error"
        this.module = options?.module || "ai"
        this.method = options?.method || "unknown"
    }

    readonly code: string
    readonly module: string
    readonly method: string
}

export class ChatCompletionError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "chat_completion_error",
        })
    }
}

export class ChatModelError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "chat_model_error",
        })
    }
}

export class ChatProviderError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "chat_provider_error",
        })
    }
}

/**
 * Error thrown when authentication fails with the AI provider
 */
export class AuthenticationError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "authentication_error",
            name: "AuthenticationError"
        })
    }
}

/**
 * Error thrown when rate limits are exceeded
 */
export class RateLimitError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "rate_limit_error",
            name: "RateLimitError"
        })
    }
}

/**
 * Error thrown when the request is invalid
 */
export class InvalidRequestError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "invalid_request_error",
            name: "InvalidRequestError"
        })
    }
}

/**
 * Error thrown when the model is not found or invalid
 */
export class ModelError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "model_error",
            name: "ModelError"
        })
    }
}

/**
 * Error thrown when the context length is exceeded
 */
export class ContextLengthError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "context_length_exceeded",
            name: "ContextLengthError"
        })
    }
}

/**
 * Error thrown when there are content filtering/moderation issues
 */
export class ContentFilterError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "content_filter_error",
            name: "ContentFilterError"
        })
    }
}

/**
 * Error thrown when there are issues with the provider configuration
 */
export class ProviderConfigError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "provider_config_error",
            name: "ProviderConfigError"
        })
    }
}

/**
 * Error thrown when the provider API returns an error
 */
export class ProviderAPIError extends AIError {
    constructor(message: string, options?: ErrorOptions & {
        status?: number
        response?: unknown
    }) {
        super(message, {
            ...options,
            code: "provider_api_error",
            name: "ProviderAPIError"
        })
        this.status = options?.status
        this.response = options?.response
    }

    readonly status?: number
    readonly response?: unknown
}

/**
 * Error thrown when a timeout occurs
 */
export class TimeoutError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "timeout_error",
            name: "TimeoutError"
        })
    }
}

/**
 * Error thrown when there are streaming issues
 */
export class StreamingError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "streaming_error",
            name: "StreamingError"
        })
    }
}

/**
 * Error thrown when there are validation issues
 */
export class ValidationError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "validation_error",
            name: "ValidationError"
        })
    }
}

/**
 * Error thrown when there are parsing issues
 */
export class ParsingError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "parsing_error",
            name: "ParsingError"
        })
    }
}

/**
 * Error thrown when there are rendering issues
 */
export class RenderingError extends AIError {
    constructor(options: {
        message: string;
        cause?: Error;
        templateSnippet?: string;
        templateName?: string;
    }) {
        super(options.message, {
            cause: options.cause,
            code: "rendering_error",
            name: "RenderingError"
        })
        this.templateSnippet = options.templateSnippet
        this.templateName = options.templateName
    }

    readonly templateSnippet?: string
    readonly templateName?: string
}

/**
 * Error thrown when there are parsing issues
 */
export class TemplateNotFoundError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "template_not_found_error",
            name: "TemplateNotFoundError"
        })
    }
}

export class PromptConfigError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "prompt_config_error",
            name: "PromptConfigError"
        })
    }
}

/**
 * Error thrown when input messages or content is empty when required
 */
export class EmptyInputError extends AIError {
    constructor(options: {
        module: string;
        method: string;
        description?: string;
        cause?: unknown;
    }) {
        super(options.description ?? "Input messages or content cannot be empty", {
            cause: options.cause,
            code: "empty_input_error",
            name: "EmptyInputError",
            module: options.module,
            method: options.method
        });
    }
}

/**
 * Error thrown when a required model ID is missing
 */
export class MissingModelIdError extends AIError {
    constructor(options: {
        module: string;
        method: string;
        description?: string;
        cause?: unknown;
    }) {
        super(options.description ?? "Model ID is required", {
            cause: options.cause,
            code: "missing_model_id_error",
            name: "MissingModelIdError",
            module: options.module,
            method: options.method
        });
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
        error instanceof Error ? mapProviderError(error) : new AIError(String(error))
    )