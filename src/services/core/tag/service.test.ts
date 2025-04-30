import { Effect, Layer, Option, pipe, Either } from "effect";
import { describe, it, expect } from "vitest";
import { TagService, TagServiceLive } from "./service.js";
import { DuplicateTagNameError, LinkAlreadyExistsError, LinkNotFoundError, TagError } from "./errors.js";
import type { TagEntity, EntityTagLinkEntity } from "@core/tag/schema.js";
import { RepositoryService } from "@core/repository/service.js";
import type { TagServiceApi } from "./api.js";
import type { BaseEntity } from "@core/repository/types.js";
import type { RepositoryServiceApi } from "@core/repository/api.js";

describe("TagService", () => {
  // Set up test layer with in-memory repositories
  const makeInMemoryRepo = <T extends BaseEntity>() => ({
    create: (data: T["data"]) => Effect.succeed({ id: crypto.randomUUID(), data } as T),
    findById: (id: string) => Effect.succeed(Option.none()),
    findOne: () => Effect.succeed(Option.none()),
    findMany: () => Effect.succeed([]),
    update: () => Effect.succeed(Option.none()),
    delete: () => Effect.succeed(Option.none()),
    count: () => Effect.succeed(0)
  });

  const TagRepoLayer = Layer.succeed(
    RepositoryService<TagEntity>().Tag,
    makeInMemoryRepo<TagEntity>()
  );

  const LinkRepoLayer = Layer.succeed(
    RepositoryService<EntityTagLinkEntity>().Tag,
    makeInMemoryRepo<EntityTagLinkEntity>()
  );

  // Combine repository layers with the TagService layer
  const TestLayer = Layer.provide(
    TagServiceLive,
    Layer.merge(TagRepoLayer, LinkRepoLayer)
  );

  describe("createTag", () => {
    it("creates a new tag", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        const result = yield* service.createTag("test-tag");
        expect(result).toEqual({
          id: expect.any(String),
          data: { name: "test-tag" }
        });
      }).pipe(Effect.provide(TestLayer))
    );

    it("fails if tag already exists", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        yield* service.createTag("test-tag");
        const result = yield* Effect.either(service.createTag("test-tag"));
        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(DuplicateTagNameError);
        }
      }).pipe(Effect.provide(TestLayer))
    );
  });

  describe("getEntitiesForTag", () => {
    it("returns empty array when no entities are linked", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        const result = yield* service.getEntitiesForTag("non-existent-tag");
        expect(result).toEqual([]);
      }).pipe(Effect.provide(TestLayer))
    );
  });

  describe("tagEntity", () => {
    it("links an entity to a tag", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        const tag = yield* service.createTag("test-tag");
        const result = yield* service.tagEntity(tag.id, "test-entity", "test-type");
        expect(result).toEqual({
          id: expect.any(String),
          data: expect.objectContaining({
            tagId: tag.id,
            entityId: "test-entity",
            entityType: "test-type"
          })
        });
      }).pipe(Effect.provide(TestLayer))
    );

    it("fails if link already exists", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        const tag = yield* service.createTag("test-tag");
        yield* service.tagEntity(tag.id, "test-entity", "test-type");
        const result = yield* Effect.either(service.tagEntity(tag.id, "test-entity", "test-type"));
        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(LinkAlreadyExistsError);
        }
      }).pipe(Effect.provide(TestLayer))
    );
  });

  describe("untagEntity", () => {
    it("unlinks an entity from a tag", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        const tag = yield* service.createTag("test-tag");
        yield* service.tagEntity(tag.id, "test-entity", "test-type");
        const result = yield* Effect.either(service.untagEntity(tag.id, "test-entity", "test-type"));
        expect(result._tag).toBe("Right");
      }).pipe(Effect.provide(TestLayer))
    );

    it("fails if link does not exist", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        const tag = yield* service.createTag("test-tag");
        const result = yield* Effect.either(service.untagEntity(tag.id, "test-entity", "test-type"));
        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(LinkNotFoundError);
        }
      }).pipe(Effect.provide(TestLayer))
    );
  });

  describe("getTagsForEntity", () => {
    it("retrieves tags for an entity", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        const tag = yield* service.createTag("test-tag");
        yield* service.tagEntity(tag.id, "test-entity", "test-type");
        const result = yield* service.getTagsForEntity("test-entity", "test-type");
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(tag.id);
      }).pipe(Effect.provide(TestLayer))
    );
  });

  describe("findTags", () => {
    it("finds all tags", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        yield* service.createTag("test-tag-1");
        yield* service.createTag("test-tag-2");
        const result = yield* service.findTags();
        expect(result).toHaveLength(2);
      }).pipe(Effect.provide(TestLayer))
    );
    
    it("finds tags by prefix", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        yield* service.createTag("abc-tag");
        yield* service.createTag("xyz-tag");
        const result = yield* service.findTags("abc");
        expect(result).toHaveLength(1);
        expect(result[0].data.name).toBe("abc-tag");
      }).pipe(Effect.provide(TestLayer))
    );
  });

  describe("getTagByName", () => {
    it("retrieves a tag by name", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        yield* service.createTag("unique-tag");
        const result = yield* service.getTagByName("unique-tag");
        expect(Option.isSome(result)).toBe(true);
        if (Option.isSome(result)) {
          expect(result.value.data.name).toBe("unique-tag");
        }
      }).pipe(Effect.provide(TestLayer))
    );
    
    it("returns none for non-existent tag", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        const result = yield* service.getTagByName("non-existent");
        expect(Option.isNone(result)).toBe(true);
      }).pipe(Effect.provide(TestLayer))
    );
  });

  describe("getTagById", () => {
    it("retrieves a tag by id", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        const tag = yield* service.createTag("id-test-tag");
        const result = yield* service.getTagById(tag.id);
        expect(Option.isSome(result)).toBe(true);
        if (Option.isSome(result)) {
          expect(result.value.id).toBe(tag.id);
        }
      }).pipe(Effect.provide(TestLayer))
    );
    
    it("returns none for non-existent id", () => 
      Effect.gen(function*(_) {
        const service = yield* TagService;
        const result = yield* service.getTagById("fake-id");
        expect(Option.isNone(result)).toBe(true);
      }).pipe(Effect.provide(TestLayer))
    );
  });
});
