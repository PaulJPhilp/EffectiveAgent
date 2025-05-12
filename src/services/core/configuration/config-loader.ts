/**
 * @file Implements the ConfigLoader Service.
 * @module services/core/configuration/config-loader
 */

import * as FileSystem from "@effect/platform/FileSystem";
import { Effect, Layer, Schema } from "effect";
import {
    ConfigParseError,
    ConfigReadError,
    ConfigSchemaMissingError,
    ConfigValidationError
} from "./errors.js";
import { ConfigLoaderApi, ConfigLoaderOptionsApi, LoadOptions } from "./types.js";

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
            // Access dependencies at the top level of the service
            const fs = yield* FileSystem.FileSystem;

            return {
                loadConfig: <T extends Record<string, any>>(
                    filename: string,
                    loadOptions?: LoadOptions<T>
                ): Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError | unknown> => {
                    // Use default options
                    const basePath = DEFAULT_OPTIONS.basePath;
                    const filePath = `${basePath}/${filename}`;

                    return Effect.gen(function* () {
                        // fs is already available from the outer scope

                        // Check if file exists
                        const exists = yield* fs.exists(filePath);
                        if (!exists) {
                            return yield* Effect.fail(new ConfigReadError({
                                filePath,
                                cause: new Error(`Configuration file not found: ${filePath}`)
                            }));
                        }

                        // Read file content with error handling
                        let content: string;
                        try {
                            content = yield* fs.readFileString(filePath).pipe(
                                Effect.mapError(error => new ConfigReadError({
                                    filePath,
                                    cause: error
                                }))
                            );
                        } catch (error) {
                            return yield* Effect.fail(new ConfigReadError({
                                filePath,
                                cause: error instanceof Error ? error : new Error(String(error))
                            }));
                        }

                        // Parse JSON content
                        let parsed: T;
                        try {
                            parsed = JSON.parse(content) as T;
                        } catch (error) {
                            return yield* Effect.fail(new ConfigParseError({
                                filePath,
                                cause: error instanceof Error ? error : new Error(String(error))
                            }));
                        }

                        // Validate if needed
                        if (loadOptions?.validate) {
                            if (loadOptions.schema) {
                                return yield* Schema.decode(loadOptions.schema)(parsed).pipe(
                                    Effect.mapError(error => new ConfigValidationError({
                                        filePath,
                                        validationError: error
                                    }))
                                );
                            } else {
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

/**
 * Default ConfigLoader Layer
 */
export const ConfigLoaderLayer = Layer.succeed(ConfigLoader);
