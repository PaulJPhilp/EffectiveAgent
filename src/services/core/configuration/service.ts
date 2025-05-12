/**
 * @file Implements the Configuration Service.
 * @module services/core/configuration/service
 */

import { FileSystem } from "@effect/platform";
import { Effect, Schema } from "effect";
import { ConfigurationServiceApi, LoadConfigOptions } from "./api.js";
import {
    ConfigParseError,
    ConfigReadError,
    ConfigValidationError
} from "./errors.js";
import type { BaseConfig } from "./schema.js";

/**
 * Implementation of the Configuration Service using Effect.Service pattern.
 * Provides functionality for loading and validating configuration files.
 */
export class ConfigurationService extends Effect.Service<ConfigurationServiceApi>()(
    "ConfigurationService",
    {
        effect: Effect.gen(function* () {
            // Get dependencies
            const fs = yield* FileSystem.FileSystem;

            // Helper to read file content
            const readFile = (filePath: string): Effect.Effect<string, ConfigReadError> =>
                fs.readFileString(filePath).pipe(
                    Effect.mapError(error => new ConfigReadError({
                        filePath,
                        cause: error
                    }))
                );

            // Helper to parse JSON content
            const parseJson = (content: string, filePath: string): Effect.Effect<unknown, ConfigParseError> =>
                Effect.try({
                    try: () => JSON.parse(content),
                    catch: error => new ConfigParseError({
                        filePath,
                        cause: error
                    })
                });

            // Helper to validate with schema
            const validateWithSchema = <T>(
                data: unknown,
                schema: Schema.Schema<T, T>,
                filePath: string
            ): Effect.Effect<T, ConfigValidationError> =>
                Schema.decode(schema)(data as T).pipe(
                    Effect.mapError(error => new ConfigValidationError({
                        filePath,
                        validationError: error
                    }))
                );

            // Main load config function
            const loadConfig = <T extends BaseConfig>({
                filePath,
                schema
            }: LoadConfigOptions<T>): Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError> =>
                Effect.gen(function* () {
                    const content = yield* readFile(filePath);
                    const parsed = yield* parseJson(content, filePath);
                    return yield* validateWithSchema(parsed, schema, filePath);
                });

            // Return service implementation
            return {
                readFile,
                parseJson,
                validateWithSchema,
                loadConfig
            };
        }),
        dependencies: []
    }
) { } 