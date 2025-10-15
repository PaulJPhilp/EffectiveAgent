/**
 * Configuration service types and interfaces
 * @module services/core/configuration/types
 */

import type { Effect, Schema } from "effect";
import type {
    ConfigParseError,
    ConfigReadError,
    ConfigSchemaMissingError,
    ConfigValidationError
} from "./errors.js";

/**
 * Base configuration type
 */
export type BaseConfig = {}

/**
 * Configuration loader options interface
 */
export interface ConfigLoaderOptionsApi {
    readonly basePath: string
    readonly cacheConfig?: boolean
}

/**
 * Load options for configuration
 */
export interface LoadOptions<T> {
    schema?: Schema.Schema<T>;
    validate?: boolean;
}

/**
 * Service for loading configuration files
 */
export interface ConfigLoaderApi {
    readonly loadConfig: <T extends BaseConfig>(
        filename: string,
        options?: LoadOptions<T>
    ) => Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError | unknown>;
}

/**
 * The ConfigLoader implementation is now in config-loader.ts following the standard service pattern
 * @see /services/core/configuration/config-loader.ts
 */
