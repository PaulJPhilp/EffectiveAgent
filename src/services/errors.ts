/**
 * @file Defines globally shared base error classes.
 * Service-specific errors should typically extend AppError and reside within their respective service directories.
 */

import { Data } from "effect";

/** Base error class for all application-specific errors. */
export class AppError extends Data.TaggedError("AppError")<{
    readonly message: string; // User/developer-friendly message
    readonly cause?: unknown; // Original error cause, if any
    readonly context?: Record<string, unknown>; // Optional additional context
}> { }

/** Represents an unexpected or unknown error. */
export class UnknownError extends AppError {
    constructor(cause: unknown) {
        // Extract message from cause if possible, otherwise use default
        const message =
            cause instanceof Error
                ? `An unknown error occurred: ${cause.message}`
                : "An unknown error occurred";
        super({ message, cause });
    }
}

/** Error indicating that a requested resource was not found. */
export class ResourceNotFoundError extends AppError {
    constructor(params: {
        resourceType: string;
        resourceId?: string | number;
        message?: string;
    }) {
        const defaultMessage = params.resourceId
            ? `${params.resourceType} with ID '${params.resourceId}' not found.`
            : `${params.resourceType} not found.`;
        super({
            message: params.message ?? defaultMessage,
            context: { resourceType: params.resourceType, resourceId: params.resourceId },
        });
    }
}

/** Error indicating invalid input data. */
export class DataValidationError extends AppError {
    constructor(params: {
        message?: string;
        cause?: unknown; // Often a ZodError
        context?: Record<string, unknown>;
    }) {
        super({
            message: params.message ?? "Input data validation failed.",
            cause: params.cause,
            context: params.context,
        });
    }
}

// Add other truly generic base errors here if needed (e.g., PermissionError)
