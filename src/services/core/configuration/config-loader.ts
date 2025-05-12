/**
 * @file Implements the ConfigLoader Service following the Effect.Service pattern.
 * @module services/core/configuration/config-loader
 */

import * as FileSystem from "@effect/platform/FileSystem"
import { Effect, Schema } from "effect"
import {
    ConfigParseError,
    ConfigReadError,
    ConfigValidationError
} from "./errors.js"
import { BaseConfig, ConfigLoaderApi, ConfigLoaderOptionsApi, LoadOptions } from "./types.js"

const DEFAULT_OPTIONS: ConfigLoaderOptionsApi = {
    basePath: process.cwd(),
    cacheConfig: false
}

/**
 * Implementation of the ConfigLoader service using the Effect.Service pattern.
 * Provides functionality for loading and validating configuration files.
 */
export class ConfigLoader extends Effect.Service<ConfigLoaderApi>()(
    "ConfigLoader",
    {
        effect: Effect.gen(function* () {
            // Access the FileSystem service from the environment
            const fs = yield* FileSystem.FileSystem

            return {
                loadConfig: <T extends BaseConfig>(
                    filename: string,
                    loadOptions?: LoadOptions<T>
                ) => {
                    const basePath = DEFAULT_OPTIONS.basePath
                    const filePath = `${basePath}/${filename}`

                    return Effect.gen(function* () {
                        const exists = yield* fs.exists(filePath).pipe(
                            Effect.mapError(error => new ConfigReadError({
                                filePath,
                                cause: error
                            }))
                        )

                        if (!exists) {
                            return yield* Effect.fail(new ConfigReadError({
                                filePath,
                                cause: new Error(`Configuration file not found: ${filePath}`)
                            }))
                        }

                        const content = yield* fs.readFileString(filePath).pipe(
                            Effect.mapError(error => new ConfigReadError({
                                filePath,
                                cause: error
                            }))
                        )

                        const parsed = yield* Effect.try({
                            try: () => JSON.parse(content) as T,
                            catch: error => new ConfigParseError({
                                filePath,
                                cause: error instanceof Error ? error : new Error(String(error))
                            })
                        })

                        // If schema is provided, validate the parsed data
                        if (loadOptions?.schema) {
                            const validationResult = yield* Schema.decode(loadOptions.schema)(parsed).pipe(
                                Effect.mapError(error => new ConfigValidationError({
                                    filePath,
                                    validationError: error
                                }))
                            )
                            return validationResult
                        }

                        return parsed
                    })
                }
            }
        })
    }
) { }