/**
 * @file Tests for the InMemoryRepository implementation using the 'make' function.
 * Clock integration is deferred, using Date.now() placeholders.
 */

import { Cause, Context, Effect, Exit, Layer, Option, Ref } from "effect"; // Added Ref
import { describe, expect, it } from "vitest";

import type { EntityId, JsonObject } from "@/types.js";
import {
    EntityNotFoundError
} from "@core/repository/errors.js";
// Import the 'make' function directly
import { make as makeInMemoryRepository } from "@core/repository/implementations/in-memory/live.js";
import type {
    BaseEntity,
    RepositoryApi
} from "@core/repository/types.js";

// --- Test Setup ---

// 1. Define a concrete entity type for testing
interface TestEntityData extends JsonObject {
    name: string;
    value: number;
}
interface TestEntity extends BaseEntity<TestEntityData> { }

// 2. Define a specific Tag for the test repository service
const TestRepository = Context.GenericTag<RepositoryApi<TestEntity>>(
    "TestRepository",
);

// 3. Define the entity type string identifier
const testEntityType = "TestEntity";

// 4. Create the specific repository layer DIRECTLY using Layer.effect and make
// This layer requires nothing (R = never)
const testRepoLayer = Layer.effect(
    TestRepository, // The specific Tag for RepositoryApi<TestEntity>
    Effect.gen(function* () {
        // Create the Ref store needed by 'make'
        const store = yield* Ref.make(new Map<EntityId, TestEntity>());
        // Call the imported 'make' function
        const implementation = makeInMemoryRepository<TestEntity>(testEntityType, store);
        return implementation; // Return the implementation matching the Tag's type
    })
);

// 5. Define the context required by test effects BEFORE providing the layer
// Effects only use TestRepository now
type TestEffectRequirements = RepositoryApi<TestEntity>;

// 6. Helper functions to run tests with the layer provided
// Input effect requires only the repository
const runTest = <E, A>(effect: Effect.Effect<A, E, TestEffectRequirements>) =>
    Effect.runPromise(Effect.provide(effect, testRepoLayer)); // Provide the repo layer directly

const runFailTest = <E, A>(effect: Effect.Effect<A, E, TestEffectRequirements>) =>
    Effect.runPromise(Effect.exit(Effect.provide(effect, testRepoLayer))); // Provide the repo layer directly

// --- Test Suite ---
describe("InMemoryRepositoryLiveLayer (No Clock)", () => {
    // Tests remain the same...

    it("should create an entity and assign placeholder timestamps", async () => {
        const data: TestEntityData = { name: "Create Test", value: 1 };
        const effect = Effect.gen(function* () {
            const repo = yield* TestRepository;
            const created = yield* repo.create(data);
            expect(created.id).toBeTypeOf("string");
            expect(created.data).toEqual(data);
            expect(created.createdAt).toBeInstanceOf(Date);
            expect(created.updatedAt).toBeInstanceOf(Date);
            expect(created.updatedAt).toEqual(created.createdAt);
            return created;
        });
        await expect(runTest(effect)).resolves.toBeDefined();
    });

    it("should find an entity by ID", async () => {
        const data: TestEntityData = { name: "FindById Test", value: 2 };
        let createdId: EntityId;
        const effect = Effect.gen(function* () {
            const repo = yield* TestRepository;
            const created = yield* repo.create(data);
            createdId = created.id;
            const foundSome = yield* repo.findById(created.id);
            const foundNone = yield* repo.findById("non-existent-id");
            expect(Option.isSome(foundSome)).toBe(true);
            if (Option.isSome(foundSome)) {
                expect(foundSome.value.id).toBe(created.id);
                expect(foundSome.value.data).toEqual(data);
            }
            expect(Option.isNone(foundNone)).toBe(true);
        });
        await expect(runTest(effect)).resolves.toBeUndefined();
    });

    it("should find entities with findMany and findOne", async () => {
        const data1: TestEntityData = { name: "FindMany 1", value: 10 };
        const data2: TestEntityData = { name: "FindMany 2", value: 20 };
        const data3: TestEntityData = { name: "FindMany 3", value: 10 };
        const effect = Effect.gen(function* () {
            const repo = yield* TestRepository;
            yield* repo.create(data1);
            yield* repo.create(data2);
            yield* repo.create(data3);
            const all = yield* repo.findMany();
            expect(all).toHaveLength(3);
            const value10 = yield* repo.findMany({ filter: { value: 10 } });
            expect(value10).toHaveLength(2);
            expect(value10.map((e) => e.data.name)).toEqual(
                expect.arrayContaining(["FindMany 1", "FindMany 3"]),
            );
            const name2 = yield* repo.findMany({ filter: { name: "FindMany 2" } });
            expect(name2).toHaveLength(1);
            expect(name2[0]?.data).toEqual(data2);
            const limited = yield* repo.findMany({ limit: 2 });
            expect(limited).toHaveLength(2);
            const offsetted = yield* repo.findMany({ offset: 1 });
            expect(offsetted).toHaveLength(2);
            const paged = yield* repo.findMany({ offset: 1, limit: 1 });
            expect(paged).toHaveLength(1);
            const oneValue10 = yield* repo.findOne({ filter: { value: 10 } });
            expect(Option.isSome(oneValue10)).toBe(true);
            if (Option.isSome(oneValue10)) {
                expect(oneValue10.value.data.value).toBe(10);
            }
            const oneNotFound = yield* repo.findOne({ filter: { name: "Not Here" } });
            expect(Option.isNone(oneNotFound)).toBe(true);
        });
        await expect(runTest(effect)).resolves.toBeUndefined();
    });

    it("should update an entity and its placeholder timestamp", async () => {
        const initialData: TestEntityData = { name: "Update Initial", value: 100 };
        const updateData: Partial<TestEntityData> = { value: 101 };
        let createdId: EntityId;
        let originalCreatedAt: Date;
        const effect = Effect.gen(function* () {
            const repo = yield* TestRepository;
            const created = yield* repo.create(initialData);
            createdId = created.id;
            originalCreatedAt = created.createdAt;
            Effect.sleep("10 millis");
            const updated = yield* repo.update(created.id, updateData);
            expect(updated.id).toBe(createdId);
            expect(updated.data.name).toBe(initialData.name);
            expect(updated.data.value).toBe(updateData.value);
            expect(updated.createdAt).toEqual(originalCreatedAt);
            expect(updated.updatedAt).toBeInstanceOf(Date);
            expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalCreatedAt.getTime());
            const found = yield* repo.findById(createdId);
            expect(Option.isSome(found)).toBe(true);
            if (Option.isSome(found)) {
                expect(found.value.data.value).toBe(updateData.value);
                expect(found.value.updatedAt).toEqual(updated.updatedAt);
            }
        });
        await expect(runTest(effect)).resolves.toBeUndefined();
    });

    it("should fail update with EntityNotFoundError for non-existent ID", async () => {
        const effect = Effect.gen(function* () {
            const repo = yield* TestRepository;
            return yield* repo.update("non-existent-id", { name: "Update Fail" });
        });
        const exit = await runFailTest(effect);
        expect(exit._tag).toBe("Failure");
        if (Exit.isFailure(exit)) { // <-- Use type guard
            const failure = Cause.failureOption(exit.cause); // <-- Access cause safely
            expect(Option.isSome(failure)).toBe(true);
            if (Option.isSome(failure)) {
                expect(failure.value._tag).toBe("EntityNotFoundError");
                expect((failure.value as EntityNotFoundError).entityId).toBe("non-existent-id");
                expect((failure.value as EntityNotFoundError).entityType).toBe(testEntityType);
            }
        } else {
            expect.fail("Expected effect to fail, but it succeeded.");
        }
    });

    it("should delete an entity", async () => {
        const data: TestEntityData = { name: "Delete Test", value: 3 };
        let createdId: EntityId;
        const effect = Effect.gen(function* () {
            const repo = yield* TestRepository;
            const created = yield* repo.create(data);
            createdId = created.id;
            const foundBefore = yield* repo.findById(createdId);
            expect(Option.isSome(foundBefore)).toBe(true);
            yield* repo.delete(createdId);
            const foundAfter = yield* repo.findById(createdId);
            expect(Option.isNone(foundAfter)).toBe(true);
        });
        await expect(runTest(effect)).resolves.toBeUndefined();
    });

    it("should count entities", async () => {
        const data1: TestEntityData = { name: "Count 1", value: 50 };
        const data2: TestEntityData = { name: "Count 2", value: 50 };
        const data3: TestEntityData = { name: "Count 3", value: 51 };
        const effect = Effect.gen(function* () {
            const repo = yield* TestRepository;
            yield* repo.create(data1);
            yield* repo.create(data2);
            yield* repo.create(data3);
            const totalCount = yield* repo.count();
            expect(totalCount).toBe(3);
            const value50Count = yield* repo.count({ filter: { value: 50 } });
            expect(value50Count).toBe(2);
            const noMatchCount = yield* repo.count({ filter: { name: "Not Here" } });
            expect(noMatchCount).toBe(0);
        });
        await expect(runTest(effect)).resolves.toBeUndefined();
    });

});
