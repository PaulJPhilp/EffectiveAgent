/**
 * Configuration service barrel file
 * @module services/core/configuration
 */

// Export schemas
export * from "./schema.js";

// Export types excluding those already exported from schema
export type {
    BaseConfig, ConfigLoaderApi, ConfigLoaderOptionsApi, LoadOptions
} from "./types.js";

// Export errors
export * from "./errors.js";

// Export the properly implemented ConfigLoader service
export * from "./service.js";
