/**
 * @file Defines the Configuration Service API interface.
 * @module services/core/configuration/api
 */

import { Effect, Schema, Config, ConfigError } from "effect"; // Added Config, ConfigError
import { ConfigReadError, ConfigParseError, ConfigValidationError } from "./errors.js";
import { ProviderFile } from "@/services/ai/provider/schema.js";
import { ModelFileSchema } from "@/services/ai/model/schema.js";
import { PolicyConfigFile } from "@/services/ai/policy/schema.js";
import type { BaseConfig } from "./schema.js";

/**
 * Options for loading a configuration file
 */
export interface LoadConfigOptions<T> {
    readonly filePath: string;
    readonly schema: Schema.Schema<T, T>;
}

/**
 * API interface for the Configuration Service.
 * Provides functionality for loading and validating configuration files.
 */
export interface ConfigurationServiceApi {
    /**
     * Read a configuration file as a string
     * @param filePath Path to the configuration file
     * @returns Effect yielding the file contents
     */
    readonly readFile: (filePath: string) => Effect.Effect<string, ConfigReadError>;

    /**
     * Parse JSON content from a string
     * @param content JSON content to parse
     * @param filePath Original file path for error context
     * @returns Effect yielding the parsed unknown object
     */
    readonly parseJson: (content: string, filePath: string) => Effect.Effect<unknown, ConfigParseError>;

    /**
     * Validate data against a schema
     * @param data Data to validate
     * @param schema Schema to validate against
     * @param filePath Original file path for error context
     * @returns Effect yielding the validated data
     */
    readonly validateWithSchema: <T>(
        data: unknown,
        schema: Schema.Schema<T, T>,
        filePath: string
    ) => Effect.Effect<T, ConfigValidationError>;

    /**
     * Load and validate a configuration file
     * @param options Options containing file path and schema
     * @returns Effect yielding the validated configuration
     */
    readonly loadConfig: <T>(
        options: LoadConfigOptions<T>
    ) => Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError>;

    /**
     * Load and validate provider configuration.
     */
    readonly loadProviderConfig: () => Effect.Effect<Schema.Schema.Type<typeof ProviderFile>, ConfigReadError | ConfigParseError | ConfigValidationError>;

    /**
     * Load and validate model configuration.
     */
    readonly loadModelConfig: () => Effect.Effect<Schema.Schema.Type<typeof ModelFileSchema>, ConfigReadError | ConfigParseError | ConfigValidationError>;

    /**
     * Load and validate policy configuration.
     */
    readonly loadPolicyConfig: () => Effect.Effect<Schema.Schema.Type<typeof PolicyConfigFile>, ConfigReadError | ConfigParseError | ConfigValidationError>;

    /**
     * Get an API key from environment variables.
     * @param envVarName The name of the environment variable.
     * @returns Effect yielding the API key string, or an error if not found.
     */
    readonly getApiKey: (envVarName: string) => Effect.Effect<string, ConfigError.MissingData>;

    /**
     * Get an environment variable.
     * @param envVarName The name of the environment variable.
     * @returns Effect yielding the environment variable string, or an error if not found.
     */
    readonly getEnvVariable: (envVarName: string) => Effect.Effect<string, ConfigError.MissingData>;
}