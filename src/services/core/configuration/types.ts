/**
 * @file Configuration service types and interfaces
 * @module services/core/configuration/types
 */

import { FileSystem } from "@effect/platform/FileSystem";
import { Effect, Layer } from "effect";
import type {
    ConfigParseError,
    ConfigReadError,
    ConfigSchemaMissingError,
    ConfigValidationError
} from './errors.js';
import type { BaseConfig } from './schema.js';

/**
 * Configuration loader options interface
 */
export interface ConfigLoaderOptionsApi {
    readonly basePath: string
    readonly cacheConfig?: boolean
}

/**
 * Service for loading configuration files
 */
export interface ConfigLoaderApi {
    readonly loadConfig: <T extends BaseConfig>(
        filename: string,
        options?: LoadOptions<T>
    ) => Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError, FileSystem>;
}

export interface LoadOptions<T> {
    schema?: Schema.Schema<T>;
    validate?: boolean;
}

/**
 * Implementation of the ConfigLoader service
 */
export class ConfigLoader extends Effect.Service<ConfigLoaderApi>() {
    static readonly Tag = ConfigLoader.Tag;
}

/**
 * Factory function for creating ConfigLoader service instances
 */
export const make = (options: ConfigLoaderOptionsApi): Effect.Effect<ConfigLoaderApi> =>
    Effect.gen(function* () {
        // Access any dependencies here with yield*
        const fs = yield* FileSystem.FileSystem;

        const loadConfig = <T extends BaseConfig>(
            filename: string,
            loadOptions?: LoadOptions<T>
        ): Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError, FileSystem> => {
            return Effect.gen(function* () {
                const filePath = `${options.basePath}/${filename}`;
                const exists = yield* fs.exists(filePath);

                if (!exists) {
                    return yield* Effect.fail(new ConfigReadError({
                        filePath,
                        cause: new Error(`Configuration file not found: ${filePath}`)
                    }));
                }

                const content = yield* fs.readFileString(filePath);

                try {
                    const parsed = JSON.parse(content) as T;
                    return parsed;
                } catch (error) {
                    return yield* Effect.fail(new ConfigParseError({
                        filePath,
                        cause: error
                    }));
                }
            });
        };

        return {
            loadConfig
        };
    });

/**
 * Layer for providing the ConfigLoader service
 */
export const ConfigLoaderLive = (options: ConfigLoaderOptionsApi) =>
    Layer.effect(
        ConfigLoader,
        make(options)
    );