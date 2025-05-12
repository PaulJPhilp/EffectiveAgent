import { createServiceTestHarness } from "@/services/core/test-harness/utils/effect-test-harness.js";
import { drizzle } from "drizzle-orm/postgres-js";
import { Effect, Layer } from "effect";
import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DrizzleRepository } from "./repository.js";
import { createBaseTableSchema } from "./schema.js";

// Test entity type
interface TestEntity extends BaseEntity {
  data: {
    name: string;
    value: number;
  };
}

describe("DrizzleRepository", () => {
  // Create a test database connection
  const connectionString = process.env["TEST_DATABASE_URL"] || "postgres://postgres:postgres@localhost:5432/test";
  const client = postgres(connectionString);
  const db = drizzle(client);

  // Create a test table
  const testTable = createBaseTableSchema<TestEntity["data"]>("test_entities");

  // Create test harness
  const repository = DrizzleRepository<TestEntity>();
  const harness = createServiceTestHarness(
    Layer.effect(
      repository.Tag,
      repository.make({ db, table: testTable })
    )
  );

  // Clean up test data before each test
  beforeEach(async () => {
    await db.delete(testTable).execute();
  });

  describe("create", () => {
    it("should create a new entity", async () => {
      const effect = Effect.gen(function* (_) {
        const service = yield* repository.Tag;
        const entity = yield* service.create({ name: "test", value: 42 });
        expect(entity.id).toBeDefined();
        expect(entity.data.name).toBe("test");
        expect(entity.data.value).toBe(42);
        expect(entity.createdAt).toBeDefined();
        expect(entity.updatedAt).toBeDefined();
        expect(entity.updatedAt).toBe(entity.createdAt);
        return entity;
      });

      await harness.runTest(effect);
    });
  });

  describe("findById", () => {
    it("should find an entity by id", async () => {
      const effect = Effect.gen(function* () {
        const service = yield* repository.Tag;
        const created = yield* service.create({ name: "test", value: 42 });
        const found = yield* service.findById(created.id);
        expect(found._tag).toBe("Some");
        if (found._tag === "Some") {
          expect(found.value.id).toBe(created.id);
          expect(found.value.data).toEqual(created.data);
        }
        return found;
      });

      await harness.runTest(effect);
    });

    it("should return None for non-existent id", async () => {
      const effect = Effect.gen(function* () {
        const service = yield* repository.Tag;
        const found = yield* service.findById("non-existent");
        expect(found._tag).toBe("None");
        return found;
      });

      await harness.runTest(effect);
    });
  });

  describe("findMany", () => {
    it("should find entities matching filter", async () => {
      const effect = Effect.gen(function* () {
        const service = yield* repository.Tag;
        yield* service.create({ name: "test1", value: 42 });
        yield* service.create({ name: "test2", value: 42 });
        yield* service.create({ name: "test3", value: 24 });

        const found = yield* service.findMany({ filter: { value: 42 } });
        expect(found.length).toBe(2);
        expect(found.every(e => e.data.value === 42)).toBe(true);
        return found;
      });

      await harness.runTest(effect);
    });

    it("should support pagination", async () => {
      const effect = Effect.gen(function* () {
        const service = yield* repository.Tag;
        yield* service.create({ name: "test1", value: 42 });
        yield* service.create({ name: "test2", value: 42 });
        yield* service.create({ name: "test3", value: 42 });

        const page1 = yield* service.findMany({ offset: 0, limit: 2 });
        const page2 = yield* service.findMany({ offset: 2, limit: 2 });

        expect(page1.length).toBe(2);
        expect(page2.length).toBe(1);
        return { page1, page2 };
      });

      await harness.runTest(effect);
    });
  });

  describe("update", () => {
    it("should update an existing entity", async () => {
      const effect = Effect.gen(function* () {
        const service = yield* repository.Tag;
        const created = yield* service.create({ name: "test", value: 42 });
        const updated = yield* service.update(created.id, { value: 24 });
        expect(updated.data.name).toBe("test");
        expect(updated.data.value).toBe(24);
        expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);
        return updated;
      });

      await harness.runTest(effect);
    });

    it("should fail when updating non-existent entity", async () => {
      const effect = Effect.gen(function* () {
        const service = yield* repository.Tag;
        yield* service.update("non-existent", { value: 24 });
      });

      await harness.expectError(effect, "EntityNotFoundError");
    });
  });

  describe("delete", () => {
    it("should delete an existing entity", async () => {
      const effect = Effect.gen(function* () {
        const service = yield* repository.Tag;
        const created = yield* service.create({ name: "test", value: 42 });
        yield* service.delete(created.id);

        const found = yield* service.findById(created.id);
        expect(found._tag).toBe("None");
      });

      await harness.runTest(effect);
    });

    it("should fail when deleting non-existent entity", async () => {
      const effect = Effect.gen(function* () {
        const service = yield* repository.Tag;
        yield* service.delete("non-existent");
      });

      await harness.expectError(effect, "EntityNotFoundError");
    });
  });

  describe("count", () => {
    it("should count entities matching filter", async () => {
      const effect = Effect.gen(function* (_) {
        const service = yield* repository.Tag;
        yield* service.create({ name: "test1", value: 42 });
        yield* service.create({ name: "test2", value: 42 });
        yield* service.create({ name: "test3", value: 24 });

        const count = yield* service.count({ filter: { value: 42 } });
        expect(count).toBe(2);
        return count;
      });

      await harness.runTest(effect);
    });
  });

  // Clean up after all tests
  afterAll(async () => {
    await client.end();
  });
});
