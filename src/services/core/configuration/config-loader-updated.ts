/**
 * @file Implements the ConfigLoader Service following the standard Effect.Service pattern.
 * @module services/core/configuration/config-loader-new
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
            // Get dependencies at the top level of the Effect.gen
            const fs = yield* FileSystem.FileSystem;

            // Return the service implementation object
            return {
                loadConfig: <T extends BaseConfig>(
                    filename: string,
                    loadOptions?: LoadOptions<T>
                ): Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError> => {
                    // Use default options
                    const basePath = DEFAULT_OPTIONS.basePath;
                    const filePath = `${basePath}/${filename}`;

                    // Create a program that composes effects and properly maps errors
                    return Effect.gen(function* () {
                        // Check if file exists - map platform errors to ConfigReadError
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

                        // Parse JSON content - already maps errors properly
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
        dependencies: []
    }
) { }
