/**
 * @file Defines error types specific to the AI Model configuration service.
 * @module services/ai/model/errors
 */
import { EffectiveError, EntityLoadError, EntityParseError } from "@/errors.js";
/**
 * Base error type for model-related errors
 */
/**
 * Base error type for model-related errors.
 * @extends EffectiveError
 */
export declare class ModelServiceError extends EffectiveError {
    readonly modelId: string;
    /**
     * @param params - Error details
     * @param params.modelId - The affected model's ID
     * @param params.message - Error message
     * @param params.method - Method where error occurred
     * @param params.cause - Optional cause
     */
    constructor(params: {
        modelId: string;
        message: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error class for failures related to loading, parsing, or validating
 * the AI model configuration (e.g., 'models.json').
 */
/**
 * Error class for failures related to loading, parsing, or validating the AI model configuration.
 * @extends EffectiveError
 */
export declare class ModelConfigError extends EffectiveError {
    /**
     * @param params - Error details
     * @param params.message - Error message
     * @param params.method - Method where error occurred
     * @param params.cause - Underlying error (EntityLoadError | EntityParseError)
     */
    constructor(params: {
        message: string;
        method: string;
        cause: EntityLoadError | EntityParseError;
    });
}
/**
 * Error when a requested model is not found
 */
/**
 * Error when a requested model is not found.
 * @extends EffectiveError
 */
export declare class ModelNotFoundError extends EffectiveError {
    readonly modelId: string;
    /**
     * @param params - Error details
     * @param params.modelId - The missing model's ID
     * @param params.method - Method where error occurred
     * @param params.description - Optional description
     */
    constructor(params: {
        modelId: string;
        method: string;
        description?: string;
    });
}
/**
 * Error when a default model ID cannot be found for a given provider and capability.
 */
/**
 * Error when a default model ID cannot be found for a given provider and capability.
 * @extends EffectiveError
 */
export declare class ModelMissingModelIdError extends EffectiveError {
    readonly provider: string;
    readonly capability: string;
    /**
     * @param params - Error details
     * @param params.provider - Provider name
     * @param params.capability - Capability name
     * @param params.method - Method where error occurred
     */
    constructor(params: {
        provider: string;
        capability: string;
        method: string;
    });
}
/**
 * Error when a model validation fails
 */
/**
 * Error when a model validation fails.
 * @extends EffectiveError
 */
export declare class ModelValidationError extends EffectiveError {
    readonly modelId: string;
    readonly capabilities: string[];
    /**
     * @param params - Error details
     * @param params.modelId - The model's ID
     * @param params.message - Error message
     * @param params.capabilities - Capabilities involved
     * @param params.method - Method where error occurred
     * @param params.cause - Optional cause
     */
    constructor(params: {
        modelId: string;
        message: string;
        capabilities: string[];
        method: string;
        cause?: unknown;
    });
}
//# sourceMappingURL=errors.d.ts.map