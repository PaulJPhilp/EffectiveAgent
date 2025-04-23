/**
 * @file Defines error types specific to the AI Model configuration service.
 * @module services/ai/model/errors
 */

import type { EntityLoadError, EntityParseError } from "@/services/core/errors.js";
import { Data } from "effect";

/**
 * Base error type for model-related errors
 */
export class ModelError extends Data.TaggedError("ModelError")<{
    readonly modelId: string;
    readonly message: string;
    readonly cause?: unknown;
}> { }

/**
 * Error class for failures related to loading, parsing, or validating
 * the AI model configuration (e.g., 'models.json').
 */
export class ModelConfigError extends Data.TaggedError("ModelConfigError")<{
    readonly message: string;
    readonly cause: EntityLoadError | EntityParseError;
}> { }

/**
 * Error when a requested model is not found
 */
export class ModelNotFoundError extends Data.TaggedError("ModelNotFoundError")<{
    readonly modelId: string;
    readonly message: string;
}> {
    constructor(modelId: string) {
        super({
            modelId,
            message: `Model not found: ${modelId}`
        });
    }
}

/**
 * Error when a model validation fails
 */
export class ModelValidationError extends Data.TaggedError("ModelValidationError")<{
    readonly modelId: string;
    readonly message: string;
    readonly capabilities: string[];
}> { }
