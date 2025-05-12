/**
 * @file Implements the ConfigLoader Service.
 * @module services/core/configuration/config-loader-complete
 */

import * as FileSystem from "@effect/platform/FileSystem";
import { Effect, Schema } from "effect";
import {
    ConfigParseError,
    ConfigReadError,
    ConfigSchemaMissingError,
    ConfigValidationError
} from "./errors.js";
import { BaseConfig, ConfigLoaderApi, ConfigLoaderOptionsApi, LoadOptions } from "./types.js";

/**
 * Default configuration loader options
 */
const DEFAULT_OPTIONS: ConfigLoaderOptionsApi = {
    basePath: process.cwd(),
    cacheConfig: false
};

/**
 * Implementation of the ConfigLoader service using the Effect.Service pattern.
 * Provides functionality for loading and validating configuration files.
 */
export class ConfigLoader extends Effect.Service<ConfigLoaderApi>()(
    "ConfigLoader",
    {
        effect: Effect.gen(function* () {
            // Get dependencies at the top level
            const fs = yield* FileSystem.FileSystem;

            // Return the service implementation object
            return {
                loadConfig: <T extends BaseConfig>(
                    filename: string,
                    loadOptions?: LoadOptions<T>
                ): Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError | unknown> => {
                    // Use default options
                    const basePath = DEFAULT_OPTIONS.basePath;
                    const filePath = `${basePath}/${filename}`;

                    // The implementation no longer needs to access FileSystem directly
                    return Effect.gen(function* () {
                        // Check if file exists
                        const exists = yield* fs.exists(filePath).pipe(
                            Effect.mapError(error => new ConfigReadError({
                                filePath,
                                cause: error
                            }))
                        );

                        if (!exists) {
                            return yield* Effect.fail(new ConfigReadError({
                                filePath,
                                cause: new Error(`Configuration file not found: ${filePath}`)
                            }));
                        }

                        // Read file content - map platform errors to ConfigReadError
                        const content = yield* fs.readFileString(filePath).pipe(
                            Effect.mapError(error => new ConfigReadError({
                                filePath,
                                cause: error
                            }))
                        );

                        // Parse JSON content
                        const parsed = yield* Effect.try({
                            try: () => JSON.parse(content) as T,
                            catch: error => new ConfigParseError({
                                filePath,
                                cause: error instanceof Error ? error : new Error(String(error))
                            })
                        });

                        // Validate against schema if provided
                        if (loadOptions?.validate) {
                            if (loadOptions.schema) {
                                return yield* Schema.decode(loadOptions.schema)(parsed).pipe(
                                    Effect.mapError(error => new ConfigValidationError({
                                        filePath,
                                        validationError: error
                                    }))
                                );
                            } else {
                                // If validation requested but no schema provided
                                return yield* Effect.fail(new ConfigSchemaMissingError({
                                    filePath
                                }));
                            }
                        }

                        return parsed;
                    });
                }
            };
        }),
        dependencies: [FileSystem.FileSystem]
    }
) { }
