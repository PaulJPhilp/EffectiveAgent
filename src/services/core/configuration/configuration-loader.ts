// File: src/services/configuration/configurationLoader.ts

import { FileSystem } from "@effect/platform/FileSystem";
import { Effect, Schema } from "effect";
import path from "path";
import {
    ConfigParseError,
    ConfigReadError,
    ConfigSchemaMissingError,
    ConfigValidationError
} from "./errors.js";
import type { BaseConfig } from "./schema.js";
import type { ConfigLoaderOptions, LoadOptions } from "./types.js";

// --- Service Implementation Object Factory ---
const makeConfigLoader = (
    options: ConfigLoaderOptions,
    fs: FileSystem
) => {
    // Helper to read file as string 
    const readFile = (filePath: string): Effect.Effect<string, ConfigReadError, FileSystem> =>
        fs.readFileString(filePath).pipe(
            Effect.mapError(error => new ConfigReadError({ filePath, cause: error }))
        );

    // Helper to parse JSON
    const parseJson = (content: string, filePath: string): unknown => {
        try {
            return JSON.parse(content);
        } catch (error) {
            throw new ConfigParseError({ filePath, cause: error });
        }
    };

    // Helper to validate with schema
    const validateWithSchema = <T>(data: unknown, schema: Schema.Schema<T>, filePath: string): T => {
        const result = Schema.decode(schema)(data);
        return Effect.runSync(result);
    };

    // Main loader function wrapped in Effect
    const loadAndValidateFile = <T extends BaseConfig>(
        filename: string,
        loadOpts: LoadOptions<T> = {}
    ): Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError, FileSystem> => {
        return Effect.gen(function* () {
            // Get full path
            const filePath = path.join(options.basePath, filename);
            const exists = yield* fs.exists(filePath).pipe(
                Effect.mapError(error => new ConfigReadError({ filePath, cause: error }))
            );
            if (!exists) {
                return yield* Effect.fail(
                    new ConfigReadError({
                        filePath,
                        cause: new Error(`Configuration file not found: ${filePath}`)
                    })
                );
            }

            // Read file
            const content = yield* readFile(filePath);

            // Parse JSON
            const parsed = yield* Effect.try({
                try: () => parseJson(content, filePath),
                catch: error => new ConfigParseError({ filePath, cause: error })
            });

            // Validate against provided schema
            if (loadOpts.schema) {
                return yield* Effect.try({
                    try: () => validateWithSchema(parsed, loadOpts.schema, filePath),
                    catch: error => new ConfigValidationError({
                        filePath,
                        validationError: error instanceof Schema.ParseError ? error : new Schema.ParseError([{
                            path: [],
                            message: `Schema validation failed: ${error}`,
                            value: parsed
                        }])
                    })
                });
            } else {
                return yield* Effect.fail(
                    new ConfigSchemaMissingError({ filePath })
                );
            }
        });
    };

    // Return the implementation object literal
    return {
        loadConfig: <T extends BaseConfig>(
            filename: string,
            loadOpts: LoadOptions<T> = {}
        ) => loadAndValidateFile(filename, loadOpts)
    };
};

// --- Service Tag & Layer ---
export interface ConfigLoader {
    readonly loadConfig: <T extends BaseConfig>(
        filename: string,
        options?: LoadOptions<T>
    ) => Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError, FileSystem>;
}