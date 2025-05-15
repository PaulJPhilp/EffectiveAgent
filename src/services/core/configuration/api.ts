/**
 * @file Defines the Configuration Service API interface.
 * @module services/core/configuration/api
 */

import { Effect, Schema } from "effect";
import type {
    ConfigParseError,
    ConfigReadError,
    ConfigValidationError
} from "./errors.js";
import type { BaseConfig } from "./types.js";

/**
 * Options for loading a configuration file
 */
export interface LoadConfigOptions<T extends BaseConfig> {
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
    readonly loadConfig: <T extends BaseConfig>(
        options: LoadConfigOptions<T>
    ) => Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError>;
} 