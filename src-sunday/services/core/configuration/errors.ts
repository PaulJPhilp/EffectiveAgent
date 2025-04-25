/**
 * @file Defines errors specific to the ConfigLoader service.
 */

// Removed FileSystem import as we simplify the 'cause' type
// import type { FileSystem } from "@effect/platform/FileSystem";
import { type ZodError, z } from "zod"; // Import Zod types
import { AppError } from "../../errors.js"; // Import global base error

/** Error occurring during file reading. */
export class ConfigReadError extends AppError {
    constructor(params: {
        filePath: string;
        message?: string;
        cause?: unknown; // Use 'unknown' for cause, specific type isn't strictly needed here
    }) {
        super({
            message: params.message ?? `Failed to read configuration file: ${params.filePath}`,
            cause: params.cause,
            context: { filePath: params.filePath, errorType: "ConfigReadError" },
        });
    }
}

/** Error occurring during JSON parsing. */
export class ConfigParseError extends AppError {
    constructor(params: {
        filePath: string;
        message?: string;
        cause?: unknown; // Typically a SyntaxError
    }) {
        super({
            message: params.message ?? `Failed to parse JSON in configuration file: ${params.filePath}`,
            cause: params.cause,
            context: { filePath: params.filePath, errorType: "ConfigParseError" },
        });
    }
}

/** Error occurring during Zod schema validation. */
export class ConfigValidationError extends AppError {
    readonly zodError?: ZodError; // Keep this specific property if useful
    constructor(params: {
        filePath: string;
        message?: string;
        cause?: ZodError | unknown; // Expect ZodError usually
    }) {
        super({
            message: params.message ?? `Invalid configuration schema in file: ${params.filePath}`,
            cause: params.cause,
            context: {
                filePath: params.filePath,
                errorType: "ConfigValidationError",
                issues: params.cause instanceof z.ZodError ? params.cause.errors : undefined,
            },
        });
        if (params.cause instanceof z.ZodError) {
            this.zodError = params.cause;
        }
    }
}
