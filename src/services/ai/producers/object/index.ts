/**
 * @file Index file for exporting the ObjectService and related utilities
 * @module services/ai/producers/object
 */

// Export service implementation
export {
    ObjectService,
    ObjectServiceLive, type ObjectGenerationOptions,
    type ObjectGenerationResult, type ObjectServiceApi
} from "./service.js";

// Export error types
export {
    ObjectGenerationError,
    ObjectModelError,
    ObjectProviderError,
    ObjectSchemaError
} from "./errors.js";

// Export schema utilities
export * from "./schema-utils.js";
