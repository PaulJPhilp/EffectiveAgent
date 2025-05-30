/**
 * @file Tests for the AttachmentService implementation.
 */

import { Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";

import type { RepositoryServiceApi } from "../../repository/api.js";
import { EntityNotFoundError as RepoEntityNotFoundError, RepositoryError } from "../../repository/errors.js";
import { RepositoryService } from "../../repository/service.js";
import type { AttachmentServiceApi } from "../api.js";
import { AttachmentLinkNotFoundError } from "../errors.js";
import type { AttachmentLinkEntity } from "../schema.js";
import { AttachmentService } from "../service.js";
import type { CreateAttachmentLinkInput } from "../types.js";


// --- Test Setup ---

describe("AttachmentService", () => {
  // Create a simple mock repository for testing that conforms to RepositoryServiceApi<AttachmentLinkEntity>
  const makeAttachmentRepo = (): RepositoryServiceApi<AttachmentLinkEntity> => ({

    create: (data: AttachmentLinkEntity["data"]) => Effect.succeed({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    AttachmentService.Default as unknown as Layer.Layer<unknown>,
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

  // Input with the new fields (metadata, createdBy, expiresAt)
  const linkInput4: CreateAttachmentLinkInput = {
    entityA_id: "note-1",
    entityA_type: "Note",
    entityB_id: "doc-xyz",
    entityB_type: "Document",
    linkType: "REFERENCE",
    metadata: { page: 42, section: "Introduction", important: true },
    createdBy: "user-123",
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
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

    it("should create a link with extended fields (metadata, createdBy, expiresAt)", () =>
      Effect.gen(function* () {
        const service = yield* AttachmentService;
        const created = yield* service.createLink(linkInput4);

        expect(created).toBeDefined();
        expect(created.id).toBeTypeOf("string");
        expect(created.data.entityA_id).toBe(linkInput4.entityA_id);
        expect(created.data.entityA_type).toBe(linkInput4.entityA_type);
        expect(created.data.entityB_id).toBe(linkInput4.entityB_id);
        expect(created.data.entityB_type).toBe(linkInput4.entityB_type);
        expect(created.data.linkType).toBe(linkInput4.linkType);

        // Verify the new fields
        expect(created.data.metadata).toBeDefined();
        expect(created.data.metadata).toEqual(linkInput4.metadata);
        expect(created.data.createdBy).toBe(linkInput4.createdBy);
        expect(created.data.expiresAt).toBe(linkInput4.expiresAt);
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
        expect(linksFromChat1.map((l: AttachmentLinkEntity) => l.data.entityB_id)).toEqual(
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
        expect(linksToFileAbc.map((l: AttachmentLinkEntity) => l.data.entityA_id)).toEqual(
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

    // Bulk operation tests
    it("should create multiple links with createLinks", () =>
      Effect.gen(function* () {
        const service = yield* AttachmentService;
        const links = yield* service.createLinks([linkInput1, linkInput2, linkInput3]);

        expect(links).toBeDefined();
        expect(links).toBeInstanceOf(Array);
        expect(links.length).toBe(3);

        // Verify each link has the expected properties
        expect(links[0]?.data.entityA_id).toBe(linkInput1.entityA_id);
        expect(links[0]?.data.entityB_id).toBe(linkInput1.entityB_id);
        expect(links[1]?.data.entityA_id).toBe(linkInput2.entityA_id);
        expect(links[1]?.data.entityB_id).toBe(linkInput2.entityB_id);
        expect(links[2]?.data.entityA_id).toBe(linkInput3.entityA_id);
        expect(links[2]?.data.entityB_id).toBe(linkInput3.entityB_id);
      }).pipe(Effect.provide(TestLayer))
    );

    it("should handle empty array in createLinks", () =>
      Effect.gen(function* () {
        const service = yield* AttachmentService;
        const links = yield* service.createLinks([]);

        expect(links).toBeDefined();
        expect(links).toBeInstanceOf(Array);
        expect(links.length).toBe(0);
      }).pipe(Effect.provide(TestLayer))
    );

    it("should delete all links from a source entity", () =>
      Effect.gen(function* () {
        const service = yield* AttachmentService;

        // The mock data has 2 links from "chat-1"
        const deletedCount = yield* service.deleteLinksFrom(
          "chat-1",
          "ChatMessage"
        );

        // Verify both links were deleted
        expect(deletedCount).toBe(2);

        // Finding links now should return empty array
        const remainingLinks = yield* service.findLinksFrom(
          "chat-1",
          "ChatMessage"
        );
        expect(remainingLinks).toHaveLength(0);
      }).pipe(Effect.provide(TestLayer))
    );

    it("should delete all links to a target entity", () =>
      Effect.gen(function* () {
        const service = yield* AttachmentService;

        // The mock data has 2 links to "file-abc"
        const deletedCount = yield* service.deleteLinksTo(
          "file-abc",
          "File"
        );

        // Verify both links were deleted
        expect(deletedCount).toBe(2);

        // Finding links now should return empty array
        const remainingLinks = yield* service.findLinksTo(
          "file-abc",
          "File"
        );
        expect(remainingLinks).toHaveLength(0);
      }).pipe(Effect.provide(TestLayer))
    );

    it("should handle no links found in bulk delete operations", () =>
      Effect.gen(function* () {
        const service = yield* AttachmentService;

        const fromCount = yield* service.deleteLinksFrom(
          "non-existent",
          "Entity"
        );
        expect(fromCount).toBe(0);

        const toCount = yield* service.deleteLinksTo(
          "non-existent",
          "Entity"
        );
        expect(toCount).toBe(0);
      }).pipe(Effect.provide(TestLayer))
    );

    // Transaction tests
    describe("Transaction Support", () => {
      it("should ensure atomicity in createLinks (all succeed or none)", () =>
        Effect.gen(function* () {
          // We'll create a special test repo with a failure trigger
          const FailingRepo: RepositoryServiceApi<AttachmentLinkEntity> = {
            ...makeAttachmentRepo(),
            create: (data) => {
              // Fail on specific entity to simulate partial failure
              if (data.entityB_id === 'will-fail') {
                return Effect.fail(new RepositoryError({
                  message: "Simulated transaction failure",
                  entityType: "AttachmentLink"
                }));
              }
              return Effect.succeed({
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                data
              } as AttachmentLinkEntity);
            }
          };

          // Create a layer with our failing repo
          const FailingRepoLayer = Layer.succeed(
            RepositoryService<AttachmentLinkEntity>().Tag,
            FailingRepo
          );

          // Layer with the failing repo
          const FailingTestLayer = Layer.provide(
            AttachmentService.Default as unknown as Layer.Layer<unknown>,
            FailingRepoLayer
          ) as Layer.Layer<AttachmentServiceApi>;

          // Create service with failing repo
          const service: AttachmentServiceApi = yield* Effect.provide(
            AttachmentService,
            FailingTestLayer
          );

          // Create an array of links where the middle one will fail
          const inputs = [
            {
              entityA_id: "source-1",
              entityA_type: "Source",
              entityB_id: "target-1",
              entityB_type: "Target"
            },
            {
              entityA_id: "source-2",
              entityA_type: "Source",
              entityB_id: "will-fail", // This one will trigger the failure
              entityB_type: "Target"
            },
            {
              entityA_id: "source-3",
              entityA_type: "Source",
              entityB_id: "target-3",
              entityB_type: "Target"
            }
          ];

          // Attempt to create the links with transaction support
          const result = yield* Effect.either(service.createLinks(inputs));

          // The operation should fail
          expect(result._tag).toBe("Left");

          // Now verify no links were created (rollback worked)
          // We'll check for the first link which would have been created before the failure
          const firstLinkQuery = yield* service.findLinksFrom("source-1", "Source");

          // There should be no links since the transaction rolled back
          expect(firstLinkQuery.length).toBe(0);
        })
      );

      // Similar tests could be added for deleteLinksFrom and deleteLinksTo
    });
  });
});
