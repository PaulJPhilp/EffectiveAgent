/**
 * @file Defines the Configuration Service API interface.
 * @module services/core/configuration/api
 */

import { ModelConfigData } from "@/services/ai/model/types.js";
import { PolicyConfigFile } from "@/services/ai/policy/schema.js";
import { ProviderFile } from "@/services/ai/provider/schema.js";
import { Effect, Schema } from "effect";
import type { FileSystem } from "@effect/platform";
import { ConfigParseError, ConfigReadError, ConfigValidationError } from "./errors.js";
import { MasterConfig } from "./schema.js";

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

    readonly loadConfig: <T>(filePath: string, schema: Schema.Schema<T, any>) => Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError>;

    /**
     * Load and parse a raw configuration file without schema validation
     * @param filePath - Path to the configuration file
     * @returns Effect containing the parsed JSON object or configuration error
     */
    readonly loadRawConfig: (filePath: string) => Effect.Effect<unknown, ConfigReadError | ConfigParseError>;

    /**
     * Load and validate provider configuration.
     */
    readonly loadProviderConfig: (filePath: string) => Effect.Effect<ProviderFile, ConfigReadError | ConfigParseError | ConfigValidationError>;

    /**
     * Load and validate model configuration.
     */
    readonly loadModelConfig: (filePath: string) => Effect.Effect<ModelConfigData, ConfigReadError | ConfigParseError | ConfigValidationError>;

    /**
     * Load and validate the policy configuration file
     * @returns Effect containing PolicyConfigFile or configuration error
     */
    readonly loadPolicyConfig: (filePath: string) => Effect.Effect<PolicyConfigFile, ConfigReadError | ConfigParseError | ConfigValidationError>;

    /**
     * Get an API key from environment variables.
     * @param provider The provider name to get the API key for.
     * @returns Effect yielding the API key string.
     */
    readonly getApiKey: (provider: string) => Effect.Effect<string>;

    /**
     * Get an environment variable.
     * @param name The name of the environment variable.
     * @returns Effect yielding the environment variable string.
     */
    readonly getEnvVariable: (name: string) => Effect.Effect<string>;

    readonly getMasterConfig: () => Effect.Effect<MasterConfig, ConfigReadError | ConfigParseError | ConfigValidationError>;
}