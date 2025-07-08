import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { EntityNotFoundError } from "../../errors.js";
import { InMemoryRepository } from "./repository.js";

// Mock DrizzleClientApi for tests since in-memory doesn't need it
const mockDrizzleClientApi = Layer.succeed(
  Context.GenericTag<"DrizzleClientApi", any>("DrizzleClientApi"),
  {} as any
);

interface TestEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  data: {
    name: string;
    value: number;
  };
  [key: string]: unknown;
}

describe("InMemoryRepository", () => {
  const repository = InMemoryRepository<TestEntity>();

  // Helper to run repository tests with the real implementation
  const runTest = <A, E>(effect: Effect.Effect<A, E, any>): Promise<A> => {
    return Effect.runPromise(
      effect.pipe(
        Effect.provide(repository.live("TestEntity")),
        Effect.provide(mockDrizzleClientApi)
      )
    );
  };

  describe("create", () => {
    it("should create a new entity", async () => {
      const result = await runTest(
        Effect.gen(function* (_) {
          const service = yield* repository.Tag;
          const entity = yield* service.create({ name: "test", value: 42 });
          expect(entity.data.name).toBe("test");
          expect(entity.data.value).toBe(42);
          expect(entity.id).toBeDefined();
          expect(entity.createdAt).toBeDefined();
          expect(entity.updatedAt).toBeDefined();
          return entity;
        })
      );
    });
  });

  describe("findById", () => {
    it("should find an entity by id", async () => {
      await runTest(
        Effect.gen(function* (_) {
          const service = yield* repository.Tag;
          const created = yield* service.create({ name: "test", value: 42 });
          const found = yield* service.findById(created.id);
          expect(found._tag).toBe("Some");
          if (found._tag === "Some") {
            expect(found.value.id).toBe(created.id);
            expect(found.value.data.name).toBe("test");
          }
        })
      );
    });

    it("should return None for non-existent id", async () => {
      await runTest(
        Effect.gen(function* (_) {
          const service = yield* repository.Tag;
          const found = yield* service.findById("non-existent");
          expect(found._tag).toBe("None");
        })
      );
    });
  });

  describe("findMany", () => {
    it("should find entities matching filter", async () => {
      await runTest(
        Effect.gen(function* (_) {
          const service = yield* repository.Tag;
          yield* service.create({ name: "test1", value: 42 });
          yield* service.create({ name: "test2", value: 42 });
          yield* service.create({ name: "other", value: 24 });

          const found = yield* service.findMany({
            filter: { value: 42 },
          });

          expect(found.length).toBe(2);
          expect(found.every((e) => e.data.value === 42)).toBe(true);
        })
      );
    });

    it("should support pagination", async () => {
      await runTest(
        Effect.gen(function* (_) {
          const service = yield* repository.Tag;
          yield* service.create({ name: "test1", value: 42 });
          yield* service.create({ name: "test2", value: 42 });
          yield* service.create({ name: "test3", value: 42 });

          const page1 = yield* service.findMany({
            offset: 0,
            limit: 2,
          });

          const page2 = yield* service.findMany({
            offset: 2,
            limit: 2,
          });

          expect(page1.length).toBe(2);
          expect(page2.length).toBe(1);
        })
      );
    });
  });

  describe("update", () => {
    it("should update an existing entity", async () => {
      await runTest(
        Effect.gen(function* (_) {
          const service = yield* repository.Tag;
          const created = yield* service.create({ name: "test", value: 42 });
          // Add a small delay to ensure timestamp difference
          yield* Effect.sleep(1);
          const updated = yield* service.update(created.id, { value: 24 });
          expect(updated.data.name).toBe("test");
          expect(updated.data.value).toBe(24);
          expect(updated.updatedAt.getTime()).toBeGreaterThan(
            created.updatedAt.getTime()
          );
        })
      );
    });

    it("should fail when updating non-existent entity", async () => {
      const result = await runTest(
        Effect.gen(function* (_) {
          const service = yield* repository.Tag;
          return yield* Effect.either(
            service.update("non-existent", { value: 24 })
          );
        })
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(EntityNotFoundError);
      }
    });
  });

  describe("delete", () => {
    it("should delete an existing entity", async () => {
      await runTest(
        Effect.gen(function* (_) {
          const service = yield* repository.Tag;
          const created = yield* service.create({ name: "test", value: 42 });
          yield* service.delete(created.id);
          const found = yield* service.findById(created.id);
          expect(found._tag).toBe("None");
        })
      );
    });

    it("should fail when deleting non-existent entity", async () => {
      const result = await runTest(
        Effect.gen(function* (_) {
          const service = yield* repository.Tag;
          return yield* Effect.either(service.delete("non-existent"));
        })
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(EntityNotFoundError);
      }
    });
  });

  describe("count", () => {
    it("should count entities matching filter", async () => {
      await runTest(
        Effect.gen(function* (_) {
          const service = yield* repository.Tag;
          yield* service.create({ name: "test1", value: 42 });
          yield* service.create({ name: "test2", value: 42 });
          yield* service.create({ name: "other", value: 24 });

          const count = yield* service.count({
            filter: { value: 42 },
          });

          expect(count).toBe(2);
        })
      );
    });
  });
});
