/**
 * @file Defines error types for the Configuration Service.
 * @module services/core/configuration/errors
 */

import { Data, ParseResult } from "effect";

/**
 * Error thrown when reading a configuration file fails.
 */
export class ConfigReadError extends Data.TaggedError("ConfigReadError")<{
    readonly filePath: string;
    readonly cause?: unknown;
}> { }

/**
 * Error thrown when parsing JSON content fails.
 */
export class ConfigParseError extends Data.TaggedError("ConfigParseError")<{
    readonly filePath: string;
    readonly cause?: unknown;
}> { }

/**
 * Error thrown when validating configuration against a schema fails.
 */
export class ConfigValidationError extends Data.TaggedError("ConfigValidationError")<{
    readonly filePath: string;
    readonly validationError: ParseResult.ParseError;
}> { }

/**
 * Union type of all possible configuration service errors.
 */
export type ConfigError = ConfigReadError | ConfigParseError | ConfigValidationError;

// Base Error (Optional but good practice)
export class ConfigurationError extends Data.TaggedError("ConfigurationError")<{
    readonly message: string;
    readonly key?: string;
    readonly filePath?: string;
    readonly cause?: unknown;
}> {
    constructor(options: { message: string; key?: string; filePath?: string; cause?: unknown }) {
        super(options);
    }
}

export class ConfigSchemaMissingError extends Data.TaggedError("ConfigSchemaMissingError")<{
    readonly message: string;
    readonly filePath: string;
}> {
    constructor(options: { filePath: string }) {
        super({
            message: `Schema is required for validation when loading ${options.filePath}`,
            filePath: options.filePath
        });
    }
}