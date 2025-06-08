/**
 * @file Defines specific errors for the AI Provider configuration loading process.
 * @module services/ai/provider/errors
 */
import { EffectiveError } from "@/errors.js";
/**
 * Base error type for provider-related errors
 */
/**
 * Base error type for provider-related errors.
 * @extends EffectiveError
 */
export class ProviderServiceError extends EffectiveError {
    providerName;
    /**
     * @param params - Error details
     * @param params.providerName - The provider's name
     * @param params.description - Error description
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params) {
        super({ description: params.description, cause: params.cause, module: params.module, method: params.method });
        this.providerName = params.providerName;
    }
}
/**
 * Error class for failures related to loading, parsing, or validating
 * the provider configuration.
 */
/**
 * Error class for failures related to loading, parsing, or validating the provider configuration.
 * @extends EffectiveError
 */
export class ProviderServiceConfigError extends EffectiveError {
    /**
     * @param params - Error details
     * @param params.description - Error description
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params) {
        super(params);
    }
}
/**
 * Error thrown when a provider is not found
 */
/**
 * Error thrown when a provider is not found.
 * @extends EffectiveError
 */
export class ProviderNotFoundError extends EffectiveError {
    providerName;
    /**
     * @param params - Error details
     * @param params.providerName - Provider name
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params) {
        super({
            description: `Provider ${params.providerName} not found`,
            module: params.module,
            method: params.method,
            cause: params.cause
        });
        this.providerName = params.providerName;
    }
}
/**
 * Error thrown when an API key is missing for a provider
 */
/**
 * Error thrown when an API key is missing for a provider.
 * @extends EffectiveError
 */
export class ProviderMissingApiKeyError extends EffectiveError {
    providerName;
    /**
     * @param params - Error details
     * @param params.providerName - Provider name
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params) {
        super({
            description: `Missing API key for provider ${params.providerName}`,
            module: params.module,
            method: params.method,
            cause: params.cause
        });
        this.providerName = params.providerName;
    }
}
/**
 * Error thrown when an API key is invalid for a provider
 */
/**
 * Error thrown when an API key is invalid for a provider.
 * @extends EffectiveError
 */
export class ProviderInvalidApiKeyError extends EffectiveError {
    providerName;
    /**
     * @param params - Error details
     * @param params.providerName - Provider name
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params) {
        super({
            description: `Invalid API key for provider ${params.providerName}`,
            module: params.module,
            method: params.method,
            cause: params.cause
        });
        this.providerName = params.providerName;
    }
}
/**
 * Error thrown when a provider is missing a required capability
 */
/**
 * Error thrown when a provider is missing a required capability.
 * @extends EffectiveError
 */
export class ProviderMissingCapabilityError extends EffectiveError {
    providerName;
    capability;
    /**
     * @param params - Error details
     * @param params.providerName - Provider name
     * @param params.capability - Capability
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params) {
        super({
            description: `Provider ${params.providerName} does not support ${params.capability}`,
            module: params.module,
            method: params.method,
            cause: params.cause
        });
        this.providerName = params.providerName;
        this.capability = params.capability;
    }
}
/**
 * Error thrown when a provider operation fails
 */
/**
 * Error thrown when a provider operation fails.
 * @extends EffectiveError
 */
export class ProviderOperationError extends EffectiveError {
    operation;
    providerName;
    /**
     * @param params - Error details
     * @param params.operation - Operation name
     * @param params.message - Error message
     * @param params.providerName - Provider name
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params) {
        super({
            description: `Provider operation '${params.operation}' failed: ${params.message}`,
            module: params.module,
            method: params.method,
            cause: params.cause
        });
        this.operation = params.operation;
        this.providerName = params.providerName;
    }
}
export class NoAudioFileError extends ProviderOperationError {
    constructor() {
        super({
            operation: "extractAudioForTranscription",
            message: "No audio file found in EffectiveInput for transcription.",
            providerName: "unknown",
            module: "ProviderHelpers",
            method: "extractAudioForTranscription"
        });
    }
}
/**
 * Error thrown when input is empty
 */
/**
 * Error thrown when input is empty.
 * @extends EffectiveError
 */
export class ProviderEmptyInputError extends EffectiveError {
    /**
     * @param params - Error details
     * @param params.message - Error message
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params) {
        super({
            description: `Empty input error: ${params.message}`,
            module: params.module,
            method: params.method,
            cause: params.cause
        });
    }
}
/**
 * Error thrown when text generation fails.
 * @extends EffectiveError
 */
export class GenerateTextError extends EffectiveError {
    /**
     * @param params - Error details
     * @param params.description - Error message
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params) {
        super(params);
    }
}
/**
 * Error thrown when object generation fails.
 * @extends EffectiveError
 */
export class GenerateObjectError extends EffectiveError {
    constructor(params) {
        super(params);
    }
}
/**
 * Error thrown when speech generation fails.
 * @extends EffectiveError
 */
export class GenerateSpeechError extends EffectiveError {
    constructor(params) {
        super(params);
    }
}
/**
 * Error thrown when transcription fails.
 * @extends EffectiveError
 */
export class TranscribeError extends EffectiveError {
    constructor(params) {
        super(params);
    }
}
/**
 * Error thrown when embedding generation fails.
 * @extends EffectiveError
 */
export class GenerateEmbeddingsError extends EffectiveError {
    /**
     * @param params - Error details
     * @param params.description - Error message
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params) {
        super(params);
    }
}
/**
 * Error thrown when a default model ID cannot be determined for a given provider and capability.
 * @extends EffectiveError
 */
export class ProviderMissingModelIdError extends EffectiveError {
    providerName;
    capability;
    /**
     * @param params - Error details
     * @param params.providerName - Provider name
     * @param params.capability - Capability for which a model ID was missing
     * @param params.module - Module name
     * @param params.method - Method name
     * @param params.cause - Optional cause
     */
    constructor(params) {
        super({
            description: `Could not determine a default model ID for provider ${params.providerName} and capability ${params.capability}`,
            module: params.module,
            method: params.method,
            cause: params.cause
        });
        this.providerName = params.providerName;
        this.capability = params.capability;
    }
}
/**
 * Error thrown when a provider tool operation fails
 */
export class ProviderToolError extends EffectiveError {
    constructor(params) {
        super({
            ...params,
            module: params.module ?? `Provider:${params.provider ?? "Unknown"}`,
            method: params.method ?? "toolOperation"
        });
    }
}
/**
 * Error thrown when a tool execution fails
 */
export class ToolExecutionError extends EffectiveError {
    constructor(params) {
        super({
            ...params,
            module: params.module ?? `Tool:${params.toolName ?? "Unknown"}`,
            method: params.method ?? "execute"
        });
    }
}
/**
 * Error thrown when tool validation fails
 */
export class ToolValidationError extends EffectiveError {
    constructor(params) {
        super({
            ...params,
            module: params.module ?? `Tool:${params.toolName ?? "Unknown"}`,
            method: params.method ?? "validate"
        });
    }
}
/**
 * Error thrown when tool configuration is invalid
 */
export class ToolConfigurationError extends EffectiveError {
    constructor(params) {
        super({
            ...params,
            module: params.module ?? `Tool:${params.toolName ?? "Unknown"}`,
            method: params.method ?? "configure"
        });
    }
}
//# sourceMappingURL=errors.js.map