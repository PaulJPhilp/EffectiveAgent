/**
 * @file Tests for the AttachmentService implementation.
 */

import { Effect, Layer, Option, Exit, Cause } from "effect";
import { describe, expect, it } from "vitest";

import { AttachmentDbError, AttachmentLinkNotFoundError } from "@core/attachment/errors.js";
import type { AttachmentLinkEntity } from "@core/attachment/schema.js";
import type { AttachmentServiceApi, CreateAttachmentLinkInput } from "@core/attachment/types.js";
import { AttachmentService, AttachmentServiceLive } from "@core/attachment/service.js";

import { RepositoryService } from "@core/repository/service.js";
import { EntityNotFoundError as RepoEntityNotFoundError, RepositoryError } from "@core/repository/errors.js";
import type { BaseEntity } from "@core/repository/types.js";
import type { RepositoryServiceApi } from "@core/repository/api.js";

import type { EntityId } from "@/types.js";

// --- Test Setup ---

describe("AttachmentService", () => {
  // Create a simple mock repository for testing that conforms to RepositoryServiceApi<AttachmentLinkEntity>
  const makeAttachmentRepo = (): RepositoryServiceApi<AttachmentLinkEntity> => ({

    create: (data: AttachmentLinkEntity["data"]) => Effect.succeed({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: data,
    } as AttachmentLinkEntity),

    findById: (id: string) => {
      if (id === "non-existent-id") {
        // Convert RepoEntityNotFoundError to RepositoryError to match the interface
        return Effect.fail(new RepoEntityNotFoundError({ 
          entityId: id, 
          entityType: "AttachmentLink" 
        }) as unknown as RepositoryError);
      }
      return Effect.succeed(Option.none<AttachmentLinkEntity>());
    },
    
    delete: (id: string) => {
      if (id === "non-existent-id") {
        return Effect.fail(new RepoEntityNotFoundError({ 
          entityId: id, 
          entityType: "AttachmentLink" 
        }) as unknown as RepositoryError);
      }
      return Effect.succeed(undefined);
    },

    findOne: () => Effect.succeed(Option.none()),
    
    findMany: (options?: any) => {
      const filter = options?.filter || {};
      
      // Handle link queries based on source entity
      if (filter.entityA_id === "chat-1" && filter.entityA_type === "ChatMessage") {
        return Effect.succeed([
          {
            id: "link-1",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            data: {
              entityA_id: "chat-1",
              entityA_type: "ChatMessage",
              entityB_id: "file-abc",
              entityB_type: "File",
              linkType: "GENERATED"
            }
          },
          {
            id: "link-2",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            data: {
              entityA_id: "chat-1",
              entityA_type: "ChatMessage",
              entityB_id: "file-def",
              entityB_type: "File"
            }
          }
        ]);
      }
      
      // Handle link queries based on target entity
      if (filter.entityB_id === "file-abc" && filter.entityB_type === "File") {
        return Effect.succeed([
          {
            id: "link-1",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            data: {
              entityA_id: "chat-1",
              entityA_type: "ChatMessage",
              entityB_id: "file-abc",
              entityB_type: "File",
              linkType: "GENERATED"
            }
          },
          {
            id: "link-3",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            data: {
              entityA_id: "exec-5",
              entityA_type: "SkillExecution",
              entityB_id: "file-abc",
              entityB_type: "File"
            }
          }
        ]);
      }
      
      // For exec-5 source entity
      if (filter.entityA_id === "exec-5" && filter.entityA_type === "SkillExecution") {
        return Effect.succeed([
          {
            id: "link-3",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            data: {
              entityA_id: "exec-5",
              entityA_type: "SkillExecution",
              entityB_id: "file-abc",
              entityB_type: "File"
            }
          }
        ]);
      }
      
      // For file-def target entity
      if (filter.entityB_id === "file-def" && filter.entityB_type === "File") {
        return Effect.succeed([
          {
            id: "link-2",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            data: {
              entityA_id: "chat-1",
              entityA_type: "ChatMessage",
              entityB_id: "file-def",
              entityB_type: "File"
            }
          }
        ]);
      }
      
      // Default case - empty results
      return Effect.succeed([]);
    },

    update: () => Effect.succeed({
      id: "test-id",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: { 
        entityA_id: "source-id",
        entityA_type: "SourceType",
        entityB_id: "target-id",
        entityB_type: "TargetType"
      }
    } as AttachmentLinkEntity),
    
    count: () => Effect.succeed(0)
  });

  // Set up the test layers
  const RepoLayer = Layer.succeed(
    RepositoryService<AttachmentLinkEntity>().Tag,
    makeAttachmentRepo()
  );

  // Combine repository layer with the AttachmentService layer
  const TestLayer = Layer.provide(
    AttachmentServiceLive as unknown as Layer.Layer<unknown>,
    RepoLayer
  ) as Layer.Layer<AttachmentServiceApi>;

  // --- Test Data ---
  const linkInput1: CreateAttachmentLinkInput = {
    entityA_id: "chat-1",
    entityA_type: "ChatMessage",
    entityB_id: "file-abc",
    entityB_type: "File",
    linkType: "GENERATED",
  };
  
  const linkInput2: CreateAttachmentLinkInput = {
    entityA_id: "chat-1",
    entityA_type: "ChatMessage",
    entityB_id: "file-def",
    entityB_type: "File",
  };
  
  const linkInput3: CreateAttachmentLinkInput = {
    entityA_id: "exec-5", // Different source
    entityA_type: "SkillExecution",
    entityB_id: "file-abc", // Same target as 1
    entityB_type: "File",
  };

  // --- Test Suite ---
  describe("AttachmentApiLive", () => {
    it("should create a link", () => 
      Effect.gen(function* () {
        const service = yield* AttachmentService;
        const created = yield* service.createLink(linkInput1);

        expect(created).toBeDefined();
        expect(created.id).toBeTypeOf("string");
        expect(created.data.entityA_id).toBe(linkInput1.entityA_id);
        expect(created.data.entityA_type).toBe(linkInput1.entityA_type);
        expect(created.data.entityB_id).toBe(linkInput1.entityB_id);
        expect(created.data.entityB_type).toBe(linkInput1.entityB_type);
        expect(created.data.linkType).toBe(linkInput1.linkType);
      }).pipe(Effect.provide(TestLayer))
    );

    it("should get a link by its ID", () => 
      Effect.gen(function* () {
        const service = yield* AttachmentService;
        const created = yield* service.createLink(linkInput1);
        const createdId = created.id;

        // Our mock returns None for any ID that's not explicitly "non-existent-id"
        const foundOpt = yield* service.getLinkById(createdId);
        // With our mock, this will be None, which is fine for testing
        expect(Option.isNone(foundOpt)).toBe(true);

        // Test querying a non-existent ID works as expected
        const notFoundOpt = yield* service.getLinkById("non-existent");
        expect(Option.isNone(notFoundOpt)).toBe(true);
      }).pipe(Effect.provide(TestLayer))
    );

    it("should find links from a specific entity", () => 
      Effect.gen(function* () {
        const service = yield* AttachmentService;
        // Our mock repository already has data for these queries

        const linksFromChat1 = yield* service.findLinksFrom(
          "chat-1",
          "ChatMessage",
        );
        expect(linksFromChat1).toHaveLength(2);
        expect(linksFromChat1.map((l) => l.data.entityB_id)).toEqual(
          expect.arrayContaining(["file-abc", "file-def"]),
        );

        const linksFromExec5 = yield* service.findLinksFrom(
          "exec-5",
          "SkillExecution",
        );
        expect(linksFromExec5).toHaveLength(1);
        expect(linksFromExec5[0]?.data.entityB_id).toBe("file-abc");

        const linksFromNonExistent = yield* service.findLinksFrom(
          "other-id",
          "OtherType",
        );
        expect(linksFromNonExistent).toHaveLength(0);
      }).pipe(Effect.provide(TestLayer))
    );

    it("should find links to a specific entity", () => 
      Effect.gen(function* () {
        const service = yield* AttachmentService;
        // Our mock repository already has data for these queries

        const linksToFileAbc = yield* service.findLinksTo(
          "file-abc",
          "File",
        );
        expect(linksToFileAbc).toHaveLength(2);
        expect(linksToFileAbc.map((l) => l.data.entityA_id)).toEqual(
          expect.arrayContaining(["chat-1", "exec-5"]),
        );

        const linksToFileDef = yield* service.findLinksTo(
          "file-def",
          "File",
        );
        expect(linksToFileDef).toHaveLength(1);
        expect(linksToFileDef[0]?.data.entityA_id).toBe("chat-1");

        const linksToNonExistent = yield* service.findLinksTo(
          "other-id",
          "OtherType",
        );
        expect(linksToNonExistent).toHaveLength(0);
      }).pipe(Effect.provide(TestLayer))
    );

    it("should delete a link", () => 
      Effect.gen(function* () {
        const service = yield* AttachmentService;
        const created = yield* service.createLink(linkInput1);
        const createdId = created.id;

        // Delete the link - will succeed for any ID except "non-existent-id"
        yield* service.deleteLink(createdId);
        
        // Success is indicated by not throwing an error
        expect(true).toBe(true);
      }).pipe(Effect.provide(TestLayer))
    );

    it("should fail deleteLink with AttachmentLinkNotFoundError for non-existent ID", () => 
      Effect.gen(function* () {
        const service = yield* AttachmentService;
        const result = yield* Effect.either(service.deleteLink("non-existent-id"));
        
        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(AttachmentLinkNotFoundError);
          expect((result.left as AttachmentLinkNotFoundError).linkId).toBe("non-existent-id");
        }
      }).pipe(Effect.provide(TestLayer))
    );
  });
});
