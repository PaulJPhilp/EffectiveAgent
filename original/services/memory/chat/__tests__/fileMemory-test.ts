import { Context, Data, Effect, Layer, ReadonlyArray } from "effect";
import { type Readable } from "stream"; // Using Node.js stream type
import { z } from "zod";

// Assuming RepositoryService types/errors are accessible
import {
    type BaseEntity,
    type EntityNotFoundError as RepoEntityNotFoundError,
    type RepositoryError as RepoError
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

import * as EffectVitest from "@effect/vitest";
import { buffer } from "stream/consumers"; // For consuming streams in tests
import { afterEach, describe, expect, it, vi } from "vitest";

// Import service definition, errors, schemas
import {
    DataValidationError, FileNotFoundError,
    FileService,
    FileStorageError, InvalidReferenceOperationError,
    type FileMetadata, type FileMetadataEntityData,
    type IFileService
} from "../src/file/file-service"; // Adjust path

// Import Live implementation and Layer
import { FileServiceLiveLayer } from "../src/file/file-service-live"; // Adjust path

// Import Mocks & Tags
import {
    getFileTestMocks, // Use correct helper/type
    MockContentStorage, MockContentStorageLayer,
    MockFileMetadataRepositoryLayer,
    mockLogger, MockLoggingServiceLayer,
    type MockFileMetadataRepositoryService, // Use correct helper/type
} from "./testing/mocks.ts"; // Adjust path

// --- Test Setup ---

// Helper to create a simple Readable stream from text
const createTextStream = (text: string): Readable => {
    const stream = new Readable();
    stream.push(text);
    stream.push(null);
    return stream;
};

// Create the full layer stack for testing
const TestLayer = FileServiceLiveLayer.pipe(
    Layer.provide(MockLoggingServiceLayer),
    Layer.provide(MockFileMetadataRepositoryLayer), // Provide the mock repo layer
    Layer.provide(MockContentStorageLayer) // Provide the mock content storage layer
);

// Use EffectVitest.provide for the test suite
const { it } = EffectVitest.provide(TestLayer);

// Helper to get service instance and mocks within tests
const getTestServiceAndMocks = Effect.all({
    svc: FileService,
    mocks: getFileTestMocks,
});

describe("FileServiceLive", () => {
    let mockRepoService: MockFileMetadataRepositoryService;
    let mockContentStorage: MockContentStorage;

    EffectVitest.beforeEach(() =>
        Effect.gen(function* (_) {
            vi.clearAllMocks();
            const { mocks } = yield* _(getTestServiceAndMocks);
            mockRepoService = mocks.repoSvc as MockFileMetadataRepositoryService;
            mockContentStorage = mocks.contentStorage as MockContentStorage;
            mockRepoService.reset();
            mockContentStorage.reset();
        })
    );

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // --- uploadFile ---
    describe("uploadFile", () => {
        it("should store content, create metadata, and return fileId/metadata", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const content = "Test file content";
                const stream = createTextStream(content);
                const params = { userId: "user1", filename: "test.txt", mimeType: "text/plain", contentStream: stream };

                const result = yield* _(svc.uploadFile(params));

                expect(result.fileId).toMatch(/^mock-filemeta-\d+$/);
                expect(result.metadata.filename).toBe("test.txt");
                expect(result.metadata.mimeType).toBe("text/plain");
                expect(result.metadata.userId).toBe("user1");
                expect(result.metadata.sizeBytes).toBe(content.length);
                expect(result.metadata.referenceCount).toBe(0); // Initial count

                // Verify mock interactions
                expect(mockContentStorage.store).toHaveBeenCalledTimes(1);
                // We can't directly compare streams, but mock store captures content
                const storedContentRef = mockRepoService.create.mock.calls[0][0].storageRef;
                const storedBuffer = (mockContentStorage as any).mockContentStore.get(storedContentRef); // Access internal mock state
                expect(storedBuffer?.toString()).toBe(content);

                expect(mockRepoService.create).toHaveBeenCalledTimes(1);
                expect(mockRepoService.create).toHaveBeenCalledWith(expect.objectContaining({
                    filename: "test.txt",
                    mimeType: "text/plain",
                    userId: "user1",
                    sizeBytes: content.length,
                    referenceCount: 0,
                    storageLocation: "mock", // From mock impl
                    storageRef: expect.stringMatching(/^mock-content-\d+$/)
                }));
            }));

        it("should fail with DataValidationError if required params are missing", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const stream = createTextStream("content");
                const params = { userId: "user1", filename: "", mimeType: "text/plain", contentStream: stream }; // Empty filename

                const result = yield* _(svc.uploadFile(params), Effect.flip);

                expect(result).toBeInstanceOf(DataValidationError);
                expect(mockContentStorage.store).not.toHaveBeenCalled();
                expect(mockRepoService.create).not.toHaveBeenCalled();
            }));

        it("should fail with FileStorageError if content storage fails", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const stream = createTextStream("content");
                const params = { userId: "user1", filename: "fail.txt", mimeType: "text/plain", contentStream: stream };
                // Configure mock content store to fail
                const storeError = new FileStorageError({ message: "Disk full" });
                mockContentStorage.store.mockImplementationOnce(() => Effect.fail(storeError));

                const result = yield* _(svc.uploadFile(params), Effect.flip);

                expect(result).toBeInstanceOf(FileStorageError);
                expect(result.message).toBe("Disk full"); // Error propagates
                expect(mockRepoService.create).not.toHaveBeenCalled(); // Metadata should not be created
            }));

        it("should fail with FileStorageError if metadata creation fails", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const stream = createTextStream("content");
                const params = { userId: "user1", filename: "metafail.txt", mimeType: "text/plain", contentStream: stream };
                // Configure mock repo create to fail
                const repoError = new RepoError({ message: "DB connection failed" });
                mockRepoService.create.mockImplementationOnce(() => Effect.fail(repoError));

                const result = yield* _(svc.uploadFile(params), Effect.flip);

                expect(result).toBeInstanceOf(FileStorageError);
                expect(result.message).toBe("Failed to create file metadata");
                expect(result.cause).toBe(repoError);
                expect(mockContentStorage.store).toHaveBeenCalledTimes(1); // Content was stored
                // Ideally, test that content cleanup was attempted (e.g., mockContentStorage.delete called)
                // This requires adding cleanup logic to the uploadFile implementation's error handling
            }));
    });

    // --- getFileMetadata ---
    describe("getFileMetadata", () => {
        it("should return metadata for an existing file", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                // Pre-populate metadata
                const created = yield* _(mockRepoService.create({ userId: "user2", filename: "meta.get", mimeType: "app/json", sizeBytes: 100, referenceCount: 1, storageLocation: "mock", storageRef: "ref1" }));

                const result = yield* _(svc.getFileMetadata({ fileId: created.id }));

                expect(result.fileId).toBe(created.id);
                expect(result.filename).toBe("meta.get");
                expect(result.userId).toBe("user2");
                expect(result.referenceCount).toBe(1);
                expect(mockRepoService.findById).toHaveBeenCalledWith({ id: created.id });
            }));

        it("should fail with FileNotFoundError if metadata does not exist", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const result = yield* _(svc.getFileMetadata({ fileId: "nonexistent-meta" }), Effect.flip);

                expect(result).toBeInstanceOf(FileNotFoundError);
                expect(result.fileId).toBe("nonexistent-meta");
            }));
    });

    // --- getFileStream ---
    describe("getFileStream", () => {
        it("should return content stream for an existing file", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const content = "Stream content";
                const contentRef = "ref-stream1";
                (mockContentStorage as any).mockContentStore.set(contentRef, Buffer.from(content)); // Put content in mock store
                const meta = yield* _(mockRepoService.create({ userId: "user3", filename: "stream.get", mimeType: "text/plain", sizeBytes: content.length, referenceCount: 0, storageLocation: "mock", storageRef: contentRef }));

                const streamResult = yield* _(svc.getFileStream({ fileId: meta.id }));

                // Consume the stream to verify content
                const retrievedContent = yield* _(Effect.promise(() => buffer(streamResult)));

                expect(retrievedContent.toString()).toBe(content);
                expect(mockRepoService.findById).toHaveBeenCalledWith({ id: meta.id });
                expect(mockContentStorage.retrieve).toHaveBeenCalledWith(contentRef);
            }));

        it("should fail with FileNotFoundError if metadata does not exist", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const result = yield* _(svc.getFileStream({ fileId: "nonexistent-stream" }), Effect.flip);

                expect(result).toBeInstanceOf(FileNotFoundError);
                expect(mockContentStorage.retrieve).not.toHaveBeenCalled();
            }));

        it("should fail with FileStorageError if content retrieval fails", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const contentRef = "ref-fail";
                const meta = yield* _(mockRepoService.create({ userId: "user4", filename: "stream.fail", mimeType: "text/plain", sizeBytes: 10, referenceCount: 0, storageLocation: "mock", storageRef: contentRef }));
                // Configure mock content retrieve to fail
                const retrieveError = new FileStorageError({ message: "Content storage offline" });
                mockContentStorage.retrieve.mockImplementationOnce(() => Effect.fail(retrieveError));

                const result = yield* _(svc.getFileStream({ fileId: meta.id }), Effect.flip);

                expect(result).toBeInstanceOf(FileStorageError);
                expect(result.message).toBe("Content storage offline");
                expect(mockContentStorage.retrieve).toHaveBeenCalledWith(contentRef);
            }));
    });

    // --- listFiles ---
    describe("listFiles", () => {
        it("should return empty array when user has no files", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const result = yield* _(svc.listFiles({ userId: "user-no-files" }));
                expect(result).toEqual([]);
                expect(mockRepoService.find).toHaveBeenCalledWith({ userId: "user-no-files" });
            }));

        it("should return metadata for all files owned by user", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const f1 = yield* _(mockRepoService.create({ userId: "user-list", filename: "f1.txt", mimeType: "t/p", sizeBytes: 1, referenceCount: 0, storageLocation: "mock", storageRef: "r1" }));
                const f2 = yield* _(mockRepoService.create({ userId: "user-list", filename: "f2.img", mimeType: "i/p", sizeBytes: 2, referenceCount: 1, storageLocation: "mock", storageRef: "r2" }));
                yield* _(mockRepoService.create({ userId: "other-user", filename: "f3.txt", mimeType: "t/p", sizeBytes: 3, referenceCount: 0, storageLocation: "mock", storageRef: "r3" })); // Different user

                const result = yield* _(svc.listFiles({ userId: "user-list" }));

                expect(result.length).toBe(2);
                expect(result.map(f => f.fileId).sort()).toEqual([f1.id, f2.id].sort());
                expect(result.find(f => f.fileId === f1.id)?.filename).toBe("f1.txt");
                expect(result.find(f => f.fileId === f2.id)?.filename).toBe("f2.img");
                expect(mockRepoService.find).toHaveBeenCalledWith({ userId: "user-list" });
            }));
    });

    // --- incrementReferenceCount ---
    describe("incrementReferenceCount", () => {
        it("should increment count for existing file", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const f1 = yield* _(mockRepoService.create({ userId: "user-inc", filename: "inc.txt", mimeType: "t/p", sizeBytes: 1, referenceCount: 1, storageLocation: "mock", storageRef: "r-inc" }));

                yield* _(svc.incrementReferenceCount({ fileId: f1.id }));

                expect(mockRepoService.update).toHaveBeenCalledTimes(1);
                expect(mockRepoService.update).toHaveBeenCalledWith(f1.id, { $increment: { referenceCount: 1 } });

                // Verify count actually changed in mock DB
                const updatedMeta = (mockRepoService as any).mockFileMetaDb.get(f1.id);
                expect(updatedMeta?.data.referenceCount).toBe(2);
            }));

        it("should fail with FileNotFoundError if file does not exist", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const result = yield* _(svc.incrementReferenceCount({ fileId: "nonexistent-inc" }), Effect.flip);
                expect(result).toBeInstanceOf(FileNotFoundError);
            }));
    });

    // --- decrementReferenceCount ---
    describe("decrementReferenceCount", () => {
        it("should decrement count > 1 without deleting", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const f1 = yield* _(mockRepoService.create({ userId: "user-dec", filename: "dec.txt", mimeType: "t/p", sizeBytes: 1, referenceCount: 2, storageLocation: "mock", storageRef: "r-dec1" }));

                yield* _(svc.decrementReferenceCount({ fileId: f1.id }));

                expect(mockRepoService.update).toHaveBeenCalledTimes(1);
                expect(mockRepoService.update).toHaveBeenCalledWith(f1.id, { $increment: { referenceCount: -1 } });
                expect(mockContentStorage.delete).not.toHaveBeenCalled();
                expect(mockRepoService.delete).not.toHaveBeenCalled();

                // Verify count
                const updatedMeta = (mockRepoService as any).mockFileMetaDb.get(f1.id);
                expect(updatedMeta?.data.referenceCount).toBe(1);
            }));

        it("should decrement count to 0 and trigger deletion", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const contentRef = "r-dec-del";
                (mockContentStorage as any).mockContentStore.set(contentRef, Buffer.from("delete me"));
                const f1 = yield* _(mockRepoService.create({ userId: "user-dec", filename: "dec-del.txt", mimeType: "t/p", sizeBytes: 9, referenceCount: 1, storageLocation: "mock", storageRef: contentRef }));

                yield* _(svc.decrementReferenceCount({ fileId: f1.id }));

                // Verify decrement call
                expect(mockRepoService.update).toHaveBeenCalledTimes(1);
                expect(mockRepoService.update).toHaveBeenCalledWith(f1.id, { $increment: { referenceCount: -1 } });

                // Verify deletion calls
                expect(mockContentStorage.delete).toHaveBeenCalledTimes(1);
                expect(mockContentStorage.delete).toHaveBeenCalledWith(contentRef);
                expect(mockRepoService.delete).toHaveBeenCalledTimes(1);
                expect(mockRepoService.delete).toHaveBeenCalledWith(f1.id);

                // Verify metadata is gone
                const findResult = yield* _(mockRepoService.findById({ id: f1.id }), Effect.flip);
                expect(findResult).toBeInstanceOf(RepoEntityNotFoundError);
                // Verify content is gone
                expect((mockContentStorage as any).mockContentStore.has(contentRef)).toBe(false);
            }));

        it("should handle decrementing count already at 0 (no deletion, logs warning)", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const f1 = yield* _(mockRepoService.create({ userId: "user-dec0", filename: "dec0.txt", mimeType: "t/p", sizeBytes: 1, referenceCount: 0, storageLocation: "mock", storageRef: "r-dec0" }));

                yield* _(svc.decrementReferenceCount({ fileId: f1.id }));

                expect(mockRepoService.update).toHaveBeenCalledTimes(1); // Decrement still happens
                expect(mockRepoService.update).toHaveBeenCalledWith(f1.id, { $increment: { referenceCount: -1 } });
                expect(mockContentStorage.delete).not.toHaveBeenCalled(); // No deletion triggered
                expect(mockRepoService.delete).not.toHaveBeenCalled();
                expect(mockLogger.warn).toHaveBeenCalledWith(
                    "Attempted to decrement reference count at or below zero",
                    expect.objectContaining({ fileId: f1.id, currentCount: 0 })
                );

                // Verify count is now -1
                const updatedMeta = (mockRepoService as any).mockFileMetaDb.get(f1.id);
                expect(updatedMeta?.data.referenceCount).toBe(-1);
            }));


        it("should fail with FileNotFoundError if file does not exist", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const result = yield* _(svc.decrementReferenceCount({ fileId: "nonexistent-dec" }), Effect.flip);
                expect(result).toBeInstanceOf(FileNotFoundError);
            }));

        it("should attempt metadata deletion even if content deletion fails", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const contentRef = "r-dec-del-fail";
                const f1 = yield* _(mockRepoService.create({ userId: "user-dec", filename: "dec-del-fail.txt", mimeType: "t/p", sizeBytes: 9, referenceCount: 1, storageLocation: "mock", storageRef: contentRef }));
                // Configure mock content delete to fail
                const deleteError = new FileStorageError({ message: "S3 Access Denied" });
                mockContentStorage.delete.mockImplementationOnce(() => Effect.fail(deleteError));

                yield* _(svc.decrementReferenceCount({ fileId: f1.id })); // Should still succeed overall (by default)

                expect(mockRepoService.update).toHaveBeenCalledTimes(1); // Decrement
                expect(mockContentStorage.delete).toHaveBeenCalledWith(contentRef); // Attempted
                expect(mockRepoService.delete).toHaveBeenCalledTimes(1); // Metadata delete still called
                expect(mockRepoService.delete).toHaveBeenCalledWith(f1.id);
                expect(mockLogger.error).toHaveBeenCalledWith(
                    "Failed to delete file content, proceeding with metadata deletion",
                    expect.objectContaining({ fileId: f1.id, storageRef: contentRef, error: deleteError })
                );
            }));
    });
});

