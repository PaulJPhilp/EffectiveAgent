import { Context, Data, Effect, Layer, ReadonlyArray } from "effect";
import { z } from "zod";

// Import dependent service interfaces/tags and specific errors
import {
    type IRepositoryService,
    type BaseEntity,
    type EntityNotFoundError as RepoEntityNotFoundError,
    type RepositoryError as RepoError,
} from "../repository/repository-service"; // Adjust path
import { type ILoggingService } from "../logging/types"; // Adjust path
import {
    type IFileService,
    type FileMetadata, // Needed for AttachmentInfo
    FileNotFoundError as FileService_FileNotFoundError, // Alias to avoid name clash
    FileStorageError as FileService_FileStorageError, // Alias to avoid name clash
} from "../file/file-service"; // Adjust path

// --- Data Structures ---

/**
 * Zod schema defining the structure of the attachment link record
 * stored via RepositoryService.
 */
export const AttachmentEntityDataSchema = z.object({
    /** The identifier for the conversation the file is attached to. */
    conversationId: z.string().min(1),
    /** The identifier for the file being attached (managed by FileService). */
    fileId: z.string().min(1),
    /** Timestamp when the attachment was created. */
    attachedAt: z.date(),
    /** Optional metadata specific to the attachment link itself (e.g., added by whom). */
    // metadata: z.record(z.unknown()).optional(),
});

/** Inferred TypeScript type for the attachment link data part. */
export type AttachmentEntityData = z.infer<typeof AttachmentEntityDataSchema>;

/** Type alias for the full attachment entity including BaseEntity fields. */
export type AttachmentEntity = BaseEntity<AttachmentEntityData>;

/**
 * Represents information about a file attached to a conversation,
 * combining attachment details with basic file metadata.
 */
export interface AttachmentInfo {
    /** The unique identifier of the attached file. */
    readonly fileId: string;
    /** The original filename of the attached file. */
    readonly filename: string;
    /** The MIME type of the attached file. */
    readonly mimeType: string;
    /** The size of the attached file in bytes. */
    readonly sizeBytes: number;
    /** Timestamp when the file was attached to this specific conversation. */
    readonly attachedAt: Date;
    /** Optional metadata associated with the attachment link itself. */
    // readonly metadata?: Readonly<Record<string, unknown>>;
}

// --- Error Types ---

// Re-export aliased errors from FileService for inclusion in AttachmentError union
export type FileNotFoundError = FileService_FileNotFoundError;
export const FileNotFoundError = FileService_FileNotFoundError;
export type FileStorageError = FileService_FileStorageError;
export const FileStorageError = FileService_FileStorageError;

/** Error indicating the file is already attached to the conversation. */
export class AttachmentExistsError extends Data.TaggedError(
    "AttachmentExistsError"
)<{
    readonly conversationId: string;
    readonly fileId: string;
    readonly message: string;
}> { }

/** Error indicating the specified attachment link was not found. */
export class AttachmentNotFoundError extends Data.TaggedError(
    "AttachmentNotFoundError"
)<{
    readonly conversationId: string;
    readonly fileId: string;
    readonly message: string;
    readonly cause?: RepoEntityNotFoundError; // Optional underlying cause
}> { }

/** General error for repository issues related to attachment links or other unexpected failures. */
export class GenericAttachmentError extends Data.TaggedError(
    "GenericAttachmentError"
)<{
    readonly message: string;
    readonly cause?: RepoError | unknown; // Underlying repository or other error
}> { }

/** Union type for all errors potentially raised by AttachmentService. */
export type AttachmentError =
    | FileNotFoundError // From FileService (file doesn't exist)
    | AttachmentExistsError // Link already exists
    | AttachmentNotFoundError // Link doesn't exist for removal
    | FileStorageError // From FileService (ref count failed)
    | GenericAttachmentError; // Repo errors for attachment entity

// --- Service Interface ---

/**
 * Defines the contract for the AttachmentService.
 * Manages links between files (from FileService) and conversations.
 */
export interface IAttachmentService {
    /**
     * Creates a link attaching an existing file to a conversation.
     * This operation is idempotent based on the combination of
     * `conversationId` and `fileId`. It verifies the file exists
     * and increments its reference count via `FileService`.
     *
     * @param params Parameters including conversationId and fileId.
     * @returns An Effect that completes successfully (`void`) or fails with
     *          `FileNotFoundError` (if file doesn't exist),
     *          `AttachmentExistsError` (if already attached),
     *          `FileStorageError` (if ref count increment fails),
     *          or `GenericAttachmentError` (if attachment record creation fails).
     */
    readonly attachFile: (params: {
        readonly conversationId: string;
        readonly fileId: string;
        // readonly metadata?: Readonly<Record<string, unknown>>; // Optional link metadata
    }) => Effect.Effect<
        void,
        | FileNotFoundError
        | AttachmentExistsError
        | FileStorageError
        | GenericAttachmentError
    >;

    /**
     * Lists information about all files currently attached to a specific conversation.
     * Retrieves necessary file metadata from `FileService` for each attachment.
     * Handles potential inconsistencies gracefully (e.g., attachment link exists
     * but file metadata is missing).
     *
     * @param params Parameters including conversationId.
     * @returns An Effect yielding a readonly array of `AttachmentInfo`, or failing with
     *          `GenericAttachmentError` if retrieving attachment links fails.
     *          Errors retrieving individual file metadata are logged and skipped.
     */
    readonly listAttachments: (params: {
        readonly conversationId: string;
    }) => Effect.Effect<ReadonlyArray<AttachmentInfo>, GenericAttachmentError>;

    /**
     * Removes the link attaching a file to a conversation.
     * Decrements the file's reference count via `FileService`, which may
     * trigger the deletion of the file itself if the count reaches zero.
     *
     * @param params Parameters including conversationId and fileId.
     * @returns An Effect that completes successfully (`void`) or fails with
     *          `AttachmentNotFoundError` (if the link doesn't exist),
     *          `FileStorageError` (if ref count decrement fails),
     *          or `GenericAttachmentError` (if attachment record deletion fails).
     */
    readonly removeAttachment: (params: {
        readonly conversationId: string;
        readonly fileId: string;
    }) => Effect.Effect<
        void,
        | AttachmentNotFoundError
        | FileStorageError
        | GenericAttachmentError
    >;
}

// --- Service Tag ---

/**
 * Effect Tag for the AttachmentService. Use this to specify the service
 * as a dependency in Effect layers and access it from the context.
 */
export class AttachmentService extends Context.Tag("AttachmentService")<
    AttachmentService,
    IAttachmentService
>() { }
