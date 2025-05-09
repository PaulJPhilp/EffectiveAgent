/**
 * @file Defines specific error types for the File service.
 */

import type { ImportedType } from "@/types.js";
import { Data } from "effect";

/** Error indicating a file was not found for the given ID. */
export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
    readonly fileId: EntityId;
    readonly message?: string;
}> { }

/** Generic error for database operations related to file storage. */
export class FileDbError extends Data.TaggedError("FileDbError")<{
    readonly operation: string; // e.g., "create", "find", "delete"
    readonly fileId?: EntityId; // Optional ID if relevant to the operation
    readonly message?: string;
    readonly cause?: unknown; // Underlying database/repository error
}> { }

/** Union of all possible file service errors. */
export type FileError = FileNotFoundError | FileDbError;
