Okay, Paul. Let's define the `FileService`.

---

## Product Requirements Document: File Service

**Version:** 1.0
**Date:** 2024-07-26
**Author:** T3 Chat (Assisted by Paul)

**1. Overview**

This document outlines the requirements for the `FileService`, a component of the Effect-based agent framework responsible for managing the persistent storage of files associated with users. This service handles both the metadata associated with a file (filename, type, size, owner, etc.) and the storage of the file's actual content. Initially, content will be stored within the primary database (e.g., Postgres `bytea`), with the architecture allowing for future migration to dedicated object storage (like S3). The `FileService` provides an abstraction layer over the underlying storage mechanisms and integrates with the `RepositoryService` for metadata persistence. It also includes mechanisms for reference counting to support shared use of files (e.g., via the `AttachmentService`).

**2. Goals**

*   **Persistent File Storage:** Provide reliable storage for user-uploaded files.
*   **Metadata Management:** Store and retrieve essential metadata about each file (name, type, size, owner, creation date, reference count).
*   **Content Management:** Handle the storage and retrieval of file content (initially in DB, designed for future external storage).
*   **User Scoping:** Ensure files are associated with a specific `UserId`.
*   **Abstraction:** Hide the complexities of underlying storage (DB blob vs. cloud storage) and metadata persistence (`RepositoryService`).
*   **Reference Counting:** Implement a mechanism to track how many times a file is referenced (e.g., attached to conversations), enabling garbage collection when a file is no longer needed.
*   **Clear API:** Offer a simple, Effect-native API for uploading, downloading/accessing, deleting, and managing file metadata and references.
*   **Type Safety & Error Handling:** Utilize Effect-TS and Zod for defining metadata structures and handling errors related to file operations.
*   **Integration:** Integrate with `LoggingService`, `ConfigurationService`, and `RepositoryService`.

**3. Non-Goals**

*   **Replacing `RepositoryService`:** This service uses `RepositoryService` for metadata.
*   **Managing Chat History or User KV Memory:** Handled by `ChatMemoryService` and `LongTermMemoryService`.
*   **Directly Managing Conversation Attachments:** Handled by `AttachmentService`, which will *use* this `FileService`.
*   **File Versioning:** The initial version will manage only the latest version of a file.
*   **Advanced File Operations:** Does not include image resizing, document conversion, or complex file manipulation features.
*   **Real-time Collaboration Features:** Not a collaborative file editing system.
*   **Implementing Cloud Storage Initially:** The first implementation will target database storage for content.

**4. User Stories**

*   **As an Agent Author / Framework User, I want to:**
    *   Upload a file (e.g., a PDF, image, text file) associated with a specific `UserId`.
    *   Receive a unique `fileId` upon successful upload.
    *   Retrieve the metadata (filename, size, type) for a file using its `fileId`.
    *   Get the content of a file (e.g., as a readable stream or buffer) using its `fileId`.
    *   List all files associated with a specific `UserId`.
    *   Increment the reference count of a file when I attach it somewhere.
    *   Decrement the reference count of a file when I detach it.
    *   Have the system potentially delete files automatically when their reference count reaches zero after a decrement operation.
*   **As a Framework Maintainer, I want to:**
    *   Define the database schema (via Drizzle) for storing file metadata (`FileMetadataEntity`) and potentially file content (`FileContentEntity` or blob field).
    *   Configure the storage mechanism (DB vs. future cloud storage) via `ConfigurationService`.
    *   Ensure file operations are secure and properly scoped by `UserId`.

**5. Functional Requirements**

*   **5.1. `IFileService` Interface & `FileService` Tag:**
    *   Define an `IFileService` interface using `Effect.Tag`.
*   **5.2. Core Data Structures (Zod Schemas & Types):**
    *   `FileMetadataSchema`: `{ filename: z.string(), mimeType: z.string(), sizeBytes: z.number().int().nonnegative(), userId: z.string(), referenceCount: z.number().int().nonnegative().default(0), storageLocation: z.string(), /* e.g., "db", "s3", etc. */ storageRef: z.string(), /* e.g., content entity ID, S3 key */ /* createdAt, updatedAt from BaseEntity */ }`.
    *   `FileMetadataEntityDataSchema` (for `RepositoryService`): Matches `FileMetadataSchema`.
    *   (Potentially) `FileContentEntityDataSchema` (if storing content in a separate DB table): `{ content: z.instanceof(Buffer) /* or appropriate type for blob */ }`.
    *   Input type for upload: Likely a `ReadableStream` or `Buffer`, along with initial metadata (filename, mimeType, userId).
    *   Output type for download: Likely a `ReadableStream` or `Buffer`.
*   **5.3. Core Operations:**
    *   `uploadFile(params: { userId: string, filename: string, mimeType: string, contentStream: ReadableStream /* or Buffer */ }): Effect.Effect<{ fileId: string, metadata: FileMetadata }, FileStorageError | DataValidationError>`:
        *   Streams content to the configured storage backend (DB blob or future cloud storage).
        *   Calculates size during streaming/upload.
        *   Creates a `FileMetadataEntityData` record using `RepositoryService.create` (with `referenceCount: 0` initially).
        *   Returns the new `fileId` (which is the ID of the metadata entity) and the created metadata.
    *   `getFileMetadata(params: { fileId: string }): Effect.Effect<FileMetadata, FileNotFoundError | FileStorageError>`:
        *   Retrieves the `FileMetadataEntityData` using `RepositoryService.findById`.
        *   Maps the entity data to the `FileMetadata` return type.
        *   Fails with `FileNotFoundError` if the metadata entity doesn't exist.
    *   `getFileStream(params: { fileId: string }): Effect.Effect<ReadableStream, FileNotFoundError | FileStorageError>`:
        *   Retrieves file metadata using `getFileMetadata`.
        *   Based on `storageLocation` and `storageRef` from metadata, retrieves the content stream from the appropriate backend (DB query or cloud storage SDK call).
        *   Fails with `FileNotFoundError` if metadata doesn't exist, or `FileStorageError` if content retrieval fails.
    *   `listFiles(params: { userId: string }): Effect.Effect<ReadonlyArray<FileMetadata>, FileStorageError>`:
        *   Retrieves all `FileMetadataEntityData` records for the `userId` using `RepositoryService.find`.
        *   Maps the results to an array of `FileMetadata`.
    *   `incrementReferenceCount(params: { fileId: string }): Effect.Effect<void, FileNotFoundError | FileStorageError>`:
        *   Retrieves the metadata entity using `RepositoryService.findById`.
        *   Atomically increments the `referenceCount` field using `RepositoryService.update`. (Requires repository/DB support for atomic increments or careful locking).
        *   Fails with `FileNotFoundError` if the entity doesn't exist.
    *   `decrementReferenceCount(params: { fileId: string }): Effect.Effect<void, FileNotFoundError | FileStorageError>`:
        *   Retrieves the metadata entity using `RepositoryService.findById`.
        *   Atomically decrements the `referenceCount` field using `RepositoryService.update`.
        *   **Deletion Logic:** If the decrement results in `referenceCount <= 0`:
            *   Initiate deletion of the file content from the storage backend (DB blob / cloud storage).
            *   Delete the `FileMetadataEntityData` record using `RepositoryService.delete`.
            *   This deletion process should ideally be robust against errors (e.g., log failure to delete content but still delete metadata, or use transactional logic if possible).
        *   Fails with `FileNotFoundError` if the entity doesn't exist.
*   **5.4. Interaction with `RepositoryService`:**
    *   Uses `RepositoryService` for all CRUD operations on `FileMetadataEntityData`.
    *   May use `RepositoryService` for `FileContentEntityData` if content is stored in a separate table.
    *   Relies on `RepositoryService` capabilities for atomic updates (for reference counting) if possible.
*   **5.5. Interaction with Content Storage:**
    *   The implementation will contain logic to interact with the configured content storage backend.
    *   Initially, this involves reading/writing blob data from/to the database (possibly via `RepositoryService` if it supports blob handling, or via direct Drizzle calls within the `FileServiceLive` implementation).
    *   In the future, this logic would be replaced/extended to use cloud storage SDKs (e.g., S3 `upload`, `getObject`). The choice of backend will be determined by configuration.
*   **5.6. Error Handling:**
    *   Define specific, typed error classes extending a base `FileError`:
        *   `DataValidationError`: Invalid input during upload (e.g., missing filename).
        *   `FileNotFoundError`: Requested `fileId` does not exist. Maps from `EntityNotFoundError`.
        *   `FileStorageError`: An error occurred during content upload, download, or deletion in the storage backend (DB or cloud), or a `RepositoryError` occurred during metadata operations.
        *   `InvalidReferenceOperationError`: Attempted to decrement count below zero (should ideally be prevented by logic, but good for defense).
*   **5.7. Logging:** Integrate with `LoggingService` for all operations, logging `fileId`, `userId`, operation type, and success/failure. Avoid logging file content.
*   **5.8. Configuration:**
    *   `fileService.storage.type`: `"database"` | `"s3"` | etc.
    *   `fileService.storage.database.contentTableName`: (If using separate table).
    *   `fileService.storage.s3.bucketName`: (For future S3 backend).
    *   `fileService.repository.metadataEntityType`: (If needed by `RepositoryService`).

**6. Non-Functional Requirements**

*   **Performance:** Upload/download performance depends heavily on the storage backend and network. Streaming should be used for large files. Metadata operations depend on `RepositoryService` performance.
*   **Reliability:** File content and metadata storage should be reliable. Reference counting updates should be atomic if possible. Deletion logic needs to handle potential failures gracefully.
*   **Scalability:** Database storage for content has limitations. Architecture must support switching to scalable object storage. Metadata storage scales with `RepositoryService`.
*   **Security:** Ensure only the owning user (or authorized entities) can access/manage files. Handle content securely.
*   **Maintainability & Testability:** Clear separation between metadata and content logic. Content storage backend should be pluggable. Requires mocking `RepositoryService` and potentially the content storage interaction layer.

**7. API Design (Conceptual - Effect-TS)**

```typescript
import { Context, Data, Effect, Layer, ReadonlyArray } from "effect";
import { type Readable } from "stream"; // Use Node.js stream type or web equivalent
import { z } from "zod";
// Import other services: IRepositoryService, ILoggingService, ConfigurationService
import { type IRepositoryService, RepositoryService, type BaseEntity } from "../repository/repository-service"; // Adjust path
import { type ILoggingService, LoggingService } from "../logging/types"; // Adjust path
// import { type ConfigurationService } from "../configuration/configuration-service"; // Adjust path
import { type DataValidationError as RepoDataValidationError, type EntityNotFoundError as RepoEntityNotFoundError, type RepositoryError as RepoError } from "../repository/errors"; // Adjust path

// --- Data Structures ---

// Represents the public view of file metadata
export interface FileMetadata {
    readonly fileId: string; // ID of the metadata entity
    readonly filename: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
    readonly userId: string;
    readonly referenceCount: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    // Exclude storageLocation/storageRef from public view? Maybe.
}

// Schema for metadata stored via RepositoryService
export const FileMetadataEntityDataSchema = z.object({
    filename: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    userId: z.string().min(1),
    referenceCount: z.number().int().nonnegative().default(0),
    storageLocation: z.string(), // e.g., "db", "s3"
    storageRef: z.string(), // e.g., content entity ID, S3 key
});
export type FileMetadataEntityData = z.infer<typeof FileMetadataEntityDataSchema>;
export type FileMetadataEntity = BaseEntity<FileMetadataEntityData>;

// --- Error Types ---

export type FileError = DataValidationError | FileNotFoundError | FileStorageError | InvalidReferenceOperationError;

export class DataValidationError extends Data.TaggedError("DataValidationError")<{
    readonly message: string;
    readonly cause?: unknown;
}> {}

export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
    readonly fileId: string;
    readonly message: string;
    readonly cause?: RepoEntityNotFoundError;
}> {}

export class FileStorageError extends Data.TaggedError("FileStorageError")<{
    readonly message: string;
    readonly fileId?: string; // Optional: fileId might not be known for upload errors
    readonly cause?: RepoError | unknown; // Underlying storage or repo error
}> {}

export class InvalidReferenceOperationError extends Data.TaggedError("InvalidReferenceOperationError")<{
    readonly fileId: string;
    readonly message: string;
}> {}


// --- Service Interface ---

export interface IFileService {
    /** Uploads a file and creates its metadata record. */
    readonly uploadFile: (params: {
        readonly userId: string;
        readonly filename: string;
        readonly mimeType: string;
        /** Content stream (Node.js Readable or Web Stream). */
        readonly contentStream: Readable;
    }) => Effect.Effect<{ fileId: string; metadata: FileMetadata }, DataValidationError | FileStorageError>;

    /** Retrieves metadata for a specific file. */
    readonly getFileMetadata: (params: {
        readonly fileId: string;
    }) => Effect.Effect<FileMetadata, FileNotFoundError | FileStorageError>;

    /** Retrieves the content of a specific file as a stream. */
    readonly getFileStream: (params: {
        readonly fileId: string;
    }) => Effect.Effect<Readable, FileNotFoundError | FileStorageError>;

    /** Lists metadata for all files owned by a user. */
    readonly listFiles: (params: {
        readonly userId: string;
    }) => Effect.Effect<ReadonlyArray<FileMetadata>, FileStorageError>;

    /** Atomically increments the reference count for a file. */
    readonly incrementReferenceCount: (params: {
        readonly fileId: string;
    }) => Effect.Effect<void, FileNotFoundError | FileStorageError>;

    /**
     * Atomically decrements the reference count for a file.
     * If the count reaches zero, initiates deletion of file content and metadata.
     */
    readonly decrementReferenceCount: (params: {
        readonly fileId: string;
    }) => Effect.Effect<void, FileNotFoundError | FileStorageError | InvalidReferenceOperationError>;

    // Maybe a direct delete for admin purposes?
    // readonly forceDeleteFile: (params: { fileId: string }) => Effect.Effect<void, FileNotFoundError | FileStorageError>;
}

// --- Service Tag ---

export class FileService extends Context.Tag("FileService")<
    FileService,
    IFileService
>() {}
```

**8. Error Handling Summary**

*   Maps `RepositoryService` errors.
*   `DataValidationError` for invalid upload parameters.
*   `FileNotFoundError` for operations on non-existent `fileId`.
*   `FileStorageError` for issues interacting with metadata repo or content storage backend.
*   `InvalidReferenceOperationError` for invalid decrement calls (defensive).

**9. Configuration Summary**

*   Requires configuration for the content storage backend (`fileService.storage.type`, plus backend-specific settings).
*   Relies on `RepositoryService` configuration.

**10. Open Questions / Future Considerations**

*   **Content Storage Abstraction:** How exactly will the content storage backend be abstracted to allow switching between DB and cloud? A dedicated internal interface/service?
*   **Atomic Operations:** How critical are atomic increments/decrements for reference counting? Can the `RepositoryService` support this, or does the `FileService` need to implement optimistic/pessimistic locking if using separate read/update?
*   **Deletion Robustness:** How to handle failures during the multi-step deletion process (delete content -> delete metadata)? Background jobs? Transactional scope if possible?
*   **Streaming Implementation:** Need to carefully handle stream consumption, backpressure, and error handling during upload/download.
*   **Direct Deletion:** Is an admin-level `forceDeleteFile` needed, bypassing reference counts?

---

This PRD sets the stage for the `FileService`, defining its role in managing file metadata and content with reference counting.