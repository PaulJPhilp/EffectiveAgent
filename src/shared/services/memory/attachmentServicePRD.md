import { Context, Data, Effect, Layer, ReadonlyArray } from "effect";
import { z } from "zod";
// Import other services: IRepositoryService, ILoggingService, IFileService
import { type IRepositoryService, RepositoryService, type BaseEntity } from "../repository/repository-service"; // Adjust path
import { type ILoggingService, LoggingService } from "../logging/types"; // Adjust path
import { type IFileService, FileService, type FileMetadata, FileNotFoundError as FileService_FileNotFoundError, FileStorageError as FileService_FileStorageError } from "../file/file-service"; // Adjust path & alias errors
import { type EntityNotFoundError as RepoEntityNotFoundError, type RepositoryError as RepoError } from "../repository/errors"; // Adjust path

// --- Data Structures ---

// Schema for data stored via RepositoryService (the link)
export const AttachmentEntityDataSchema = z.object({
    conversationId: z.string().min(1),
    fileId: z.string().min(1),
    attachedAt: z.date(),
    // metadata: z.record(z.unknown()).optional(), // Optional metadata about the link itself
});
export type AttachmentEntityData = z.infer<typeof AttachmentEntityDataSchema>;
export type AttachmentEntity = BaseEntity<AttachmentEntityData>;

// Information returned by listAttachments
export interface AttachmentInfo {
    readonly fileId: string;
    readonly filename: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
    readonly attachedAt: Date;
    // readonly metadata?: Record<string, unknown>; // Optional link metadata
}

// --- Error Types ---

export type AttachmentError =
    | FileNotFoundError // From FileService
    | AttachmentExistsError
    | AttachmentNotFoundError
    | FileStorageError // From FileService
    | GenericAttachmentError;

// Re-export FileService errors for clarity in AttachmentError union
export { FileNotFoundError, FileStorageError };

export class AttachmentExistsError extends Data.TaggedError("AttachmentExistsError")<{
    readonly conversationId: string;
    readonly fileId: string;
    readonly message: string;
}> {}

export class AttachmentNotFoundError extends Data.TaggedError("AttachmentNotFoundError")<{
    readonly conversationId: string;
    readonly fileId: string;
    readonly message: string;
    readonly cause?: RepoEntityNotFoundError;
}> {}

export class GenericAttachmentError extends Data.TaggedError("GenericAttachmentError")<{
    readonly message: string;
    readonly cause?: RepoError | unknown;
}> {}


// --- Service Interface ---

export interface IAttachmentService {
    /**
     * Attaches an existing file to a conversation.
     * Increments the file's reference count via FileService.
     * Fails if the file doesn't exist or is already attached.
     */
    readonly attachFile: (params: {
        readonly conversationId: string;
        readonly fileId: string;
        // readonly metadata?: Record<string, unknown>; // Optional link metadata
    }) => Effect.Effect<void, FileNotFoundError | AttachmentExistsError | FileStorageError | GenericAttachmentError>;

    /**
     * Lists information about all files attached to a conversation.
     * Retrieves necessary file metadata from FileService.
     */
    readonly listAttachments: (params: {
        readonly conversationId: string;
    }) => Effect.Effect<ReadonlyArray<AttachmentInfo>, GenericAttachmentError>; // FileNotFoundError handled internally

    /**
     * Removes the attachment link between a file and a conversation.
     * Decrements the file's reference count via FileService (may trigger file deletion).
     * Fails if the attachment link doesn't exist.
     */
    readonly removeAttachment: (params: {
        readonly conversationId: string;
        readonly fileId: string;
    }) => Effect.Effect<void, AttachmentNotFoundError | FileStorageError | GenericAttachmentError>;
}

// --- Service Tag ---

export class AttachmentService extends Context.Tag("AttachmentService")<
    AttachmentService,
    IAttachmentService
>() {}
