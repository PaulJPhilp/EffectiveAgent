/**
 * @file Object service specific error types
 * @module services/ai/producers/object/errors
 */

import { AIError } from "@/services/ai/errors.js";

/**
 * Error thrown when there are issues with object model configuration or access
 */
export class ObjectModelError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "object_model_error",
            name: "ObjectModelError",
            module: "ObjectService",
            method: "generate"
        })
    }
}

/**
 * Error thrown when there are issues with object provider configuration or access
 */
export class ObjectProviderError extends AIError {
    constructor(message: string, options?: ErrorOptions & {
        status?: number;
        response?: unknown;
    }) {
        super(message, {
            ...options,
            code: "object_provider_error",
            name: "ObjectProviderError",
            module: "ObjectService",
            method: "generate"
        })
    }
}

/**
 * Error thrown when the object generation request fails
 */
export class ObjectGenerationError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "object_generation_error",
            name: "ObjectGenerationError",
            module: "ObjectService",
            method: "generate"
        })
    }
}

/**
 * Error thrown when the schema validation fails for a generated object
 */
export class ObjectSchemaError extends AIError {
    constructor(message: string, options?: ErrorOptions & {
        schema?: unknown;
        result?: unknown;
        validationErrors?: unknown[];
    }) {
        super(message, {
            ...options,
            code: "object_schema_error",
            name: "ObjectSchemaError",
            module: "ObjectService",
            method: "generate"
        })
    }
} 