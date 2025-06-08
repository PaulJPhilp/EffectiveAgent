/**
 * @file Defines error types for the Configuration Service.
 * @module services/core/configuration/errors
 */
import { Data } from "effect";
/**
 * Error thrown when reading a configuration file fails.
 */
export class ConfigReadError extends Data.TaggedError("ConfigReadError") {
}
/**
 * Error thrown when parsing JSON content fails.
 */
export class ConfigParseError extends Data.TaggedError("ConfigParseError") {
}
/**
 * Error thrown when validating configuration against a schema fails.
 */
export class ConfigValidationError extends Data.TaggedError("ConfigValidationError") {
}
// Base Error (Optional but good practice)
export class ConfigurationError extends Data.TaggedError("ConfigurationError") {
    constructor(options) {
        super(options);
    }
}
export class ConfigSchemaMissingError extends Data.TaggedError("ConfigSchemaMissingError") {
    constructor(options) {
        super({
            message: `Schema is required for validation when loading ${options.filePath}`,
            filePath: options.filePath
        });
    }
}
//# sourceMappingURL=errors.js.map