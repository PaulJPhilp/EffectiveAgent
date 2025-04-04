/**
 * @file Defines errors specific to the Logging Service (if any).
 * Often, logging failures might be handled internally or ignored,
 * but defining a base error can be useful.
 */

import { AppError } from "../../errors.js"; // Import global base error

/** Base error for Logging service operations (e.g., failure to write to transport). */
export class LoggingError extends AppError {
    constructor(params: {
        message: string;
        cause?: unknown;
        context?: Record<string, unknown>;
    }) {
        super({
            message: `Logging Error: ${params.message}`,
            cause: params.cause,
            context: params.context,
        });
    }
}
