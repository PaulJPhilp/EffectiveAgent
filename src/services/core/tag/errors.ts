/**
 * @file Defines specific error types for the Tag service.
 */

import type { EntityId } from "@/types.js";
import { Data } from "effect";

/** Error indicating a tag was not found by ID or name. */
export class TagNotFoundError extends Data.TaggedError("TagNotFoundError")<{
    readonly identifier: string; // ID or name used for lookup
    readonly message?: string;
}> { }

/** Error indicating a tag with the given name already exists. */
export class DuplicateTagNameError extends Data.TaggedError("DuplicateTagNameError")<{
    readonly tagName: string;
    readonly message?: string;
}> { }

/** Error indicating the link between a specific tag and entity already exists. */
export class LinkAlreadyExistsError extends Data.TaggedError("LinkAlreadyExistsError")<{
    readonly tagId: EntityId;
    readonly entityId: EntityId;
    readonly entityType: string;
    readonly message?: string;
}> { }

/** Error indicating the link to be deleted was not found. */
export class LinkNotFoundError extends Data.TaggedError("LinkNotFoundError")<{
    readonly tagId: EntityId;
    readonly entityId: EntityId;
    readonly entityType: string;
    readonly message?: string;
}> { }


/** Generic error for database operations related to tags or links. */
export class TagDbError extends Data.TaggedError("TagDbError")<{
    readonly operation: string; // e.g., "createTag", "findLinks"
    readonly message?: string;
    readonly cause?: unknown; // Underlying database/repository error
}> { }

/** Union of all possible tag service errors. */
export type TagError =
    | TagNotFoundError
    | DuplicateTagNameError
    | LinkAlreadyExistsError
    | LinkNotFoundError
    | TagDbError;

