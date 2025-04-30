/**
 * @file Tests for the TagService implementation.
 */

import { Effect, Layer, Option } from "effect";
import { describe, it, expect } from "vitest";

import {
    LinkNotFoundError,
    DuplicateTagNameError,
    TagNotFoundError
} from "@core/tag/errors.js";
import { TagService, TagServiceLive } from "@core/tag/service.js";
import type {
    EntityTagLinkEntity,
    TagEntity
} from "@core/tag/schema.js";
import { TagServiceApi } from "@core/tag/api.js";
import { RepositoryService } from "@core/repository/service.js";

import type { EntityId } from "@/types.js";

describe("TagService", () => {
  // Set up test layer with mock repositories
  const makeTestLayer = () => {
    // Create in-memory repositories for testing
    const tagRepo = {
      create: (data: TagEntity["data"]) => Effect.succeed({ 
        id: crypto.randomUUID(), 
        createdAt: Date.now(), 
        updatedAt: Date.now(), 
        data 
      } as TagEntity),
      findById: (id: string) => Effect.succeed(Option.none<TagEntity>()),
      findOne: () => Effect.succeed(Option.none<TagEntity>()),
      findMany: () => Effect.succeed([]),
      update: () => Effect.succeed(Option.none<TagEntity>()),
      delete: () => Effect.succeed(Option.none<TagEntity>()),
      count: () => Effect.succeed(0)
    };

    const linkRepo = {
      create: (data: EntityTagLinkEntity["data"]) => Effect.succeed({ 
        id: crypto.randomUUID(), 
        createdAt: Date.now(), 
        updatedAt: Date.now(), 
        data 
      } as EntityTagLinkEntity),
      findById: (id: string) => Effect.succeed(Option.none<EntityTagLinkEntity>()),
      findOne: () => Effect.succeed(Option.none<EntityTagLinkEntity>()),
      findMany: () => Effect.succeed([]),
      update: () => Effect.succeed(Option.none<EntityTagLinkEntity>()),
      delete: () => Effect.succeed(Option.none<EntityTagLinkEntity>()),
      count: () => Effect.succeed(0)
    };

    // Create repository layers
    const tagRepoLayer = Layer.succeed(
      RepositoryService<TagEntity>().Tag,
      tagRepo
    );

    const linkRepoLayer = Layer.succeed(
      RepositoryService<EntityTagLinkEntity>().Tag,
      linkRepo
    );

    // Combine repository layers with the TagService layer
    const repoLayers = Layer.merge(tagRepoLayer, linkRepoLayer);
    return Layer.provide(
      TagServiceLive as unknown as Layer.Layer<unknown>,
      repoLayers
    ) as Layer.Layer<TagServiceApi>;
  };

  it("should create a tag", () => 
    Effect.gen(function* (_) {
      const service = yield* TagService;
      const result = yield* service.createTag("test-tag");
      expect(result).toEqual({
        id: expect.any(String),
        data: { name: "test-tag" }
      });
    }).pipe(Effect.provide(makeTestLayer()))
  );

  it("should find tags by prefix", () => 
    Effect.gen(function* (_) {
      const service = yield* TagService;
      yield* service.createTag("alpha-tag");
      yield* service.createTag("alpha-prefix");
      yield* service.createTag("beta-tag");
      
      const alphaTags = yield* service.findTags("alpha");
      const betaTags = yield* service.findTags("beta");
      const allTags = yield* service.findTags();
      
      expect(alphaTags.length).toBe(2);
      expect(betaTags.length).toBe(1);
      expect(allTags.length).toBe(3);
    }).pipe(Effect.provide(makeTestLayer()))
  );

  it("should tag an entity", () => 
    Effect.gen(function* (_) {
      const service = yield* TagService;
      const tag = yield* service.createTag("document-tag");
      const result = yield* service.tagEntity(tag.id, "entity-123", "Document");
      
      expect(result).toEqual({
        id: expect.any(String),
        data: expect.objectContaining({
          tagId: tag.id,
          entityId: "entity-123",
          entityType: "Document"
        })
      });
    }).pipe(Effect.provide(makeTestLayer()))
  );

  it("should get tags for an entity", () => 
    Effect.gen(function* (_) {
      const service = yield* TagService;
      const tag1 = yield* service.createTag("tag-1");
      const tag2 = yield* service.createTag("tag-2");
      
      yield* service.tagEntity(tag1.id, "entity-123", "Document");
      yield* service.tagEntity(tag2.id, "entity-123", "Document");
      
      const tags = yield* service.getTagsForEntity("entity-123", "Document");
      expect(tags.length).toBe(2);
    }).pipe(Effect.provide(makeTestLayer()))
  );

  it("should get entities for a tag", () => 
    Effect.gen(function* (_) {
      const service = yield* TagService;
      const tag = yield* service.createTag("shared-tag");
      
      yield* service.tagEntity(tag.id, "entity-a", "TypeA");
      yield* service.tagEntity(tag.id, "entity-b", "TypeB");
      
      const entities = yield* service.getEntitiesForTag(tag.id);
      expect(entities.length).toBe(2);
    }).pipe(Effect.provide(makeTestLayer()))
  );
});
