// src/testing/mocks.ts (Extend or create this file)
import { Effect, Layer, LogLevel, Logger, Option, ReadonlyArray } from "effect";
import { vi } from "vitest";

// --- Logging Mock (Reuse) ---
export const mockLogger = { /* ... */ };
export class MockLoggingService implements ILoggingService { /* ... */ }
export const MockLoggingServiceLayer = Layer.succeed(LoggingService, new MockLoggingService());

// --- Repository Mock for Tags & Associations ---
import {
    type IRepositoryService, type BaseEntity, type FindCriteria, type UpdateData,
    type FindByIdCriteria, RepositoryService, type CreateEffect, type FindEffect,
    type FindManyEffect, type UpdateEffect, type DeleteEffect,
} from "../repository/repository-service.ts"; // Adjust path
import {
    DataValidationError as RepoDataValidationError,
    EntityNotFoundError as RepoEntityNotFoundError,
    RepositoryError as RepoError,
} from "../repository/errors.ts"; // Adjust path
import {
    type TagEntityData, type TagAssociationEntityData,
    TagExistsError, TagNotFoundError, TagInUseError, AssociationNotFoundError, EntityAssociationError, GenericTagError // Import errors for mapping checks
} from "../tag/tag-service.ts"; // Adjust path

// Use separate maps for different entity types
const mockTagDb = new Map<string, BaseEntity<TagEntityData>>();
const mockAssocDb = new Map<string, BaseEntity<TagAssociationEntityData>>();
let tagIdCounter = 0;
let assocIdCounter = 0;

// Type guards
function isTagData(data: any): data is TagEntityData {
    return typeof data === 'object' && data !== null && 'name' in data;
}
function isAssocData(data: any): data is TagAssociationEntityData {
    return typeof data === 'object' && data !== null && 'tagId' in data && 'entityId' in data && 'entityType' in data;
}

export class MockTagRepositoryService implements IRepositoryService<any> {
    reset() {
        mockTagDb.clear();
        mockAssocDb.clear();
        tagIdCounter = 0;
        assocIdCounter = 0;
    }

    // --- Mock Implementations ---
    // (Similar structure to MockMultiTypeRepositoryService, but specific logic for tags/assocs)

    create = vi.fn((data: any): CreateEffect<any> => {
        const now = new Date();
        if (isTagData(data)) {
            // Simulate unique name constraint (case-insensitive)
            const normalizedName = data.name.toLowerCase();
            for (const entry of mockTagDb.values()) {
                if (entry.data.name.toLowerCase() === normalizedName) {
                    // Simulate DB unique constraint error (maps to TagExistsError later)
                    return Effect.fail(new RepoError({ message: `Mock Repo: Tag name '${data.name}' already exists` }));
                }
            }
            const newId = `mock-tag-${++tagIdCounter}`;
            const newEntity: BaseEntity<TagEntityData> = { id: newId, data: { ...data }, createdAt: now, updatedAt: now };
            mockTagDb.set(newId, newEntity);
            return Effect.succeed(newEntity);
        } else if (isAssocData(data)) {
            // Simulate unique constraint (tagId, entityId, entityType)
            for (const entry of mockAssocDb.values()) {
                if (entry.data.tagId === data.tagId && entry.data.entityId === data.entityId && entry.data.entityType === data.entityType) {
                    // Simulate DB unique constraint error (maps to EntityAssociationError later)
                    return Effect.fail(new RepoError({ message: `Mock Repo: Association already exists` }));
                }
            }
            const newId = `mock-assoc-${++assocIdCounter}`;
            const newEntity: BaseEntity<TagAssociationEntityData> = { id: newId, data: { ...data }, createdAt: now, updatedAt: now };
            mockAssocDb.set(newId, newEntity);
            return Effect.succeed(newEntity);
        }
        return Effect.fail(new RepoError({ message: "Mock Repo: Unknown data type for create" }));
    });

    findById = vi.fn((criteria: FindByIdCriteria): FindEffect<any> => {
        // Check both maps
        const tagEntity = mockTagDb.get(criteria.id);
        if (tagEntity) return Effect.succeed(tagEntity);
        const assocEntity = mockAssocDb.get(criteria.id);
        if (assocEntity) return Effect.succeed(assocEntity);
        return Effect.fail(new RepoEntityNotFoundError({ entityId: criteria.id, message: `Mock Repo: Entity not found with id ${criteria.id}` }));
    });

    find = vi.fn((criteria: FindCriteria<any>): FindManyEffect<any> => {
        const results: BaseEntity<any>[] = [];
        // Determine which DB to search based on criteria keys
        const looksLikeTagCriteria = 'name' in criteria;
        const looksLikeAssocCriteria = 'tagId' in criteria || 'entityId' in criteria || 'entityType' in criteria;

        if (looksLikeTagCriteria || !looksLikeAssocCriteria) {
            mockTagDb.forEach((entity) => {
                let match = true;
                for (const key in criteria) {
                    const entityValue = entity.data[key as keyof TagEntityData];
                    const criteriaValue = criteria[key as keyof TagEntityData];
                    // Handle case-insensitive name search
                    if (key === 'name' && typeof entityValue === 'string' && typeof criteriaValue === 'string') {
                        if (entityValue.toLowerCase() !== criteriaValue.toLowerCase()) {
                            match = false; break;
                        }
                    } else if (entityValue !== criteriaValue) {
                        match = false; break;
                    }
                }
                if (match) results.push(entity);
            });
        }
        if (looksLikeAssocCriteria || !looksLikeTagCriteria) {
            mockAssocDb.forEach((entity) => {
                let match = true;
                for (const key in criteria) {
                    if (entity.data[key as keyof TagAssociationEntityData] !== criteria[key as keyof TagAssociationEntityData]) {
                        match = false; break;
                    }
                }
                if (match) results.push(entity);
            });
        }
        return Effect.succeed(results);
    });

    update = vi.fn(); // Tags/Associations likely immutable, maybe not needed

    delete = vi.fn((id: string): DeleteEffect => {
        if (mockTagDb.delete(id)) return Effect.void;
        if (mockAssocDb.delete(id)) return Effect.void;
        return Effect.fail(new RepoEntityNotFoundError({ entityId: id, message: `Mock Repo: Entity not found for delete with id ${id}` }));
    });
}

// Layer providing the single mock repository instance
export const MockTagRepositoryLayer = Layer.succeed(
    RepositoryService,
    new MockTagRepositoryService() as IRepositoryService<any>
);

// Helper to get mocks
export const getTagTestMocks = Effect.all({
    logSvc: LoggingService,
    repoSvc: RepositoryService, // Will resolve to MockTagRepositoryService
});

import { Effect, Exit, Layer, LogLevel, ReadonlyArray, Cause, Tag } from "effect";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as EffectVitest from "@effect/vitest";

// --- Import Service Definition, Errors, Schemas ---
import {
    TagService, type ITagService, type Tag, type TagEntityData, type TagAssociationEntityData,
    TagExistsError, TagNotFoundError, TagInUseError, AssociationNotFoundError, EntityAssociationError, GenericTagError
} from "../src/tag/tag-service.ts"; // Adjust path

// --- Import Live Layer & Mocks ---
import { TagServiceLiveLayer } from "../src/tag/tag-service-live.ts"; // Adjust path (Assume this exists)
import {
    mockLogger, MockLoggingServiceLayer, MockTagRepositoryLayer, // Use the specific repo mock layer
    getTagTestMocks, type MockTagRepositoryService, // Use correct helper/type
} from "./testing/mocks.ts"; // Adjust path
import { RepositoryService } from "../src/repository/repository-service.ts"; // Import Tag

// --- Test Setup ---

// Create the full layer stack for testing
const TestLayer = TagServiceLiveLayer.pipe(
    Layer.provide(MockLoggingServiceLayer),
    Layer.provide(MockTagRepositoryLayer) // Provide the mock repo layer
);

// Use EffectVitest.provide for the test suite
const { it } = EffectVitest.provide(TestLayer);

// Helper to get service instance and mocks within tests
const getTestServiceAndMocks = Effect.all({
    svc: TagService,
    mocks: getTagTestMocks,
});

// --- Test Suite Outline ---

describe("TagServiceLive", () => {

    let mockRepoService: MockTagRepositoryService;

    EffectVitest.beforeEach(() =>
        Effect.gen(function* (_) {
            vi.clearAllMocks();
            const { mocks } = yield* _(getTestServiceAndMocks);
            mockRepoService = mocks.repoSvc as MockTagRepositoryService;
            mockRepoService.reset();
        })
    );

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // --- Tag Management ---
    describe("createTag", () => {
        it("should create a new tag successfully");
        it("should fail with TagExistsError if tag name already exists (case-insensitive)");
        it("should normalize tag name before saving (e.g., lowercase)");
        it("should fail with GenericTagError if repository create fails");
    });

    describe("getTag", () => {
        it("should retrieve tag by ID");
        it("should retrieve tag by name (case-insensitive)");
        it("should fail with TagNotFoundError if ID does not exist");
        it("should fail with TagNotFoundError if name does not exist");
        it("should prioritize ID if both ID and name are provided");
    });

    describe("listTags", () => {
        it("should return empty array when no tags exist");
        it("should return all existing tags");
    });

    describe("deleteTag", () => {
        it("should delete a tag successfully if it has no associations");
        it("should fail with TagInUseError if tag has associations");
        it("should fail with TagNotFoundError if tag ID does not exist");
        it("should fail with GenericTagError if repository delete fails");
    });

    // --- Association Management ---
    describe("associateTag", () => {
        it("should create a new association successfully");
        it("should fail with TagNotFoundError if tag ID does not exist");
        it("should succeed without error if association already exists (idempotent)");
        // it("should fail with EntityAssociationError if association already exists (strict)"); // Alternative behavior
        it("should fail with EntityAssociationError if repository create fails");
    });

    describe("dissociateTag", () => {
        it("should remove an existing association successfully");
        it("should fail with AssociationNotFoundError if association does not exist");
        it("should fail with GenericTagError if repository delete fails");
    });

    describe("getTagsForEntity", () => {
        it("should return empty array if entity has no tags");
        it("should return all tags associated with a specific entity");
        it("should handle/skip associations where the tag definition is missing (log warning)");
        it("should only return tags for the specified entityType");
    });

    describe("getEntitiesForTag", () => {
        it("should return empty array if tag has no associations (for the type)");
        it("should return all entity IDs associated with a specific tag (for the type)");
        it("should fail with TagNotFoundError if tag ID does not exist");
        it("should only return entities for the specified entityType");
    });

});
