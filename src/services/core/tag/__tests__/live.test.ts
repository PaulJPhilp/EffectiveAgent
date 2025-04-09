/**
 * @file Tests for the TagApi live implementation.
 */

import { Cause, Effect, Exit, Layer, Option, Ref } from "effect";
import { describe, expect, it } from "vitest";

import {
    LinkNotFoundError
} from "@core/tag/errors.js";
import { TagApiLiveLayer } from "@core/tag/live.js";
import type {
    EntityTagLinkEntity,
    TagEntity
} from "@core/tag/schema.js";
import {
    EntityTagLinkRepository,
    TagApi,
    TagRepository
} from "@core/tag/types.js";

// Import repository implementation for testing
import { make as makeInMemoryRepository } from "@core/repository/implementations/in-memory/live.js";

import type { EntityId } from "@/types.js";

// Define entity types for repositories
const tagEntityType = "Tag";
const linkEntityType = "EntityTagLink";

describe("TagApiLive", () => {
    // 1. Create repository layers for testing
    // Create a fresh repository layer for each test to ensure isolation
    const createTestLayer = () => {
        const tagRepoLayer = Layer.effect(
            TagRepository,
            Effect.gen(function* () {
                const store = yield* Ref.make(new Map<EntityId, TagEntity>());
                return makeInMemoryRepository<TagEntity>(tagEntityType, store);
            })
        );

        const linkRepoLayer = Layer.effect(
            EntityTagLinkRepository,
            Effect.gen(function* () {
                const store = yield* Ref.make(new Map<EntityId, EntityTagLinkEntity>());
                return makeInMemoryRepository<EntityTagLinkEntity>(linkEntityType, store);
            })
        );

        // Combined layer with repositories and service implementation
        return Layer.provide(
            Layer.merge(tagRepoLayer, linkRepoLayer),
            TagApiLiveLayer
        );
    };

    // Helper to run tests with proper handling
    const runTest = <A, E>(effect: Effect.Effect<A, E, TagApi>): Promise<A> => {
        // Create a fresh layer for each test
        const testLayer = createTestLayer();

        // Provide the test layer to the effect
        const providedEffect = Effect.provide(effect, testLayer);

        // Add logging for any unexpected errors
        const effectWithLogging = providedEffect.pipe(
            Effect.catchAllCause(cause => {
                console.error("Effect Test Error:", Cause.pretty(cause));
                return Effect.failCause(cause);
            })
        );

        // Run the effect
        return Effect.runPromise(effectWithLogging);
    };

    // Helper to run tests expecting failure and assert error tags
    const expectError = async <A, E extends { _tag: string }>(
        effect: Effect.Effect<A, E, TagApi>,
        errorTag: string
    ): Promise<void> => {
        // Create a fresh layer for each test
        const testLayer = createTestLayer();

        // Provide the test layer to the effect
        const providedEffect = Effect.provide(effect, testLayer);
        // Run the effect and get exit
        const exit = await Effect.runPromiseExit(Effect.provide(effect, testLayer));

        if (!Exit.isFailure(exit)) {
            throw new Error(`Expected error with tag ${errorTag}, but effect succeeded`);
        }

        const failure = Cause.failureOption(exit.cause);

        if (failure._tag === "Some") {
            const error = failure.value;
            if ("_tag" in error && error._tag === errorTag) {
                return; // Success case
            }
            throw new Error(`Expected error with tag ${errorTag}, got ${("_tag" in error) ? error._tag : "unknown error"}`);
        }

        throw new Error(`Expected error with tag ${errorTag}, but got a different failure`);
    };

    // --- Tag Tests ---

    it("should create a tag", async () => {
        const effect = Effect.gen(function* () {
            const tagApi = yield* TagApi;
            const tag = yield* tagApi.createTag("example-tag");

            expect(tag.id).toBeTypeOf("string");
            expect(tag.data.name).toBe("example-tag");
            expect(tag.createdAt).toBeTypeOf("number");

            return tag;
        });

        await runTest(effect);
    });

    it("should normalize tag names", async () => {
        const effect = Effect.gen(function* () {
            const tagApi = yield* TagApi;

            // Create tag with uppercase name
            const tag = yield* tagApi.createTag("ExAmPlE-Tag");

            // Retrieve with normalized name
            const found = yield* tagApi.getTagByName("example-tag");

            expect(Option.isSome(found)).toBe(true);
            if (Option.isSome(found)) {
                expect(found.value.id).toBe(tag.id);
            }

            return tag;
        });

        await runTest(effect);
    });

    it("should fail with DuplicateTagNameError for duplicate tag names", async () => {
        const effect = Effect.gen(function* () {
            const tagApi = yield* TagApi;

            // Create first tag
            yield* tagApi.createTag("unique-tag");

            // Try to create duplicate
            return yield* tagApi.createTag("unique-tag");
        });

        await expectError(effect, "DuplicateTagNameError");
    });

    it("should find tags by prefix", async () => {
        const effect = Effect.gen(function* () {
            const tagApi = yield* TagApi;

            // Create multiple tags
            yield* tagApi.createTag("alpha-tag");
            yield* tagApi.createTag("alpha-test");
            yield* tagApi.createTag("beta-tag");

            // Find by prefix
            const alphaTags = yield* tagApi.findTags("alpha");
            expect(alphaTags).toHaveLength(2);

            const betaTags = yield* tagApi.findTags("beta");
            expect(betaTags).toHaveLength(1);

            const allTags = yield* tagApi.findTags();
            expect(allTags).toHaveLength(3);

            return { alphaTags, betaTags, allTags };
        });

        await runTest(effect);
    });

    // --- Linking Tests ---

    it("should tag an entity", async () => {
        const effect = Effect.gen(function* () {
            const tagApi = yield* TagApi;

            // Create a tag
            const tag = yield* tagApi.createTag("document-tag");

            // Tag an entity
            const link = yield* tagApi.tagEntity(tag.id, "doc-123", "Document");

            expect(link.id).toBeTypeOf("string");
            expect(link.data.tagId).toBe(tag.id);
            expect(link.data.entityId).toBe("doc-123");
            expect(link.data.entityType).toBe("Document");

            return link;
        });

        await runTest(effect);
    });

    it("should fail with LinkAlreadyExistsError for duplicate links", async () => {
        const effect = Effect.gen(function* () {
            const tagApi = yield* TagApi;

            // Create a tag
            const tag = yield* tagApi.createTag("duplicate-link-tag");

            // Tag an entity
            yield* tagApi.tagEntity(tag.id, "entity-123", "TestEntity");

            // Try to create duplicate link
            return yield* tagApi.tagEntity(tag.id, "entity-123", "TestEntity");
        });

        await expectError(effect, "LinkAlreadyExistsError");
    });

    it("should fail with TagNotFoundError when tagging with non-existent tag", async () => {
        const effect = Effect.gen(function* () {
            const tagApi = yield* TagApi;

            // Try to tag with non-existent tag ID
            return yield* tagApi.tagEntity("non-existent-tag", "entity-123", "TestEntity");
        });

        await expectError(effect, "TagNotFoundError");
    });

    it("should untag an entity", async () => {
        const effect = Effect.gen(function* () {
            const tagApi = yield* TagApi;

            // Create a tag
            const tag = yield* tagApi.createTag("removable-tag");

            // Tag an entity
            yield* tagApi.tagEntity(tag.id, "entity-456", "TestEntity");

            // Untag the entity
            yield* tagApi.untagEntity(tag.id, "entity-456", "TestEntity");

            // Verify link is gone by trying to untag again (should fail)
            try {
                yield* tagApi.untagEntity(tag.id, "entity-456", "TestEntity");
                throw new Error("Expected untagEntity to fail");
            } catch (error) {
                expect(error).toBeInstanceOf(LinkNotFoundError);
            }
        });

        await runTest(effect);
    });

    it("should get tags for an entity", async () => {
        const effect = Effect.gen(function* () {
            const tagApi = yield* TagApi;

            // Create multiple tags
            const tag1 = yield* tagApi.createTag("entity-tag-1");
            const tag2 = yield* tagApi.createTag("entity-tag-2");
            const tag3 = yield* tagApi.createTag("other-tag");

            // Tag same entity with multiple tags
            yield* tagApi.tagEntity(tag1.id, "multi-tag-entity", "TestEntity");
            yield* tagApi.tagEntity(tag2.id, "multi-tag-entity", "TestEntity");

            // Tag different entity
            yield* tagApi.tagEntity(tag3.id, "other-entity", "TestEntity");

            // Get tags for first entity
            const entityTags = yield* tagApi.getTagsForEntity("multi-tag-entity", "TestEntity");
            expect(entityTags).toHaveLength(2);

            // Verify tag names
            const tagNames = entityTags.map(tag => tag.data.name);
            expect(tagNames).toContain("entity-tag-1");
            expect(tagNames).toContain("entity-tag-2");
            expect(tagNames).not.toContain("other-tag");

            return entityTags;
        });

        await runTest(effect);
    });

    it("should get entities for a tag", async () => {
        const effect = Effect.gen(function* () {
            const tagApi = yield* TagApi;

            // Create a tag
            const tag = yield* tagApi.createTag("multi-entity-tag");

            // Tag multiple entities
            yield* tagApi.tagEntity(tag.id, "entity-a", "TypeA");
            yield* tagApi.tagEntity(tag.id, "entity-b", "TypeB");

            // Get entities for the tag
            const entities = yield* tagApi.getEntitiesForTag(tag.id);
            expect(entities).toHaveLength(2);

            // Verify entity IDs and types
            const entityIds = entities.map(e => e.entityId);
            const entityTypes = entities.map(e => e.entityType);

            expect(entityIds).toContain("entity-a");
            expect(entityIds).toContain("entity-b");
            expect(entityTypes).toContain("TypeA");
            expect(entityTypes).toContain("TypeB");

            return entities;
        });

        await runTest(effect);
    });
});
