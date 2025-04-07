/**
 * @file Defines specific error types for the Attachment service.
 */

import { Data } from "effect";
import type { EntityId } from "@/types.js";

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

/** Union of all possible attachment service errors. */
export type AttachmentError = AttachmentLinkNotFoundError | AttachmentDbError;
