/**
 * @file Tests for TagService implementation
 */

import { Effect, Option } from "effect";
import { describe, expect, it } from "vitest";

import type { TagServiceApi } from "../api.js";
import { DuplicateTagNameError } from "../errors.js";
import type { EntityTagLinkEntity, TagEntity } from "../schema.js";

// --- Test Setup ---

describe("TagService", () => {
  // Create a test implementation of TagService using Effect.Service pattern
  class TestTagService extends Effect.Service<TagServiceApi>()("TestTagService", {
    effect: Effect.gen(function* () {
      return {
        createTag: (name: string) => {
          if (name === "duplicate-tag") {
            return Effect.fail(new DuplicateTagNameError({
              tagName: name
            }));
          }
          return Effect.succeed({
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
            data: { name }
          } as TagEntity);
        },

        getTagById: (id: string) => Effect.succeed(Option.none()),

        getTagByName: (name: string) => Effect.succeed(Option.none()),

        findTags: (prefix?: string) => Effect.succeed([]),

        tagEntity: (tagId: string, entityId: string, entityType: string) =>
          Effect.succeed({
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
            data: { tagId, entityId, entityType }
          } as EntityTagLinkEntity),

        untagEntity: (tagId: string, entityId: string, entityType: string) =>
          Effect.succeed(undefined),

        getTagsForEntity: (entityId: string, entityType: string) =>
          Effect.succeed([]),

        getEntitiesForTag: (tagId: string) =>
          Effect.succeed([{ entityId: "entity-123", entityType: "Document" }])
      } satisfies TagServiceApi;
    })
  }) { }

  // Create explicit dependency layer following centralized pattern
  const tagServiceTestLayer = TestTagService.Default;

  // --- Test Data ---
  const testTag1 = {
    name: "test-tag-1"
  };

  const testTag2 = {
    name: "test-tag-2"
  };

  const testEntityId = "entity-123";
  const testEntityType = "Document";

  // --- Test Cases ---

  it("should create a new tag", () =>
    Effect.gen(function* () {
      const service = yield* TestTagService;
      const result = yield* service.createTag(testTag1.name);
      expect(result.data.name).toBe(testTag1.name);
    }).pipe(Effect.provide(tagServiceTestLayer))
  );

  it("should prevent duplicate tag names", () =>
    Effect.gen(function* () {
      const service = yield* TestTagService;
      const result = yield* Effect.either(service.createTag("duplicate-tag"));

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        const error = result.left;
        expect(error).toBeInstanceOf(DuplicateTagNameError);
        if (error instanceof DuplicateTagNameError) {
          expect(error._tag).toBe("DuplicateTagNameError");
          expect(error.tagName).toBe("duplicate-tag");
        }
      }
    }).pipe(Effect.provide(tagServiceTestLayer))
  );

  it("should find tags by name prefix", () =>
    Effect.gen(function* () {
      const service = yield* TestTagService;
      yield* service.createTag(testTag1.name);
      yield* service.createTag(testTag2.name);

      const result = yield* service.findTags("test");
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(tag => tag.data.name.startsWith("test"))).toBe(true);
    }).pipe(Effect.provide(tagServiceTestLayer))
  );

  it("should tag and untag entities", () =>
    Effect.gen(function* () {
      const service = yield* TestTagService;
      const tag = yield* service.createTag(testTag1.name);

      // Tag an entity
      yield* service.tagEntity(tag.id, testEntityId, testEntityType);

      // Get tags for entity
      const entityTags = yield* service.getTagsForEntity(testEntityId, testEntityType);
      expect(entityTags.length).toBe(1);
      expect(entityTags[0].id).toBe(tag.id);

      // Get entities for tag
      const taggedEntities = yield* service.getEntitiesForTag(tag.id);
      expect(taggedEntities.length).toBe(1);
      expect(taggedEntities[0]["entityId"]).toBe(testEntityId);

      // Untag entity
      yield* service.untagEntity(tag.id, testEntityId, testEntityType);

      // Verify entity is untagged
      const untaggedEntityTags = yield* service.getTagsForEntity(testEntityId, testEntityType);
      expect(untaggedEntityTags.length).toBe(0);
    }).pipe(Effect.provide(tagServiceTestLayer))
  );
});
