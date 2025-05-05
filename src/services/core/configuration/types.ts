// File: src/services/configuration/types.ts 

import { FileSystem } from "@effect/platform/FileSystem";
import { Context, Effect, Schema } from "effect";
import type {
    ConfigParseError,
    ConfigReadError,
    ConfigSchemaMissingError,
    ConfigValidationError
} from './errors.js';
import type { BaseConfig } from './schema.js';

// --- Configuration Loader Options ---
export interface ConfigLoaderOptions {
    basePath: string;
    cacheConfig?: boolean;
}

export interface ConfigLoaderOptionsTag extends ConfigLoaderOptions { }
export const ConfigLoaderOptionsTag = Context.GenericTag<ConfigLoaderOptionsTag>("ConfigLoaderOptionsTag");

export interface LoadOptions<T> {
    schema?: Schema.Schema<T>;
    validate?: boolean;
}

// --- Service Definition ---
export interface ConfigLoader {
    readonly loadConfig: <T extends BaseConfig>(
        filename: string,
        options?: LoadOptions<T>
    ) => Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError, FileSystem>;
}

// Tag uses the interface name
export const ConfigLoader = Context.GenericTag<ConfigLoader>("ConfigLoader");