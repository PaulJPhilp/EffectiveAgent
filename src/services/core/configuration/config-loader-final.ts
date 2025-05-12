import * as FileSystem from "@effect/platform/FileSystem";
import { Effect, Layer, Schema } from "effect";
import {
    ConfigParseError,
    ConfigReadError,
    ConfigSchemaMissingError,
    ConfigValidationError
} from "./errors.js";
import { BaseConfig, ConfigLoaderApi, ConfigLoaderOptionsApi, LoadOptions } from "./types.js";

const DEFAULT_OPTIONS: ConfigLoaderOptionsApi = {
    basePath: process.cwd(),
    cacheConfig: false
};

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
                    const basePath = DEFAULT_OPTIONS.basePath;
                    const filePath = `${basePath}/${filename}`;

                    return Effect.gen(function* () {
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

                        const content = yield* fs.readFileString(filePath).pipe(
                            Effect.mapError(error => new ConfigReadError({
                                filePath,
                                cause: error
                            }))
                        );

                        const parsed = yield* Effect.try({
                            try: () => JSON.parse(content) as T,
                            catch: error => new ConfigParseError({
                                filePath,
                                cause: error instanceof Error ? error : new Error(String(error))
                            })
                        });

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
 
        dependencies: [Layer.effect(FileSystem.FileSystem)(FileSystem.FileSystem)]
    }
) { }