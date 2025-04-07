/**
 * @file Simple direct tests for FileApi
 */

import { Cause, Effect, Exit, Option, Ref } from "effect";
import { describe, expect, it } from "vitest";

import { FileDbError, FileNotFoundError } from "@core/file/errors.js";
import type { FileEntity } from "@core/file/schema.js";
import { FileApi, FileInput } from "@core/file/types.js";

import { EntityNotFoundError } from "@core/repository/errors.js";
import { make as makeInMemoryRepository } from "@core/repository/implementations/in-memory/live.js";

import type { EntityId } from "@/types.js";

// --- Test Setup ---

// Define the entity type string identifier
const fileEntityType = "FileEntity";

// Create a simple in-memory repository for testing
const createFileApi = () => Effect.gen(function* () {
    // Create a test repository
    const store = yield* Ref.make(new Map<EntityId, FileEntity>());
    const repo = makeInMemoryRepository<FileEntity>(fileEntityType, store);

    // Create a direct FileApi implementation
    const fileApi: FileApi = {
        storeFile: (input: FileInput) => {
            const contentBase64 = input.content.toString("base64");
            const entityData = {
                filename: input.filename,
                mimeType: input.mimeType,
                sizeBytes: input.sizeBytes,
                ownerId: input.ownerId,
                contentBase64,
            };

            return repo.create(entityData).pipe(
                Effect.mapError(err => new FileDbError({
                    operation: "storeFile",
                    message: "Failed to store file",
                    cause: err
                }))
            );
        },

        retrieveFileContent: (id: EntityId) => repo.findById(id).pipe(
            // Handle repo errors first (specifically EntityNotFoundError)
            Effect.mapError(err =>
                err instanceof EntityNotFoundError
                    ? new FileNotFoundError({ fileId: id, message: "File not found in repository" })
                    : new FileDbError({
                        operation: "retrieveFileContent",
                        fileId: id,
                        message: "Repository error during findById",
                        cause: err
                    })
            ),
            // If repo lookup succeeded (or mapped to FileNotFoundError), proceed
            Effect.flatMap(
                (option: Option.Option<FileEntity>): Effect.Effect<Buffer, FileNotFoundError | FileDbError, never> =>
                    Option.match(option, {
                        // If None after repo lookup, it should already be FileNotFoundError from above
                        onNone: () => Effect.fail(new FileNotFoundError({ fileId: id, message: "File not found (should be caught earlier)" })),
                        onSome: (entity) => Effect.try({
                            try: () => Buffer.from(entity.data.contentBase64, "base64"),
                            // Map potential decoding errors to FileDbError
                            catch: (e) => new FileDbError({
                                operation: "retrieveFileContent",
                                fileId: id,
                                message: "Failed to decode content",
                                cause: e
                            })
                        })
                    })
            )
            // Removed the final mapError here as errors are handled earlier or within flatMap
        ),

        retrieveFileMetadata: (id: EntityId) => repo.findById(id).pipe(
            Effect.flatMap(option =>
                Option.match(option, {
                    onNone: () => Effect.fail(new FileNotFoundError({ fileId: id })),
                    onSome: (entity) => {
                        const { contentBase64, ...metadataOnly } = entity.data;
                        return Effect.succeed({
                            id: entity.id,
                            createdAt: entity.createdAt,
                            updatedAt: entity.updatedAt,
                            data: metadataOnly
                        });
                    }
                })
            ),
            Effect.mapError(err =>
                err instanceof EntityNotFoundError
                    ? new FileNotFoundError({ fileId: id })
                    : err instanceof FileNotFoundError
                        ? err
                        : new FileDbError({
                            operation: "retrieveFileMetadata",
                            fileId: id,
                            message: "Repository error",
                            cause: err
                        })
            )
        ),

        deleteFile: (id: EntityId) => repo.delete(id).pipe(
            Effect.mapError(err =>
                err instanceof EntityNotFoundError
                    ? new FileNotFoundError({ fileId: id })
                    : new FileDbError({
                        operation: "deleteFile",
                        fileId: id,
                        message: "Failed to delete file",
                        cause: err
                    })
            )
        ),

        findFilesByOwner: (ownerId: EntityId) => repo.findMany({ filter: { ownerId } }).pipe(
            Effect.map(entities =>
                entities.map(entity => {
                    const { contentBase64, ...metadataOnly } = entity.data;
                    return {
                        id: entity.id,
                        createdAt: entity.createdAt,
                        updatedAt: entity.updatedAt,
                        data: metadataOnly
                    };
                })
            ),
            Effect.mapError(err => new FileDbError({
                operation: "findFilesByOwner",
                message: `Failed to find files for owner ${ownerId}`,
                cause: err
            }))
        )
    };

    return fileApi;
});

// --- Updated Test Helpers ---

const runFileApiTest = <A, E>(testFn: (fileApi: FileApi) => Effect.Effect<A, E, never>) =>
    Effect.flatMap(createFileApi(), (fileApi) => testFn(fileApi));

const runTest = <A, E>(test: (api: FileApi) => Effect.Effect<A, E, never>) => {
    return Effect.runPromise(runFileApiTest(test));
};

const runFailTest = <A, E>(test: (api: FileApi) => Effect.Effect<A, E, never>) => {
    return Effect.runPromiseExit(runFileApiTest(test));
};

// --- Test Data ---
const testOwnerId: EntityId = "agent-123";
const testFileData1: FileInput = {
    filename: "test1.txt",
    mimeType: "text/plain",
    content: Buffer.from("Hello World 1"),
    sizeBytes: 13,
    ownerId: testOwnerId,
};
const testFileData2: FileInput = {
    filename: "test2.png",
    mimeType: "image/png",
    content: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG header
    sizeBytes: 8,
    ownerId: testOwnerId,
};
const testFileDataOtherOwner: FileInput = {
    filename: "test3.txt",
    mimeType: "text/plain",
    content: Buffer.from("Another Owner"),
    sizeBytes: 13,
    ownerId: "agent-456",
};

// --- Test Suite ---
describe("FileApi Direct Implementation", () => {

    // --- Test 1: storeFile ---
    it("should store a file and return the full entity", async () => {
        await runTest((fileApi) => Effect.gen(function* () {
            const storedEntity = yield* fileApi.storeFile(testFileData1);

            expect(storedEntity).toBeDefined();
            expect(storedEntity.id).toBeTypeOf("string");
            expect(storedEntity.createdAt).toBeTypeOf("number");
            expect(storedEntity.updatedAt).toBeTypeOf("number");
            expect(storedEntity.data.filename).toBe(testFileData1.filename);
            expect(storedEntity.data.mimeType).toBe(testFileData1.mimeType);
            expect(storedEntity.data.sizeBytes).toBe(testFileData1.sizeBytes);
            expect(storedEntity.data.ownerId).toBe(testFileData1.ownerId);
            expect(storedEntity.data.contentBase64).toBe(testFileData1.content.toString("base64"));

            return Effect.succeed(void 0);
        }));
    });

    // --- Test 2: retrieveFileContent (Success) ---
    it("should retrieve file content correctly", async () => {
        await runTest((fileApi) => Effect.gen(function* () {
            const stored = yield* fileApi.storeFile(testFileData1);
            const content = yield* fileApi.retrieveFileContent(stored.id);

            expect(content).toBeInstanceOf(Buffer);
            expect(content.toString()).toBe(testFileData1.content.toString());

            return Effect.succeed(void 0);
        }));
    });

    // --- Test 3: retrieveFileContent (Failure) ---
    it("should fail retrieveFileContent with FileNotFoundError for non-existent ID", async () => {
        const exit = await runFailTest((fileApi) =>
            fileApi.retrieveFileContent("non-existent-id")
        );

        expect(exit._tag).toBe("Failure");
        if (Exit.isFailure(exit)) {
            const failure = Cause.failureOption(exit.cause);
            expect(Option.isSome(failure)).toBe(true);
            if (Option.isSome(failure)) {
                const error = failure.value;
                expect(error).toBeInstanceOf(FileNotFoundError);
                expect((error as FileNotFoundError).fileId).toBe("non-existent-id");
            }
        } else {
            expect.fail("Expected effect to fail");
        }
    });

    // --- Test 4: retrieveFileMetadata (Success) ---
    it("should retrieve file metadata correctly", async () => {
        await runTest((fileApi) => Effect.gen(function* () {
            const stored = yield* fileApi.storeFile(testFileData2);
            const metadata = yield* fileApi.retrieveFileMetadata(stored.id);

            expect(metadata.id).toBe(stored.id);
            expect(metadata.createdAt).toBe(stored.createdAt);
            expect(metadata.updatedAt).toBe(stored.updatedAt);
            expect(metadata.data.filename).toBe(testFileData2.filename);
            expect(metadata.data.mimeType).toBe(testFileData2.mimeType);
            expect(metadata.data.sizeBytes).toBe(testFileData2.sizeBytes);
            expect(metadata.data.ownerId).toBe(testFileData2.ownerId);
            expect(metadata.data).not.toHaveProperty("contentBase64");

            return Effect.succeed(void 0);
        }));
    });

    // --- Test 5: retrieveFileMetadata (Failure) ---
    it("should fail retrieveFileMetadata with FileNotFoundError for non-existent ID", async () => {
        const exit = await runFailTest((fileApi) =>
            fileApi.retrieveFileMetadata("non-existent-id")
        );

        expect(exit._tag).toBe("Failure");
        if (Exit.isFailure(exit)) {
            const failure = Cause.failureOption(exit.cause);
            expect(Option.isSome(failure)).toBe(true);
            if (Option.isSome(failure)) {
                const error = failure.value;
                expect(error).toBeInstanceOf(FileNotFoundError);
                expect((error as FileNotFoundError).fileId).toBe("non-existent-id");
            }
        } else {
            expect.fail("Expected effect to fail");
        }
    });

    // --- Test 6: findFilesByOwner ---
    it("should find files by owner", async () => {
        await runTest((fileApi) => Effect.gen(function* () {
            // Store test files
            yield* fileApi.storeFile(testFileData1);
            yield* fileApi.storeFile(testFileData2);
            yield* fileApi.storeFile(testFileDataOtherOwner);

            // Find files by first owner
            const owner1Files = yield* fileApi.findFilesByOwner(testOwnerId);
            expect(owner1Files).toHaveLength(2);
            expect(owner1Files.map(f => f.data.filename)).toEqual(
                expect.arrayContaining([testFileData1.filename, testFileData2.filename])
            );
            expect(owner1Files[0]?.data).not.toHaveProperty("contentBase64");

            // Find files by second owner
            const owner2Files = yield* fileApi.findFilesByOwner("agent-456");
            expect(owner2Files).toHaveLength(1);
            expect(owner2Files[0]?.data.filename).toBe(testFileDataOtherOwner.filename);

            // Find files by non-existent owner
            const noFiles = yield* fileApi.findFilesByOwner("agent-789");
            expect(noFiles).toHaveLength(0);

            return Effect.succeed(void 0);
        }));
    });

    // --- Test 7: deleteFile (Success) ---
    it("should delete a file", async () => {
        await runTest((fileApi) => Effect.gen(function* () {
            // Store a file
            const stored = yield* fileApi.storeFile(testFileData1);

            // Verify it exists
            const foundBefore = yield* fileApi.retrieveFileMetadata(stored.id);
            expect(foundBefore.id).toBe(stored.id);

            // Delete it
            yield* fileApi.deleteFile(stored.id);

            // Verify it's gone
            const retrieveEffect = fileApi.retrieveFileMetadata(stored.id);
            const exit = yield* Effect.exit(retrieveEffect);

            expect(exit._tag).toBe("Failure");
            if (Exit.isFailure(exit)) {
                const failure = Cause.failureOption(exit.cause);
                expect(Option.isSome(failure)).toBe(true);
                if (Option.isSome(failure)) {
                    const error = failure.value;
                    expect(error).toBeInstanceOf(FileNotFoundError);
                }
            }

            return Effect.succeed(void 0);
        }));
    });

    // --- Test 8: deleteFile (Failure) ---
    it("should fail deleteFile with FileNotFoundError for non-existent ID", async () => {
        const exit = await runFailTest((fileApi) =>
            fileApi.deleteFile("non-existent-id")
        );

        expect(exit._tag).toBe("Failure");
        if (Exit.isFailure(exit)) {
            const failure = Cause.failureOption(exit.cause);
            expect(Option.isSome(failure)).toBe(true);
            if (Option.isSome(failure)) {
                const error = failure.value;
                expect(error).toBeInstanceOf(FileNotFoundError);
                expect((error as FileNotFoundError).fileId).toBe("non-existent-id");
            }
        } else {
            expect.fail("Expected effect to fail");
        }
    });
});
