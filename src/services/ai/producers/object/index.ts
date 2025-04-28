/**
 * @file Index file for exporting the ObjectService and related utilities
 * @module services/ai/producers/object
 */

// Export service and API types
export { ObjectService } from "./service.js";
export type {
  ObjectServiceApi,
  ObjectGenerationOptions,
  ObjectGenerationResult
} from "./api.js";

// Export error types and union
export {
  ObjectGenerationError,
  ObjectModelError,
  ObjectProviderError,
  ObjectSchemaError,
  type ObjectServiceError
} from "./errors.js";

// Export schema utilities
export * from "./schema-utils.js";
