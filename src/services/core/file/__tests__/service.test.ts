/**
 * @file Tests for FileService implementation
 */

import { Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";

import type { EntityId } from "../../../../types.js";
import type { RepositoryServiceApi } from "../../repository/api.js";
import { EntityNotFoundError, RepositoryError } from "../../repository/errors.js";
import { FileNotFoundError } from "../errors.js";
import type { FileEntity } from "../schema.js";
import { FileService } from "../service.js";
import type { FileInput } from "../types.js";

// --- Test Setup ---

describe("FileService", () => {
  // Create a test repository service using Effect.Service pattern
  class TestFileRepositoryService extends Effect.Service<RepositoryServiceApi<FileEntity>>()("TestFileRepositoryService", {
    effect: Effect.gen(function* () {
      return {
        create: (data: FileEntity["data"]) => Effect.succeed({
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          data: data
        } as FileEntity),

        findById: (id: string) => {
          if (id === "non-existent-id") {
            // Convert EntityNotFoundError to RepositoryError to match the interface
            return Effect.fail(new EntityNotFoundError({
              entityId: id,
              entityType: "FileEntity"
            }) as unknown as RepositoryError);
          }
          return Effect.succeed(Option.none<FileEntity>());
        },

        findOne: () => Effect.succeed(Option.none()),

        findMany: (options?: any) => {
          if (options?.filter?.ownerId === "agent-456") {
            return Effect.succeed([{
              id: "test-file-id-3",
              createdAt: new Date(),
              updatedAt: new Date(),
              data: {
                filename: "test3.txt",
                mimeType: "text/plain",
                sizeBytes: 13,
                ownerId: "agent-456",
                contentBase64: Buffer.from("Another Owner").toString("base64")
              }
            }]);
          }
          return Effect.succeed([]);
        },

        update: () => Effect.succeed({
          id: "test-id",
          createdAt: new Date(),
          updatedAt: new Date(),
          data: { contentBase64: "" }
        } as FileEntity),

        delete: (id: string) => {
          if (id === "non-existent-id") {
            return Effect.fail(new EntityNotFoundError({ entityId: id, entityType: "FileEntity" }));
          }
          return Effect.succeed(undefined);
        },

        count: () => Effect.succeed(0)
      };
    })
  }) { }

  // Create explicit dependency layers following centralized pattern
  const testRepositoryLayer = TestFileRepositoryService.Default;

  // Wire FileService with explicit dependency chain: TestRepository → FileService
  const fileServiceTestLayer = Layer.provide(
    FileService.Default,
    testRepositoryLayer
  );

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
    filename: "test2.txt",
    mimeType: "text/plain",
    content: Buffer.from("Hello World 2"),
    sizeBytes: 13,
    ownerId: testOwnerId,
  };
  const testFileDataOtherOwner: FileInput = {
    filename: "test3.txt",
    mimeType: "text/plain",
    content: Buffer.from("Another Owner"),
    sizeBytes: 13,
    ownerId: "agent-456",
  };

  // --- Test 1: storeFile ---
  it("should store a file and return the full entity", () =>
    Effect.gen(function* () {
      const service = yield* FileService;
      const storedEntity = yield* service.storeFile(testFileData1);

      expect(storedEntity).toBeDefined();
      expect(storedEntity.id).toBeTypeOf("string");
      expect(storedEntity.data.filename).toBe(testFileData1.filename);
      expect(storedEntity.data.mimeType).toBe(testFileData1.mimeType);
      expect(storedEntity.data.sizeBytes).toBe(testFileData1.sizeBytes);
      expect(storedEntity.data.ownerId).toBe(testFileData1.ownerId);
      expect(storedEntity.data.contentBase64).toBe(testFileData1.content.toString("base64"));
    }).pipe(Effect.provide(fileServiceTestLayer))
  );

  // --- Test 2: retrieveFileContent (Success) ---
  it("should retrieve file content correctly", () =>
    Effect.gen(function* () {
      const service = yield* FileService;
      const stored = yield* service.storeFile(testFileData1);
      const content = yield* service.retrieveFileContent(stored.id);

      expect(content).toBeInstanceOf(Buffer);
      expect(content.toString()).toBe("Hello World 1");
    }).pipe(Effect.provide(fileServiceTestLayer))
  );

  // --- Test 3: retrieveFileContent (Failure) ---
  it("should fail retrieveFileContent with FileNotFoundError for non-existent ID", () =>
    Effect.gen(function* () {
      const service = yield* FileService;
      const result = yield* Effect.either(service.retrieveFileContent("non-existent-id"));

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(FileNotFoundError);
        expect((result.left as FileNotFoundError).fileId).toBe("non-existent-id");
      }
    }).pipe(Effect.provide(fileServiceTestLayer))
  );

  // --- Test 4: retrieveFileMetadata (Success) ---
  it("should retrieve file metadata correctly", () =>
    Effect.gen(function* () {
      const service = yield* FileService;
      const stored = yield* service.storeFile(testFileData2);
      const metadata = yield* service.retrieveFileMetadata(stored.id);

      expect(metadata).toBeDefined();
      expect(metadata.id).toBe(stored.id);
      expect(metadata.data.filename).toBe(testFileData2.filename);
      expect(metadata.data.mimeType).toBe(testFileData2.mimeType);
      expect(metadata.data.sizeBytes).toBe(testFileData2.sizeBytes);
      expect(metadata.data.ownerId).toBe(testFileData2.ownerId);
      expect(metadata.data).not.toHaveProperty("contentBase64");
    }).pipe(Effect.provide(fileServiceTestLayer))
  );

  // --- Test 5: retrieveFileMetadata (Failure) ---
  it("should fail retrieveFileMetadata with FileNotFoundError for non-existent ID", () =>
    Effect.gen(function* () {
      const service = yield* FileService;
      const result = yield* Effect.either(service.retrieveFileMetadata("non-existent-id"));

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(FileNotFoundError);
        expect((result.left as FileNotFoundError).fileId).toBe("non-existent-id");
      }
    }).pipe(Effect.provide(fileServiceTestLayer))
  );

  // --- Test 6: findFilesByOwner ---
  it("should find files by owner", () =>
    Effect.gen(function* () {
      const service = yield* FileService;
      // Store test files will be mocked by our mock repository

      // Find files by second owner - this one is mocked to return a file
      const owner2Files = yield* service.findFilesByOwner("agent-456");
      expect(owner2Files).toHaveLength(1);
      expect(owner2Files[0]?.data.filename).toBe("test3.txt");

      // Find files by non-existent owner
      const noFiles = yield* service.findFilesByOwner("agent-789");
      expect(noFiles).toHaveLength(0);
    }).pipe(Effect.provide(fileServiceTestLayer))
  );

  // --- Test 7: deleteFile (Success) ---
  it("should delete a file", () =>
    Effect.gen(function* () {
      const service = yield* FileService;
      // Store a file - this actually won't be tracked by our mock repo
      const stored = yield* service.storeFile(testFileData1);

      // Delete it - our mock will succeed for any ID except "non-existent-id"
      yield* service.deleteFile(stored.id);

      // Success is indicated by not throwing an error
      expect(true).toBe(true);
    }).pipe(Effect.provide(fileServiceTestLayer))
  );

  // --- Test 8: deleteFile (Failure) ---
  it("should fail deleteFile with FileNotFoundError for non-existent ID", () =>
    Effect.gen(function* () {
      const service = yield* FileService;
      const result = yield* Effect.either(service.deleteFile("non-existent-id"));

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(FileNotFoundError);
        expect((result.left as FileNotFoundError).fileId).toBe("non-existent-id");
      }
    }).pipe(Effect.provide(fileServiceTestLayer))
  );
});
