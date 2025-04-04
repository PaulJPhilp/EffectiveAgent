/**
 * @file Defines errors specific to the Repository Service.
 */

import { AppError, ResourceNotFoundError } from "../../errors.js"; // Import global base errors

// --- Base Repository Error ---

/** Base error for repository operations. */
export class RepositoryError extends AppError {
    constructor(params: {
        message: string;
        cause?: unknown;
        context?: Record<string, unknown>; // e.g., { entityType: "Thread", operation: "create" }
    }) {
        super({
            message: `Repository Error: ${params.message}`, // Add prefix for clarity
            cause: params.cause,
            context: params.context,
        });
    }
}

// --- Specific Repository Errors ---

/** Error indicating a specific entity was not found in the repository. */
export class EntityNotFoundError extends ResourceNotFoundError {
    constructor(params: {
        entityType: string; // e.g., "Thread", "Model"
        entityId: string | number;
        message?: string;
    }) {
        super({ // Call the base ResourceNotFoundError constructor
            resourceType: params.entityType,
            resourceId: params.entityId,
            message: params.message,
        });
        // readonly _tag = "EntityNotFoundError"; // Optional explicit tag if needed beyond class check
    }
}

/** Example: Error indicating a unique constraint violation. */
export class DuplicateEntryError extends RepositoryError {
    constructor(params: {
        entityType: string;
        conflictingField: string;
        conflictingValue: unknown;
        message?: string;
    }) {
        super({
            message: params.message ?? `Duplicate entry for ${params.entityType}: Field '${params.conflictingField}' already exists with value '${params.conflictingValue}'.`,
            context: {
                entityType: params.entityType,
                conflictingField: params.conflictingField,
                conflictingValue: params.conflictingValue,
            },
        });
    }
}

// Add other repository-specific errors here as needed (e.g., TransactionError, ConnectionError)
