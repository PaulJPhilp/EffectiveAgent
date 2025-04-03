// src/testing/mocks.ts (Extend or create this file)
import { Effect, Layer, LogLevel, Logger, Option, ReadonlyArray } from "effect";
import { vi } from "vitest";
import { type Readable } from "stream";

// --- Logging Mock (Reuse) ---
export const mockLogger = { /* ... */ };
export class MockLoggingService implements ILoggingService { /* ... */ }
export const MockLoggingServiceLayer = Layer.succeed(LoggingService, new MockLoggingService());

// --- Repository Mock for Attachment Links ---
import {
    type IRepositoryService, type BaseEntity, type FindCriteria, type UpdateData,
    type FindByIdCriteria, RepositoryService, type CreateEffect, type FindEffect,
    type FindManyEffect, type UpdateEffect, type DeleteEffect,
} from "../repository/repository-service"; // Adjust path
import {
    DataValidationError as RepoDataValidationError,
    EntityNotFoundError as RepoEntityNotFoundError,
    RepositoryError as RepoError,
} from "../repository/errors"; // Adjust path
import {
    type AttachmentEntityData, FileNotFoundError, FileStorageError, // Import errors for FileService mock
    type FileMetadata, // Import for FileService mock return
} from "../attachment/attachment-service"; // Adjust path

const mockAttachmentDb = new Map<string, BaseEntity<AttachmentEntityData>>();
let attachmentIdCounter = 0;

export class MockAttachmentRepositoryService
    implements IRepositoryService<AttachmentEntityData> {
    reset() {
        mockAttachmentDb.clear();
        attachmentIdCounter = 0;
    }

    create = vi.fn(
        (data: AttachmentEntityData): CreateEffect<AttachmentEntityData> => {
            // Simulate unique constraint (convId + fileId)
            for (const entry of mockAttachmentDb.values()) {
                if (entry.data.conversationId === data.conversationId && entry.data.fileId === data.fileId) {
                    return Effect.fail(new RepoError({ message: `Mock Repo: Attachment already exists for conv=${data.conversationId}, file=${data.fileId}` }));
                }
            }
            const newId = `mock-attach-${++attachmentIdCounter}`;
            const now = new Date();
            const newEntity: BaseEntity<AttachmentEntityData> = { id: newId, data: { ...data }, createdAt: now, updatedAt: now };
            mockAttachmentDb.set(newId, newEntity);
            return Effect.succeed(newEntity);
        }
    );

    findById = vi.fn(
        (criteria: FindByIdCriteria): FindEffect<AttachmentEntityData> => {
            // Not typically used directly by AttachmentService, but implement for completeness
            const entity = mockAttachmentDb.get(criteria.id);
            if (entity) return Effect.succeed(entity);
            return Effect.fail(new RepoEntityNotFoundError({ entityId: criteria.id, message: `Mock Repo: Attachment not found with id ${criteria.id}` }));
        }
    );

    find = vi.fn(
        (criteria: FindCriteria<AttachmentEntityData>): FindManyEffect<AttachmentEntityData> => {
            const results: BaseEntity<AttachmentEntityData>[] = [];
            mockAttachmentDb.forEach((entity) => {
                let match = true;
                for (const key in criteria) {
                    if (entity.data[key as keyof AttachmentEntityData] !== criteria[key as keyof AttachmentEntityData]) {
                        match = false; break;
                    }
                }
                if (match) results.push(entity);
            });
            return Effect.succeed(results);
        }
    );

    update = vi.fn(
        (id: string, data: UpdateData<AttachmentEntityData>): UpdateEffect<AttachmentEntityData> => {
            // Attachments likely won't be updated, but implement basic version
            const entity = mockAttachmentDb.get(id);
            if (!entity) return Effect.fail(new RepoEntityNotFoundError({ entityId: id, message: `Mock Repo: Attachment not found for update with id ${id}` }));
            const updatedEntity: BaseEntity<AttachmentEntityData> = { ...entity, data: { ...entity.data, ...data }, updatedAt: new Date() };
            mockAttachmentDb.set(id, updatedEntity);
            return Effect.succeed(updatedEntity);
        }
    );

    delete = vi.fn((id: string): DeleteEffect => {
        if (mockAttachmentDb.delete(id)) return Effect.void;
        return Effect.fail(new RepoEntityNotFoundError({ entityId: id, message: `Mock Repo: Attachment not found for delete with id ${id}` }));
    });
}

export const MockAttachmentRepositoryLayer = Layer.succeed(
    RepositoryService, // Provide the generic tag
    new MockAttachmentRepositoryService() as IRepositoryService<AttachmentEntityData>
);


// --- Mock File Service ---
import { IFileService, FileService } from "../src/file/file-service"; // Adjust path

// Store mock file metadata for FileService mock
const mockFiles = new Map<string, FileMetadata>();

export class MockFileService implements IFileService {
    reset() {
        mockFiles.clear();
        // Reset internal state if any (e.g., simulated ref counts if not stored in mockFiles)
    }
    // Helper to add files for tests
    addMockFile(metadata: FileMetadata) {
        mockFiles.set(metadata.fileId, metadata);
    }

    uploadFile = vi.fn(); // Not used by AttachmentService

    getFileMetadata = vi.fn(
        (params: { fileId: string }): Effect.Effect<FileMetadata, FileNotFoundError | FileStorageError> => {
            const meta = mockFiles.get(params.fileId);
            if (meta) {
                return Effect.succeed(meta);
            } else {
                return Effect.fail(new FileNotFoundError({ fileId: params.fileId, message: "Mock FileService: File not found" }));
            }
        }
    );

    getFileStream = vi.fn(); // Not used by AttachmentService
    listFiles = vi.fn(); // Not used by AttachmentService

    incrementReferenceCount = vi.fn(
        (params: { fileId: string }): Effect.Effect<void, FileNotFoundError | FileStorageError> => {
            const meta = mockFiles.get(params.fileId);
            if (!meta) {
                return Effect.fail(new FileNotFoundError({ fileId: params.fileId, message: "Mock FileService: File not found for increment" }));
            }
            // Simulate update
            mockFiles.set(params.fileId, { ...meta, referenceCount: meta.referenceCount + 1 });
            return Effect.void;
        }
    );

    decrementReferenceCount = vi.fn(
        (params: { fileId: string }): Effect.Effect<void, FileNotFoundError | FileStorageError /* | InvalidReferenceOperationError */> => {
            const meta = mockFiles.get(params.fileId);
            if (!meta) {
                return Effect.fail(new FileNotFoundError({ fileId: params.fileId, message: "Mock FileService: File not found for decrement" }));
            }
            // Simulate update
            const newCount = meta.referenceCount - 1;
            mockFiles.set(params.fileId, { ...meta, referenceCount: newCount });
            // Simulate deletion if count reaches zero (optional for mock)
            // if (newCount <= 0) { mockFiles.delete(params.fileId); }
            return Effect.void;
        }
    );
}

export const MockFileServiceLayer = Layer.succeed(
    FileService, // Provide the FileService Tag
    new MockFileService()
);


// Updated helper to get mocks
export const getAttachmentTestMocks = Effect.all({
    logSvc: LoggingService,
    repoSvc: RepositoryService, // Will resolve to MockAttachmentRepositoryService
    fileSvc: FileService, // Will resolve to MockFileService
});

import { Effect, Exit, Layer, LogLevel, ReadonlyArray, Cause } from "effect";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as EffectVitest from "@effect/vitest";

// Import service definition, errors, schemas
import {
    AttachmentService, type IAttachmentService, type AttachmentInfo,
    type AttachmentEntityData, AttachmentExistsError, AttachmentNotFoundError,
    GenericAttachmentError, FileNotFoundError, FileStorageError, // Import errors
} from "../src/attachment/attachment-service"; // Adjust path

// Import Live implementation and Layer
import { AttachmentServiceLiveLayer } from "../src/attachment/attachment-service-live"; // Adjust path

// Import Mocks & Tags
import {
    mockLogger, MockLoggingServiceLayer, MockAttachmentRepositoryLayer, // Use the specific repo mock layer
    getAttachmentTestMocks, type MockAttachmentRepositoryService, // Use correct helper/type
    MockFileService, MockFileServiceLayer, // Use file service mock/layer
} from "./testing/mocks"; // Adjust path
import { RepositoryService } from "../src/repository/repository-service"; // Import Tag
import { FileService, type FileMetadata } from "../src/file/file-service"; // Import Tag & Type

// --- Test Setup ---

// Helper to create mock FileMetadata
const createMockFileMeta = (id: string, userId: string, refCount: number = 0): FileMetadata => ({
    fileId: id,
    userId: userId,
    filename: `${id}.txt`,
    mimeType: "text/plain",
    sizeBytes: 100,
    referenceCount: refCount,
    createdAt: new Date(),
    updatedAt: new Date(),
});

// Create the full layer stack for testing
const TestLayer = AttachmentServiceLiveLayer.pipe(
    Layer.provide(MockLoggingServiceLayer),
    Layer.provide(MockAttachmentRepositoryLayer), // Provide the mock repo layer
    Layer.provide(MockFileServiceLayer) // Provide the mock file service layer
);

// Use EffectVitest.provide for the test suite
const { it } = EffectVitest.provide(TestLayer);

// Helper to get service instance and mocks within tests
const getTestServiceAndMocks = Effect.all({
    svc: AttachmentService,
    mocks: getAttachmentTestMocks,
});

describe("AttachmentServiceLive", () => {
    let mockRepoService: MockAttachmentRepositoryService;
    let mockFileService: MockFileService;

    EffectVitest.beforeEach(() =>
        Effect.gen(function* (_) {
            vi.clearAllMocks();
            const { mocks } = yield* _(getTestServiceAndMocks);
            mockRepoService = mocks.repoSvc as MockAttachmentRepositoryService;
            mockFileService = mocks.fileSvc as MockFileService;
            mockRepoService.reset();
            mockFileService.reset();
        })
    );

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // --- attachFile ---
    describe("attachFile", () => {
        it("should attach file, increment ref count, and create link", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const fileMeta = createMockFileMeta("file1", "user1", 0);
                mockFileService.addMockFile(fileMeta); // Make file exist

                yield* _(svc.attachFile({ conversationId: "conv1", fileId: "file1" }));

                // Verify interactions
                expect(mockFileService.getFileMetadata).toHaveBeenCalledWith({ fileId: "file1" });
                expect(mockRepoService.find).toHaveBeenCalledWith({ conversationId: "conv1", fileId: "file1" }); // Check existence
                expect(mockFileService.incrementReferenceCount).toHaveBeenCalledWith({ fileId: "file1" });
                expect(mockRepoService.create).toHaveBeenCalledTimes(1);
                expect(mockRepoService.create).toHaveBeenCalledWith(expect.objectContaining({
                    conversationId: "conv1",
                    fileId: "file1",
                    attachedAt: expect.any(Date),
                }));

                // Verify ref count in mock file service
                const updatedMeta = (mockFileService as any).mockFiles.get("file1");
                expect(updatedMeta?.referenceCount).toBe(1);
            }));

        it("should fail with FileNotFoundError if file does not exist", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                // File file1 does not exist in mockFileService

                const result = yield* _(svc.attachFile({ conversationId: "conv1", fileId: "file1" }), Effect.flip);

                expect(result).toBeInstanceOf(FileNotFoundError);
                expect(mockRepoService.find).not.toHaveBeenCalled();
                expect(mockFileService.incrementReferenceCount).not.toHaveBeenCalled();
                expect(mockRepoService.create).not.toHaveBeenCalled();
            }));

        it("should fail with AttachmentExistsError if file already attached", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const fileMeta = createMockFileMeta("file2", "user1", 0);
                mockFileService.addMockFile(fileMeta);
                // Pre-create attachment link
                yield* _(mockRepoService.create({ conversationId: "conv2", fileId: "file2", attachedAt: new Date() }));

                const result = yield* _(svc.attachFile({ conversationId: "conv2", fileId: "file2" }), Effect.flip);

                expect(result).toBeInstanceOf(AttachmentExistsError);
                expect(mockFileService.incrementReferenceCount).not.toHaveBeenCalled();
                expect(mockRepoService.create).toHaveBeenCalledTimes(1); // Only the initial one
            }));

        it("should fail with FileStorageError if increment ref count fails", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const fileMeta = createMockFileMeta("file3", "user1", 0);
                mockFileService.addMockFile(fileMeta);
                // Configure mock increment to fail
                const incrementError = new FileStorageError({ message: "FileService unavailable" });
                mockFileService.incrementReferenceCount.mockImplementationOnce(() => Effect.fail(incrementError));

                const result = yield* _(svc.attachFile({ conversationId: "conv3", fileId: "file3" }), Effect.flip);

                expect(result).toBeInstanceOf(FileStorageError);
                expect(result.message).toBe("FileService unavailable");
                expect(mockRepoService.create).not.toHaveBeenCalled(); // Should fail before creating link
            }));

        it("should attempt compensation if create attachment fails after increment", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const fileMeta = createMockFileMeta("file4", "user1", 0);
                mockFileService.addMockFile(fileMeta);
                // Configure mock repo create to fail
                const createError = new RepoError({ message: "DB write failed" });
                mockRepoService.create.mockImplementationOnce(() => Effect.fail(createError));

                const result = yield* _(svc.attachFile({ conversationId: "conv4", fileId: "file4" }), Effect.flip);

                // Should fail with the original error (mapped)
                expect(result).toBeInstanceOf(GenericAttachmentError);
                expect(result.cause).toBe(createError);

                // Verify compensation was attempted
                expect(mockFileService.incrementReferenceCount).toHaveBeenCalledWith({ fileId: "file4" });
                expect(mockFileService.decrementReferenceCount).toHaveBeenCalledWith({ fileId: "file4" }); // Compensation call
                expect(mockLogger.error).toHaveBeenCalledWith(
                    "Failed to create attachment record after incrementing ref count, attempting compensation",
                    expect.anything()
                );
            }));
    });

    // --- listAttachments ---
    describe("listAttachments", () => {
        it("should return empty array if no attachments exist", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const result = yield* _(svc.listAttachments({ conversationId: "conv-list-none" }));
                expect(result).toEqual([]);
                expect(mockRepoService.find).toHaveBeenCalledWith({ conversationId: "conv-list-none" });
                expect(mockFileService.getFileMetadata).not.toHaveBeenCalled();
            }));

        it("should return AttachmentInfo for existing attachments", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const file1 = createMockFileMeta("f1", "u1");
                const file2 = createMockFileMeta("f2", "u1");
                mockFileService.addMockFile(file1);
                mockFileService.addMockFile(file2);
                const attachTime1 = new Date(2024, 0, 1);
                const attachTime2 = new Date(2024, 0, 2);
                yield* _(mockRepoService.create({ conversationId: "conv-list-multi", fileId: "f1", attachedAt: attachTime1 }));
                yield* _(mockRepoService.create({ conversationId: "conv-list-multi", fileId: "f2", attachedAt: attachTime2 }));
                yield* _(mockRepoService.create({ conversationId: "other-conv", fileId: "f1", attachedAt: new Date() })); // Different conv

                const result = yield* _(svc.listAttachments({ conversationId: "conv-list-multi" }));

                expect(result.length).toBe(2);
                expect(mockFileService.getFileMetadata).toHaveBeenCalledTimes(2);
                expect(mockFileService.getFileMetadata).toHaveBeenCalledWith({ fileId: "f1" });
                expect(mockFileService.getFileMetadata).toHaveBeenCalledWith({ fileId: "f2" });

                // Check content (order might vary due to concurrent fetches)
                expect(result).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({ fileId: "f1", filename: "f1.txt", attachedAt: attachTime1 }),
                        expect.objectContaining({ fileId: "f2", filename: "f2.txt", attachedAt: attachTime2 }),
                    ])
                );
            }));

        it("should skip attachments where file metadata is not found", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const file1 = createMockFileMeta("f1-exists", "u1");
                mockFileService.addMockFile(file1);
                const attachTime1 = new Date(2024, 0, 1);
                const attachTimeMissing = new Date(2024, 0, 2);
                yield* _(mockRepoService.create({ conversationId: "conv-list-skip", fileId: "f1-exists", attachedAt: attachTime1 }));
                yield* _(mockRepoService.create({ conversationId: "conv-list-skip", fileId: "f2-missing", attachedAt: attachTimeMissing })); // f2 metadata doesn't exist

                const result = yield* _(svc.listAttachments({ conversationId: "conv-list-skip" }));

                expect(result.length).toBe(1); // Only the one with existing metadata
                expect(result[0].fileId).toBe("f1-exists");
                expect(mockFileService.getFileMetadata).toHaveBeenCalledTimes(2);
                expect(mockFileService.getFileMetadata).toHaveBeenCalledWith({ fileId: "f1-exists" });
                expect(mockFileService.getFileMetadata).toHaveBeenCalledWith({ fileId: "f2-missing" });
                expect(mockLogger.warn).toHaveBeenCalledWith(
                    "Attachment link found, but file metadata missing",
                    expect.objectContaining({ conversationId: "conv-list-skip", fileId: "f2-missing" })
                );
            }));
    });

    // --- removeAttachment ---
    describe("removeAttachment", () => {
        it("should remove attachment link and decrement ref count", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const fileMeta = createMockFileMeta("file-rem", "user-rem", 1); // Start with ref count 1
                mockFileService.addMockFile(fileMeta);
                const attachment = yield* _(mockRepoService.create({ conversationId: "conv-rem", fileId: "file-rem", attachedAt: new Date() }));

                yield* _(svc.removeAttachment({ conversationId: "conv-rem", fileId: "file-rem" }));

                // Verify interactions
                expect(mockRepoService.find).toHaveBeenCalledWith({ conversationId: "conv-rem", fileId: "file-rem" });
                expect(mockRepoService.delete).toHaveBeenCalledWith(attachment.id);
                expect(mockFileService.decrementReferenceCount).toHaveBeenCalledWith({ fileId: "file-rem" });

                // Verify attachment link is gone
                const findResult = yield* _(mockRepoService.find({ conversationId: "conv-rem", fileId: "file-rem" }));
                expect(findResult.length).toBe(0);

                // Verify ref count in mock file service
                const updatedMeta = (mockFileService as any).mockFiles.get("file-rem");
                expect(updatedMeta?.referenceCount).toBe(0); // Decremented
            }));

        it("should fail with AttachmentNotFoundError if link does not exist", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);

                const result = yield* _(svc.removeAttachment({ conversationId: "conv-rem-none", fileId: "file-none" }), Effect.flip);

                expect(result).toBeInstanceOf(AttachmentNotFoundError);
                expect(mockRepoService.delete).not.toHaveBeenCalled();
                expect(mockFileService.decrementReferenceCount).not.toHaveBeenCalled();
            }));

        it("should succeed remove even if decrement ref count fails", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const fileMeta = createMockFileMeta("file-rem-fail", "user-rem-fail", 1);
                mockFileService.addMockFile(fileMeta);
                const attachment = yield* _(mockRepoService.create({ conversationId: "conv-rem-fail", fileId: "file-rem-fail", attachedAt: new Date() }));
                // Configure mock decrement to fail
                const decrementError = new FileStorageError({ message: "S3 unavailable" });
                mockFileService.decrementReferenceCount.mockImplementationOnce(() => Effect.fail(decrementError));

                // removeAttachment should still succeed
                yield* _(svc.removeAttachment({ conversationId: "conv-rem-fail", fileId: "file-rem-fail" }));

                // Verify attachment link is deleted
                expect(mockRepoService.delete).toHaveBeenCalledWith(attachment.id);
                // Verify decrement was called
                expect(mockFileService.decrementReferenceCount).toHaveBeenCalledWith({ fileId: "file-rem-fail" });
                // Verify error was logged
                expect(mockLogger.error).toHaveBeenCalledWith(
                    "Failed to decrement file reference count after removing attachment link (potential orphan)",
                    expect.objectContaining({ fileId: "file-rem-fail", error: decrementError })
                );
            }));
    });
});

