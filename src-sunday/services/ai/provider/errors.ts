/**
 * @file Defines errors specific to the AI Provider service.
 */

import { AppError } from "../../errors.js"; // Import global base error

/** Base error for AI Provider operations. */
export class ProviderError extends AppError {
    constructor(params: {
        provider: string; // Name of the provider that caused the error
        modelId?: string; // Specific model ID if relevant
        message: string;
        cause?: unknown;
        context?: Record<string, unknown>;
        isRetryable?: boolean; // Optional flag for retry logic
    }) {
        super({
            message: `Provider Error (${params.provider}): ${params.message}`,
            cause: params.cause,
            // Add provider/model to context automatically
            context: { ...params.context, provider: params.provider, modelId: params.modelId, isRetryable: params.isRetryable ?? false, errorType: "ProviderError" },
        });
    }
}

/** Error related to authentication (e.g., invalid API key). */
export class AuthenticationError extends ProviderError {
    constructor(params: Omit<ConstructorParameters<typeof ProviderError>[0], "message"> & { message?: string }) {
        super({
            ...params,
            message: params.message ?? "Authentication failed. Check API key or environment variable.",
            isRetryable: false, // Auth errors are usually not retryable
            context: { ...params.context, errorType: "AuthenticationError" },
        });
    }
}

/** Error indicating rate limits have been exceeded. */
export class RateLimitError extends ProviderError {
    constructor(params: Omit<ConstructorParameters<typeof ProviderError>[0], "message"> & { message?: string; retryAfter?: number /* seconds */ }) {
        super({
            ...params,
            message: params.message ?? "Rate limit exceeded.",
            isRetryable: true, // Rate limit errors are often retryable after a delay
            context: { ...params.context, retryAfter: params.retryAfter, errorType: "RateLimitError" }
        });
    }
}

/** Generic error for unexpected API responses or server issues from the provider. */
export class ApiError extends ProviderError {
    constructor(params: Omit<ConstructorParameters<typeof ProviderError>[0], "message"> & { message?: string; statusCode?: number }) {
        super({
            ...params,
            message: params.message ?? `API request failed with status ${params.statusCode ?? 'unknown'}.`,
            isRetryable: params.statusCode === undefined || params.statusCode >= 500, // Server errors might be retryable
            context: { ...params.context, statusCode: params.statusCode, errorType: "ApiError" }
        });
    }
}

/** Error indicating the requested model is not found or not supported by the provider. */
export class ModelNotFoundError extends ProviderError {
    constructor(params: Omit<ConstructorParameters<typeof ProviderError>[0], "message"> & { message?: string }) {
        super({
            ...params,
            message: params.message ?? `Model '${params.modelId ?? 'unknown'}' not found or not supported by provider '${params.provider}'.`,
            isRetryable: false,
            context: { ...params.context, errorType: "ModelNotFoundError" },
        });
    }
}

/** Error indicating an invalid request structure or parameters sent to the provider API. */
export class InvalidRequestError extends ProviderError {
    constructor(params: Omit<ConstructorParameters<typeof ProviderError>[0], "message"> & { message?: string }) {
        super({
            ...params,
            message: params.message ?? "Invalid request sent to the provider API.",
            isRetryable: false, // Usually indicates a client-side error
            context: { ...params.context, errorType: "InvalidRequestError" },
        });
    }
}

/** Error related to loading or accessing provider configuration. */
export class ProviderConfigurationError extends AppError { // Extends AppError directly
    constructor(params: { message: string; cause?: unknown; context?: Record<string, unknown> }) {
        super({
            message: `Provider Configuration Error: ${params.message}`,
            cause: params.cause,
            context: { ...params.context, errorType: "ProviderConfigurationError" },
        });
    }
}
