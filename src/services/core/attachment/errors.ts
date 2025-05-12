/**
 * @file Defines specific error types for the Attachment service.
 */

import type { EntityId } from "@/types.js";
import { Data } from "effect";

/** Error indicating an attachment link was not found for the given ID. */
export class AttachmentLinkNotFoundError extends Data.TaggedError(
    "AttachmentLinkNotFoundError",
)<{
    readonly linkId: EntityId;
    readonly message?: string;
}> { }

/** Generic error for database operations related to attachments. */
export class AttachmentDbError extends Data.TaggedError("AttachmentDbError")<{
    readonly operation: string; // e.g., "createLink", "findLinksFrom"
    readonly message?: string;
    readonly cause?: unknown; // Underlying database/repository error
}> { }

/** Error specific to transaction failures in the attachment service. */
export class AttachmentTransactionError extends Data.TaggedError("AttachmentTransactionError")<{
    readonly operation: string; // e.g., "createLinks", "deleteLinksFrom"
    readonly transactionId?: string; // Optional identifier for the transaction
    readonly entityIds?: ReadonlyArray<string>; // Entities involved in the transaction
    readonly completedCount?: number; // How many operations completed before failure
    readonly totalCount?: number; // Total operations in the transaction
    readonly message?: string;
    readonly cause?: unknown; // Underlying error
}> { }

/** Error for validation failures in the attachment service. */
export class AttachmentValidationError extends Data.TaggedError("AttachmentValidationError")<{
    readonly operation: string;
    readonly validationIssues: ReadonlyArray<string>;
    readonly message?: string;
}> { }

/** Union of all possible attachment service errors. */
export type AttachmentError =
    | AttachmentLinkNotFoundError
    | AttachmentDbError
    | AttachmentTransactionError
    | AttachmentValidationError;
