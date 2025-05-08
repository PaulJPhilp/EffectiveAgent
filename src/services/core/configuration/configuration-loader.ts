import { FileSystem } from "@effect/platform/FileSystem";
import { Effect, ParseResult, Schema } from "effect";
import path from "path";
import {
    ConfigParseError,
    ConfigReadError,
    ConfigSchemaMissingError,
    ConfigValidationError
} from "./errors.js";
import type { BaseConfig } from "./schema.js";
import type { ConfigLoaderOptionsApi } from "./types.js";

export interface LoadConfigOptions<T extends BaseConfig> {
    filePath: string;
    schema: Schema.Schema<T, T>;
}

export interface ConfigLoaderApi {
    readFile(filePath: string): Effect.Effect<string, ConfigReadError, never>;
    parseJson(content: string, filePath: string): Effect.Effect<unknown, ConfigParseError, never>;
    validateWithSchema<T>(data: unknown, schema: Schema.Schema<T, T>, filePath: string): Effect.Effect<T, ConfigValidationError, never>;
    loadConfig<T extends BaseConfig>(options: LoadConfigOptions<T>): Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError, never>;
}

export class ConfigLoaderService extends Effect.Service<ConfigLoaderApi>()(
    "ConfigLoaderService",
    {
        effect: Effect.gen(function* () {
            const fs = yield* FileSystem;

            const makeService = (options: ConfigLoaderOptionsApi) => {
                const basePath = path.resolve(options.basePath);

                const readFileEffect = (filePath: string) =>
                    Effect.gen(function* () {
                        const fullPath = path.join(basePath, filePath);
                        const exists = yield* fs.exists(fullPath);
                        if (!exists) {
                            return yield* Effect.fail(new ConfigReadError({
                                filePath,
                                cause: new Error(`Configuration file not found: ${fullPath}`)
                            }));
                        }
                        return yield* fs.readFileString(fullPath);
                    }).pipe(
                        Effect.mapError(error => new ConfigReadError({ filePath, cause: error }))
                    );

                const parseJsonEffect = (content: string, filePath: string) =>
                    Effect.try(() => JSON.parse(content) as unknown).pipe(
                        Effect.mapError(error => new ConfigParseError({ filePath, cause: error }))
                    );

                const validateWithSchemaEffect = <T>(data: unknown, schema: Schema.Schema<T, T>, filePath: string): Effect.Effect<T, ConfigValidationError, never> =>
                    Effect.gen(function* () {
                        const result = Schema.decodeUnknown(schema)(data);
                        return yield* Effect.mapError(
                            result,
                            error => new ConfigValidationError({
                                filePath,
                                validationError: error as ParseResult.ParseError
                            })
                        );
                    });

                return {
                    readFile: readFileEffect,
                    parseJson: parseJsonEffect,
                    validateWithSchema: validateWithSchemaEffect,
                    loadConfig: <T extends BaseConfig>({ filePath, schema }: LoadConfigOptions<T>) =>
                        Effect.gen(function* () {
                            const content = yield* readFileEffect(filePath);
                            const parsed = yield* parseJsonEffect(content, filePath);
                            return yield* validateWithSchemaEffect(parsed, schema, filePath);
                        })
                };
            };

            return makeService;
        })
    }
) { }