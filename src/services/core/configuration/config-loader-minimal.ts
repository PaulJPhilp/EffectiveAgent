/**
 * @file Implements the ConfigLoader Service following the standard Effect.Service pattern.
 * @module services/core/configuration/config-loader-minimal
 */

import { Effect, Layer, Schema } from "effect";
import * as fs from "node:fs/promises";
import * as path from "node:path";
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
        effect: Effect.succeed({
            loadConfig: <T extends BaseConfig>(
                filename: string,
                loadOptions?: LoadOptions<T>
            ): Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError> => {
                // Use default options
                const options = DEFAULT_OPTIONS;
                const filePath = path.join(options.basePath, filename);

                return Effect.gen(function* () {
                    // Check if file exists and read it (using standard Node.js fs)
                    let content: string;
                    try {
                        // Check if file exists
                        const fileExists = yield* Effect.promise(() =>
                            fs.access(filePath).then(() => true).catch(() => false)
                        );

                        if (!fileExists) {
                            return yield* Effect.fail(new ConfigReadError({
                                filePath,
                                cause: new Error(`Configuration file not found: ${filePath}`)
                            }));
                        }

                        // Read the file
                        content = yield* Effect.promise(() => fs.readFile(filePath, 'utf-8'));
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

                    // Validate against schema if provided
                    if (loadOptions?.validate && loadOptions.schema) {
                        return yield* Schema.decode(loadOptions.schema)(parsed).pipe(
                            Effect.mapError(error => new ConfigValidationError({
                                filePath,
                                validationError: error
                            }))
                        );
                    } else if (loadOptions?.validate) {
                        // If validation requested but no schema provided
                        return yield* Effect.fail(new ConfigSchemaMissingError({
                            filePath
                        }));
                    }

                    return parsed;
                });
            }
        }),
        dependencies: []
    }
) { }

/**
 * Default Layer for the ConfigLoader service
 */
export const ConfigLoaderLayer = Layer.succeed(ConfigLoader);
