/**
 * @file Defines specific errors for the AI Provider configuration loading process.
 * @module services/ai/provider/errors
 */
import { EffectiveError } from "@/errors.js";
import { PROVIDER_NAMES } from "./provider-universe.js";
import type { ModelCapability } from "./types.js";
type ProvidersType = typeof PROVIDER_NAMES[number];
/**
 * Base error type for provider-related errors
 */
/**
 * Base error type for provider-related errors.
 * @extends EffectiveError
 */
export declare class ProviderServiceError extends EffectiveError {
    readonly providerName: string;
    /**
     * @param params - Error details
     * @param params.providerName - The provider's name
     * @param params.description - Error description
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params: {
        providerName: string;
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error class for failures related to loading, parsing, or validating
 * the provider configuration.
 */
/**
 * Error class for failures related to loading, parsing, or validating the provider configuration.
 * @extends EffectiveError
 */
export declare class ProviderServiceConfigError extends EffectiveError {
    /**
     * @param params - Error details
     * @param params.description - Error description
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when a provider is not found
 */
/**
 * Error thrown when a provider is not found.
 * @extends EffectiveError
 */
export declare class ProviderNotFoundError extends EffectiveError {
    readonly providerName: string;
    /**
     * @param params - Error details
     * @param params.providerName - Provider name
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params: {
        providerName: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when an API key is missing for a provider
 */
/**
 * Error thrown when an API key is missing for a provider.
 * @extends EffectiveError
 */
export declare class ProviderMissingApiKeyError extends EffectiveError {
    readonly providerName: string;
    /**
     * @param params - Error details
     * @param params.providerName - Provider name
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params: {
        providerName: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when an API key is invalid for a provider
 */
/**
 * Error thrown when an API key is invalid for a provider.
 * @extends EffectiveError
 */
export declare class ProviderInvalidApiKeyError extends EffectiveError {
    readonly providerName: string;
    /**
     * @param params - Error details
     * @param params.providerName - Provider name
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params: {
        providerName: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when a provider is missing a required capability
 */
/**
 * Error thrown when a provider is missing a required capability.
 * @extends EffectiveError
 */
export declare class ProviderMissingCapabilityError extends EffectiveError {
    readonly providerName: ProvidersType;
    readonly capability: ModelCapability;
    /**
     * @param params - Error details
     * @param params.providerName - Provider name
     * @param params.capability - Capability
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params: {
        providerName: ProvidersType;
        capability: ModelCapability;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when a provider operation fails
 */
/**
 * Error thrown when a provider operation fails.
 * @extends EffectiveError
 */
export declare class ProviderOperationError extends EffectiveError {
    readonly operation: string;
    readonly providerName: string;
    /**
     * @param params - Error details
     * @param params.operation - Operation name
     * @param params.message - Error message
     * @param params.providerName - Provider name
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params: {
        operation: string;
        message: string;
        providerName: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
export declare class NoAudioFileError extends ProviderOperationError {
    constructor();
}
/**
 * Error thrown when input is empty
 */
/**
 * Error thrown when input is empty.
 * @extends EffectiveError
 */
export declare class ProviderEmptyInputError extends EffectiveError {
    /**
     * @param params - Error details
     * @param params.message - Error message
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params: {
        message: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when text generation fails.
 * @extends EffectiveError
 */
export declare class GenerateTextError extends EffectiveError {
    /**
     * @param params - Error details
     * @param params.description - Error message
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when object generation fails.
 * @extends EffectiveError
 */
export declare class GenerateObjectError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when speech generation fails.
 * @extends EffectiveError
 */
export declare class GenerateSpeechError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when transcription fails.
 * @extends EffectiveError
 */
export declare class TranscribeError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when embedding generation fails.
 * @extends EffectiveError
 */
export declare class GenerateEmbeddingsError extends EffectiveError {
    /**
     * @param params - Error details
     * @param params.description - Error message
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when a default model ID cannot be determined for a given provider and capability.
 * @extends EffectiveError
 */
export declare class ProviderMissingModelIdError extends EffectiveError {
    readonly providerName: ProvidersType;
    readonly capability: ModelCapability;
    /**
     * @param params - Error details
     * @param params.providerName - Provider name
     * @param params.capability - Capability for which a model ID was missing
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params: {
        providerName: ProvidersType;
        capability: ModelCapability;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when a provider tool operation fails
 */
export declare class ProviderToolError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
        provider?: string;
    });
}
/**
 * Error thrown when a tool execution fails
 */
export declare class ToolExecutionError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
        toolName?: string;
    });
}
/**
 * Error thrown when tool validation fails
 */
export declare class ToolValidationError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
        toolName?: string;
    });
}
/**
 * Error thrown when tool configuration is invalid
 */
export declare class ToolConfigurationError extends EffectiveError {
    constructor(params: {
        description: string;
        module?: string;
        method?: string;
        cause?: unknown;
        toolName?: string;
    });
}
export {};
//# sourceMappingURL=errors.d.ts.map