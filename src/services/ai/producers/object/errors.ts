/**
 * @file Object service specific error types
 * @module services/ai/producers/object/errors
 */

import { EffectiveError } from "@/effective-error.js";

/**
 * Error thrown when there are issues with object model configuration or access
 */
/**
 * Error thrown when there are issues with object model configuration or access.
 * @extends EffectiveError
 */
export class ObjectModelError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when there are issues with object provider configuration or access
 */
/**
 * Error thrown when there are issues with object provider configuration or access.
 * @extends EffectiveError
 */
export class ObjectProviderError extends EffectiveError {
    public readonly status?: number;
    public readonly response?: unknown;
    constructor(params: { status?: number; response?: unknown; description: string; module: string; method: string; cause?: unknown }) {
        super(params);
        this.status = params.status;
        this.response = params.response;
    }
}

/**
 * Error thrown when the object generation request fails
 */
/**
 * Error thrown when the object generation request fails.
 * @extends EffectiveError
 */
export class ObjectGenerationError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when object input validation fails.
 * @extends EffectiveError
 */
export class ObjectInputError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when the schema validation fails for a generated object
 */
/**
 * Error thrown when the schema validation fails for a generated object
 * @extends EffectiveError
 */
export class ObjectSchemaError extends EffectiveError {
    public readonly schema?: unknown;
    public readonly result?: unknown;
    public readonly validationErrors?: unknown[];
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
        schema?: unknown;
        result?: unknown;
        validationErrors?: unknown[];
    }) {
        super(params);
        this.schema = params.schema;
        this.result = params.result;
        this.validationErrors = params.validationErrors;
    }
}

/**
 * Union type of all ObjectService errors.
 */
export type ObjectServiceError =
    | ObjectModelError
    | ObjectProviderError
    | ObjectGenerationError
    | ObjectSchemaError;