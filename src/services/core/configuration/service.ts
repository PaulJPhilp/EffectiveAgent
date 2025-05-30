/**
 * @file Configuration service for loading and validating configuration files
 * @module services/core/configuration/service
 */

import { PolicyConfigFile } from "@/services/ai/policy/schema.js";
import { ProviderFile } from "@/services/ai/provider/schema.js";
import { FileSystem } from "@effect/platform";
import { Effect, Schema } from "effect";
import { ConfigParseError, ConfigReadError, ConfigValidationError } from "./errors.js";
import { MasterConfig, MasterConfigSchema } from "./master-schema.js";

/**
 * Configuration service API
 */
export interface ConfigurationServiceApi {
    readonly readFile: (filePath: string) => Effect.Effect<string, ConfigReadError>;
    readonly parseJson: (content: string, filePath: string) => Effect.Effect<unknown, ConfigParseError>;
    readonly validateWithSchema: <T>(
        data: unknown,
        schema: Schema.Schema<T, T>,
        filePath: string
    ) => Effect.Effect<T, ConfigValidationError>;
    readonly loadConfig: <T>(options: LoadConfigOptions<T>) => Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError>;
    readonly loadProviderConfig: () => Effect.Effect<ProviderFile, ConfigReadError | ConfigParseError | ConfigValidationError>;
    readonly loadModelConfig: () => Effect.Effect<unknown, ConfigReadError | ConfigParseError>;
    readonly loadPolicyConfig: () => Effect.Effect<PolicyConfigFile, ConfigReadError | ConfigParseError | ConfigValidationError>;
    readonly getApiKey: (provider: string) => Effect.Effect<string>;
    readonly getEnvVariable: (name: string) => Effect.Effect<string>;
}

/**
 * Options for loading a configuration file
 */
export interface LoadConfigOptions<T> {
    readonly filePath: string;
    readonly schema: Schema.Schema<T, T>;
}

export class ConfigurationService extends Effect.Service<ConfigurationServiceApi>()(
    "ConfigurationService",
    {
        effect: Effect.gen(function* (): Generator<any, ConfigurationServiceApi> {
            const fs = yield* FileSystem.FileSystem;

            // Load master config file path from environment
            const masterConfigPath = yield* Effect.sync(() =>
                process.env["MASTER_CONFIG_PATH"] ?? ""
            );

            // Load and validate master config
            const masterConfig = yield* Effect.gen(function* (): Generator<any, MasterConfig> {
                const content = yield* fs.readFileString(masterConfigPath).pipe(
                    Effect.mapError(error => new ConfigReadError({
                        filePath: masterConfigPath,
                        cause: error
                    }))
                );
                const parsed = yield* Effect.try({
                    try: () => JSON.parse(content),
                    catch: error => new ConfigParseError({
                        filePath: masterConfigPath,
                        cause: error
                    })
                });
                return yield* Schema.decode(MasterConfigSchema)(parsed).pipe(
                    Effect.mapError(error => new ConfigValidationError({
                        filePath: masterConfigPath,
                        validationError: error
                    }))
                );
            });

            return {
                readFile: (filePath: string) =>
                    fs.readFileString(filePath).pipe(
                        Effect.mapError(error => new ConfigReadError({
                            filePath,
                            cause: error
                        }))
                    ),

                parseJson: (content: string, filePath: string) =>
                    Effect.try({
                        try: () => JSON.parse(content),
                        catch: error => new ConfigParseError({
                            filePath,
                            cause: error
                        })
                    }),

                validateWithSchema: <T>(
                    data: unknown,
                    schema: Schema.Schema<T, T>,
                    filePath: string
                ) =>
                    Schema.decode(schema)(data as T).pipe(
                        Effect.mapError(error => new ConfigValidationError({
                            filePath,
                            validationError: error
                        }))
                    ),

                loadConfig: <T>({
                    filePath,
                    schema
                }: LoadConfigOptions<T>) =>
                    Effect.gen(function* () {
                        const content = yield* fs.readFileString(filePath).pipe(
                            Effect.mapError(error => new ConfigReadError({ filePath, cause: error }))
                        );
                        const parsed = yield* Effect.try({
                            try: () => JSON.parse(content),
                            catch: error => new ConfigParseError({ filePath, cause: error })
                        });
                        return yield* Schema.decode(schema)(parsed).pipe(
                            Effect.mapError(error => new ConfigValidationError({
                                filePath,
                                validationError: error
                            }))
                        );
                    }),

                loadProviderConfig: () =>
                    Effect.gen(function* () {
                        const filePath = masterConfig.configPaths.providers;
                        const content = yield* fs.readFileString(filePath).pipe(
                            Effect.mapError(error => new ConfigReadError({ filePath, cause: error }))
                        );
                        const parsed = yield* Effect.try({
                            try: () => JSON.parse(content),
                            catch: error => new ConfigParseError({ filePath, cause: error })
                        });
                        return yield* Schema.decode(ProviderFile)(parsed).pipe(
                            Effect.mapError(error => new ConfigValidationError({
                                filePath,
                                validationError: error
                            }))
                        );
                    }),

                loadModelConfig: () =>
                    Effect.gen(function* () {
                        const filePath = masterConfig.configPaths.models;
                        const content = yield* fs.readFileString(filePath).pipe(
                            Effect.mapError(error => new ConfigReadError({ filePath, cause: error }))
                        );
                        const parsed = yield* Effect.try({
                            try: () => JSON.parse(content),
                            catch: error => new ConfigParseError({ filePath, cause: error })
                        });
                        // Note: Will need to import ModelFileSchema
                        return parsed; // For now return parsed data, proper schema validation to be added
                    }),

                loadPolicyConfig: () =>
                    Effect.gen(function* () {
                        const filePath = masterConfig.configPaths.policy;
                        const content = yield* fs.readFileString(filePath).pipe(
                            Effect.mapError(error => new ConfigReadError({ filePath, cause: error }))
                        );
                        const parsed = yield* Effect.try({
                            try: () => JSON.parse(content),
                            catch: error => new ConfigParseError({ filePath, cause: error })
                        });
                        return yield* Schema.decode(PolicyConfigFile)(parsed).pipe(
                            Effect.mapError(error => new ConfigValidationError({
                                filePath,
                                validationError: error
                            }))
                        );
                    }),

                getApiKey: (provider: string) =>
                    Effect.sync(() =>
                        process.env[`${provider.toUpperCase()}_API_KEY`] ?? ""
                    ),

                getEnvVariable: (name: string) =>
                    Effect.sync(() =>
                        process.env[name] ?? ""
                    )
            };
        })
    }
) { }

/**
 * Default export for the ConfigurationService.
 */
export default ConfigurationService;
