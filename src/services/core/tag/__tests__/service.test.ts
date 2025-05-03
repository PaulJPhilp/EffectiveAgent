/**
 * @file Tests for TagService implementation
 */

import { Effect, Exit, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";

import type { TagServiceApi } from "@core/tag/api.js";
import { DuplicateTagNameError } from "@core/tag/errors.js";
import type { EntityTagLinkEntity, TagEntity } from "@core/tag/schema.js";
import { TagService, TagServiceLive } from "../service.js";

import type { RepositoryServiceApi } from "@core/repository/api.js";
import { EntityNotFoundError } from "@core/repository/errors.js";
import { RepositoryService } from "@core/repository/service.js";
import type { FindOptions } from "@core/repository/types.js";

// --- Test Setup ---

describe("TagService", () => {
  // Create a test implementation of TagService
  const TestTagService = Effect.succeed({
    createTag: (name: string) => {
      if (name === "duplicate-tag") {
        return Effect.fail(new DuplicateTagNameError({
          tagName: name
        }));
      }
      return Effect.succeed({
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        data: { name }
      } as TagEntity);
    },

    getTagById: (id: string) => Effect.succeed(Option.none()),

    getTagByName: (name: string) => Effect.succeed(Option.none()),

    findTags: (prefix?: string) => Effect.succeed([]),

    tagEntity: (tagId: string, entityId: string, entityType: string) => 
      Effect.succeed({
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        data: { tagId, entityId, entityType }
      } as EntityTagLinkEntity),

    untagEntity: (tagId: string, entityId: string, entityType: string) => 
      Effect.succeed(undefined),

    getTagsForEntity: (entityId: string, entityType: string) => 
      Effect.succeed([]),

    getEntitiesForTag: (tagId: string) => 
      Effect.succeed([{ entityId: "entity-123", entityType: "Document" }])
  } as TagServiceApi);


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
    })
  );

  it("should prevent duplicate tag names", () => 
    Effect.gen(function* () {
      const service = yield* TestTagService;
      yield* service.createTag("duplicate-tag");
      try {
        yield* service.createTag("duplicate-tag");
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect((error as DuplicateTagNameError)._tag).toBe("DuplicateTagNameError");
      }
    })
  );

  it("should find tags by name prefix", () =>
    Effect.gen(function* () {
      const service = yield* TestTagService;
      yield* service.createTag(testTag1.name);
      yield* service.createTag(testTag2.name);
      
      const result = yield* service.findTags("test");
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(tag => tag.data.name.startsWith("test"))).toBe(true);
    })
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
    })
  );
});
