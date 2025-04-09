/**
 * @file Defines specific error types for the Repository service.
 */

import type { EntityId } from "@/types.js"; // Use path alias
import { Data } from "effect";

// --- Base Repository Error Context ---
interface RepositoryErrorContext {
    readonly entityType?: string; // Optional: Type of entity being operated on
    readonly operation?: string; // Optional: CRUD operation name (create, findById, etc.)
    readonly message?: string; // Optional specific message
    readonly cause?: unknown; // Optional underlying cause (e.g., DB driver error)
}

/**
 * Generic error for repository operations that don't fit more specific types.
 */
export class RepositoryError extends Data.TaggedError("RepositoryError")<
    RepositoryErrorContext
> { }

// --- Specific Repository Errors ---

/** Error indicating a specific entity was not found. */
export class EntityNotFoundError extends Data.TaggedError("EntityNotFoundError")<{
    readonly entityType: string; // e.g., "Prompt", "Skill"
    readonly entityId: EntityId;
    readonly message?: string; // Optional override message
}> { }

/** Error indicating a unique constraint violation during create or update. */
export class DuplicateEntryError extends Data.TaggedError("DuplicateEntryError")<{
    readonly entityType: string;
    readonly conflictingField: string;
    readonly conflictingValue: unknown;
    readonly message?: string; // Optional override message
}> { }

// --- Union Type ---

/** Type alias for any error the generic RepositoryApi can produce directly. */
export type RepositoryErrorUnion =
    | RepositoryError
    | EntityNotFoundError
    | DuplicateEntryError; // Add other common errors here if needed

// Note: Specific repository implementations might define additional, more specific errors.
