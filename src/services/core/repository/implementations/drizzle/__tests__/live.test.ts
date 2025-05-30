/**
 * @file Tests for the drizzle repository implementation
 * @module services/core/repository/implementations/drizzle/__tests__/live.test
 */

import { Cause, Effect, Exit, Option } from "effect";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { EntityNotFoundError } from "../../../errors.js";
import { DrizzleClient } from "../config.js";
import { make } from "../live.js";
import { TestEntityData, testTable } from "../test-schema.js";
import { cleanTestTable, createTestTable, dropTestTable } from "./setup.js";
import { TestDrizzleLayer, runTestEffect } from "./test-config.js";

describe.skip("DrizzleRepository", () => {
    const tableName = "test_entities";
    const entityType = "TestEntity";

    // Create test table before all tests
    beforeAll(async () => {
        await createTestTable(tableName);
    });

    // Clean test data between tests
    afterEach(async () => {
        await cleanTestTable(tableName);
    });

    // Drop test table after all tests
    afterAll(async () => {
        await dropTestTable(tableName);
    });

    // Helper to create repository instance
    const createRepo = Effect.flatMap(
        DrizzleClient,
        (client) => make<TestEntityData, BaseEntity<TestEntityData>>(entityType, testTable)
    );

    it("should create and retrieve an entity", async () => {
        const testData: TestEntityData = {
            name: "Test Entity",
            value: 42
        };

        const effect = Effect.gen(function* () {
            const repo = yield* createRepo;
            const created = yield* repo.create(testData);

            expect(created.id).toBeDefined();
            expect(created.data).toEqual(testData);
            expect(typeof created.createdAt).toBe('number');
            expect(typeof created.updatedAt).toBe('number');

            const found = yield* repo.findById(created.id);
            expect(Option.isSome(found)).toBe(true);
            if (Option.isSome(found)) {
                expect(found.value).toEqual(created);
            }
        });

        await runTestEffect(effect);
    });

    it("should find multiple entities", async () => {
        const testData1: TestEntityData = { name: "Test 1", value: 1 };
        const testData2: TestEntityData = { name: "Test 2", value: 2 };

        const effect = Effect.gen(function* () {
            const repo = yield* createRepo;

            // Create test entities
            const entity1 = yield* repo.create(testData1);
            const entity2 = yield* repo.create(testData2);

            // Test findMany with no filter
            const allEntities = yield* repo.findMany();
            expect(allEntities).toHaveLength(2);

            // Test findMany with filter
            const filteredEntities = yield* repo.findMany({
                filter: { value: 1 }
            });
            expect(filteredEntities).toHaveLength(1);
            expect(filteredEntities[0].data).toEqual(testData1);

            // Test pagination
            const pagedEntities = yield* repo.findMany({
                limit: 1,
                offset: 1
            });
            expect(pagedEntities).toHaveLength(1);
            expect(pagedEntities[0].id).toBe(entity2.id);
        });

        await runTestEffect(effect);
    });

    it("should update an entity", async () => {
        const testData: TestEntityData = { name: "Original", value: 1 };
        const updateData: Partial<TestEntityData> = { value: 2 };

        const effect = Effect.gen(function* () {
            const repo = yield* createRepo;

            // Create and update entity
            const created = yield* repo.create(testData);
            const updated = yield* repo.update(created.id, updateData);

            expect(updated.id).toBe(created.id);
            expect(updated.data.value).toBe(updateData.value);
            expect(updated.data.name).toBe(testData.name);
            expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);
        });

        await runTestEffect(effect);
    });

    it("should fail to update non-existent entity", async () => {
        const effect = Effect.gen(function* () {
            const repo = yield* createRepo;
            return yield* repo.update("non-existent", { value: 1 });
        });

        const result = await Effect.runPromiseExit(
            Effect.provide(effect, TestDrizzleLayer)
        );

        expect(Exit.isFailure(result)).toBe(true);
        if (Exit.isFailure(result)) {
            const error = Cause.failureOption(result.cause);
            expect(Option.isSome(error)).toBe(true);
            if (Option.isSome(error)) {
                const err = error.value;
                expect(err).toBeInstanceOf(EntityNotFoundError);
                if (err instanceof EntityNotFoundError) {
                    expect(err.entityId).toBe("non-existent");
                    expect(err.entityType).toBe(entityType);
                }
            }
        }
    });

    it("should delete an entity", async () => {
        const testData: TestEntityData = { name: "To Delete", value: 1 };

        const effect = Effect.gen(function* () {
            const repo = yield* createRepo;

            // Create and then delete entity
            const created = yield* repo.create(testData);
            yield* repo.delete(created.id);

            // Verify entity is deleted
            const found = yield* repo.findById(created.id);
            expect(Option.isNone(found)).toBe(true);
        });

        await runTestEffect(effect);
    });

    it("should count entities", async () => {
        const testData1: TestEntityData = { name: "Count 1", value: 1 };
        const testData2: TestEntityData = { name: "Count 2", value: 1 };
        const testData3: TestEntityData = { name: "Count 3", value: 2 };

        const effect = Effect.gen(function* () {
            const repo = yield* createRepo;

            // Create test entities
            yield* repo.create(testData1);
            yield* repo.create(testData2);
            yield* repo.create(testData3);

            // Test total count
            const totalCount = yield* repo.count();
            expect(totalCount).toBe(3);

            // Test filtered count
            const filteredCount = yield* repo.count({
                filter: { value: 1 }
            });
            expect(filteredCount).toBe(2);
        });

        await runTestEffect(effect);
    });
}); 