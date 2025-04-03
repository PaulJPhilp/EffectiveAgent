import { Context, Data, Effect, Layer, ReadonlyArray } from "effect";
import { type Readable } from "stream"; // Using Node.js stream type
import { z } from "zod";

// Assuming RepositoryService types/errors are accessible
import {
    type BaseEntity,
    type DataValidationError as RepoDataValidationError,
    type EntityNotFoundError as RepoEntityNotFoundError,
    type RepositoryError as RepoError,
} from "../repository/repository-service"; // Adjust path as needed

// --- Error Types ---

/** Union type for all errors potentially raised by FileService. */
export type FileError =
    | DataValidationError
    | FileNotFoundError
    | FileStorageError
    | InvalidReferenceOperationError;

/** Error indicating invalid input data during file operations (e.g., upload). */
export class DataValidationError extends Data.TaggedError("DataValidationError")<{
    readonly message: string;
    readonly cause?: unknown; // e.g., ZodError
}> { }

/** Error indicating the requested fileId does not correspond to existing metadata. */
export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
    readonly fileId: string;
    readonly message: string;
    readonly cause?: RepoEntityNotFoundError; // Optional underlying cause
}> { }

/** General error for issues interacting with metadata repository or content storage backend. */
export class FileStorageError extends Data.TaggedError("FileStorageError")<{
    readonly message: string;
    readonly fileId?: string; // Optional: fileId might not be known for upload errors
    readonly cause?: RepoError | unknown; // Underlying storage or repo error
}> { }

/** Error indicating an invalid reference count operation (e.g., decrementing below zero). */
export class InvalidReferenceOperationError extends Data.TaggedError(
    "InvalidReferenceOperationError"
)<{
    readonly fileId: string;
    readonly message: string;
}> { }

// --- Data Structures ---

/**
 * Represents the public view of file metadata returned by the service.
 */
export interface FileMetadata {
    /** The unique identifier for the file (ID of the metadata entity). */
    readonly fileId: string;
    readonly filename: string;
    readonly mimeType: string;
    /** File size in bytes. */
    readonly sizeBytes: number;
    /** The ID of the user who owns/uploaded the file. */
    readonly userId: string;
    /** Current number of references to this file. */
    readonly referenceCount: number;
    /** Timestamp of metadata creation. */
    readonly createdAt: Date;
    /** Timestamp of last metadata update. */
    readonly updatedAt: Date;
}

/**
 * Zod schema defining the structure of file metadata stored via RepositoryService.
 * The actual primary key (`id`) and base timestamps (`createdAt`, `updatedAt`)
 * are typically managed by the BaseEntity structure from RepositoryService.
 */
export const FileMetadataEntityDataSchema = z.object({
    filename: z.string().min(1, { message: "Filename cannot be empty" }),
    mimeType: z.string().min(1, { message: "MIME type cannot be empty" }),
    sizeBytes: z.number().int().nonnegative({ message: "Size must be non-negative integer" }),
    userId: z.string().min(1, { message: "userId cannot be empty" }),
    referenceCount: z.number().int().nonnegative().default(0),
    /** Identifier for the storage backend used (e.g., "db", "s3"). */
    storageLocation: z.string().min(1),
    /** Reference identifier within the storage backend (e.g., content entity ID, S3 key). */
    storageRef: z.string().min(1),
});

/** Inferred TypeScript type for the file metadata data part. */
export type FileMetadataEntityData = z.infer<typeof FileMetadataEntityDataSchema>;

/** Type alias for the full metadata entity including BaseEntity fields. */
export type FileMetadataEntity = BaseEntity<FileMetadataEntityData>;

// --- Internal Content Storage Abstraction (Conceptual) ---

/**
 * Internal interface defining the contract for storing and retrieving
 * file content from a specific backend (e.g., Database, S3).
 * Implementations of this interface are used internally by FileServiceLive.
 */
export interface IContentStorage {
    /**
     * Stores the content from a stream.
     * @param contentStream The readable stream of the file content.
     * @returns An Effect yielding the unique storage reference (e.g., S3 key, DB row ID)
     *          and the calculated size in bytes, or failing with FileStorageError.
     */
    readonly store: (
        contentStream: Readable
    ) => Effect.Effect<{ storageRef: string; sizeBytes: number }, FileStorageError>;

    /**
     * Retrieves the content as a stream based on its storage reference.
     * @param storageRef The unique reference identifier from the store operation.
     * @returns An Effect yielding a readable stream of the content, or failing
     *          with FileStorageError (e.g., if the ref is invalid or storage is unavailable).
     */
    readonly retrieve: (
        storageRef: string
    ) => Effect.Effect<Readable, FileStorageError>;

    /**
     * Deletes the content associated with a storage reference.
     * Should succeed even if the content doesn't exist (idempotent).
     * @param storageRef The unique reference identifier.
     * @returns An Effect completing successfully (`void`) or failing with FileStorageError
     *          if deletion encounters an unexpected issue.
     */
    readonly delete: (
        storageRef: string
    ) => Effect.Effect<void, FileStorageError>;
}

// --- Service Interface ---

/**
 * Defines the contract for the FileService.
 * Manages persistent storage of file metadata and content.
 */
export interface IFileService {
    /**
     * Uploads a file's content and creates its associated metadata record.
     * The initial reference count for the new file is zero.
     *
     * @param params Parameters including ownership and file details.
     * @returns An Effect yielding the new file's ID and metadata, or failing with
     *          `DataValidationError` or `FileStorageError`.
     */
    readonly uploadFile: (params: {
        readonly userId: string;
        readonly filename: string;
        readonly mimeType: string;
        /** Content stream (Node.js Readable or Web Stream). */
        readonly contentStream: Readable;
    }) => Effect.Effect<
        { fileId: string; metadata: FileMetadata },
        DataValidationError | FileStorageError
    >;

    /**
     * Retrieves the metadata for a specific file using its ID.
     *
     * @param params Parameters including the fileId.
     * @returns An Effect yielding the `FileMetadata`, or failing with
     *          `FileNotFoundError` or `FileStorageError`.
     */
    readonly getFileMetadata: (params: {
        readonly fileId: string;
    }) => Effect.Effect<FileMetadata, FileNotFoundError | FileStorageError>;

    /**
     * Retrieves the content of a specific file as a readable stream.
     * Performs necessary checks to ensure the file exists before attempting retrieval.
     *
     * @param params Parameters including the fileId.
     * @returns An Effect yielding a `Readable` stream of the file content, or failing with
     *          `FileNotFoundError` or `FileStorageError`.
     */
    readonly getFileStream: (params: {
        readonly fileId: string;
    }) => Effect.Effect<Readable, FileNotFoundError | FileStorageError>;

    /**
     * Lists metadata for all files associated with a specific user.
     *
     * @param params Parameters including the userId.
     * @returns An Effect yielding a readonly array of `FileMetadata`, or failing with
     *          `FileStorageError`.
     */
    readonly listFiles: (params: {
        readonly userId: string;
    }) => Effect.Effect<ReadonlyArray<FileMetadata>, FileStorageError>;

    /**
     * Atomically increments the reference count for a file, indicating it's being used
     * (e.g., attached to a conversation).
     *
     * @param params Parameters including the fileId.
     * @returns An Effect completing successfully (`void`), or failing with
     *          `FileNotFoundError` or `FileStorageError`.
     */
    readonly incrementReferenceCount: (params: {
        readonly fileId: string;
    }) => Effect.Effect<void, FileNotFoundError | FileStorageError>;

    /**
     * Atomically decrements the reference count for a file.
     * If the count reaches zero or less after decrementing, this operation
     * initiates the deletion of the file's content and its metadata record.
     *
     * @param params Parameters including the fileId.
     * @returns An Effect completing successfully (`void`), or failing with
     *          `FileNotFoundError`, `FileStorageError`, or `InvalidReferenceOperationError`.
     */
    readonly decrementReferenceCount: (params: {
        readonly fileId: string;
    }) => Effect.Effect<
        void,
        | FileNotFoundError
        | FileStorageError
        | InvalidReferenceOperationError
    >;
}

// --- Service Tag ---

/**
 * Effect Tag for the FileService. Use this to specify the service
 * as a dependency in Effect layers and access it from the context.
 */
export class FileService extends Context.Tag("FileService")<
    FileService,
    IFileService
>() { }
