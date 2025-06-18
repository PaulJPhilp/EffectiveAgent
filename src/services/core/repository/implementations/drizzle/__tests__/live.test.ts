import { Effect, Option } from "effect";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it
} from "vitest";

import { make } from "../repository.js";
import type { BaseEntity } from "../../../types.js";
import { EntityNotFoundError } from "../../../errors.js";
import {
  cleanTestTable,
  createTestTable,
  dropTestTable,
  testTable,
  TestEntityData,
  withTestDatabase
} from "./test-config.js";

/* ---------------------------------------------------------------------------
 * Types
 * --------------------------------------------------------------------------*/

type TestEntity = BaseEntity<TestEntityData>;

/* ---------------------------------------------------------------------------
 * Constants
 * --------------------------------------------------------------------------*/

const TEST_TABLE = "test_entities";

/* ---------------------------------------------------------------------------
 * Helper
 * --------------------------------------------------------------------------*/

const createRepo = () =>
  make<TestEntityData, TestEntity>("test", testTable);

/* ---------------------------------------------------------------------------
 * Suite
 * --------------------------------------------------------------------------*/

describe("DrizzleRepository (integration)", () => {
  /* Setup ------------------------------------------------------------------*/
  beforeAll(() =>
    Effect.runPromise(withTestDatabase(createTestTable(TEST_TABLE)))
  );

  afterEach(() =>
    Effect.runPromise(withTestDatabase(cleanTestTable(TEST_TABLE)))
  );

  afterAll(() =>
    Effect.runPromise(withTestDatabase(dropTestTable(TEST_TABLE)))
  );

  /* Tests ------------------------------------------------------------------*/

  it("creates an entity", () =>
    Effect.runPromise(
      withTestDatabase(
        Effect.gen(function* () {
          const repo = createRepo();
          const created = yield* repo.create({ name: "a", value: 1 });

          expect(created.id).toBeDefined();
          expect(created.data).toEqual({ name: "a", value: 1 });
          expect(created.createdAt).toBeInstanceOf(Date);
          expect(created.updatedAt).toBeInstanceOf(Date);
        })
      )
    ));

  it("finds by id", () =>
    Effect.runPromise(
      withTestDatabase(
        Effect.gen(function* () {
          const repo = createRepo();
          const created = yield* repo.create({ name: "b", value: 2 });
          const found = yield* repo.findById(created.id);

          expect(Option.isSome(found)).toBe(true);
          expect(Option.getOrNull(found)).toEqual(created);
        })
      )
    ));

  it("finds many", () =>
    Effect.runPromise(
      withTestDatabase(
        Effect.gen(function* () {
          const repo = createRepo();
          const e1 = yield* repo.create({ name: "c1", value: 3 });
          const e2 = yield* repo.create({ name: "c2", value: 4 });

          const list = yield* repo.findMany();
          expect(list).toEqual([e1, e2]);
        })
      )
    ));

  it("updates an entity", () =>
    Effect.runPromise(
      withTestDatabase(
        Effect.gen(function* () {
          const repo = createRepo();
          const created = yield* repo.create({ name: "d", value: 5 });
          const updated = yield* repo.update(created.id, {
            name: "d+",
            value: 6
          });

          expect(updated.id).toBe(created.id);
          expect(updated.data).toEqual({ name: "d+", value: 6 });
          expect(updated.updatedAt.getTime()).toBeGreaterThan(
            created.updatedAt.getTime()
          );
        })
      )
    ));

  it("deletes an entity", () =>
    Effect.runPromise(
      withTestDatabase(
        Effect.gen(function* () {
          const repo = createRepo();
          const created = yield* repo.create({ name: "e", value: 7 });
          yield* repo.delete(created.id);
          const found = yield* repo.findById(created.id);
          expect(Option.isNone(found)).toBe(true);
        })
      )
    ));

  it("counts entities", () =>
    Effect.runPromise(
      withTestDatabase(
        Effect.gen(function* () {
          const repo = createRepo();
          yield* repo.create({ name: "f1", value: 8 });
          yield* repo.create({ name: "f2", value: 9 });
          const cnt = yield* repo.count();
          expect(cnt).toBe(2);
        })
      )
    ));

  it("fails to update non-existent", () =>
    Effect.runPromise(
      withTestDatabase(
        Effect.gen(function* () {
          const repo = createRepo();
          const result = yield* Effect.either(
            repo.update("missing-id", { name: "x" })
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(EntityNotFoundError);
          }
        })
      )
    ));

  /* -----------------------------------------------------------------------
   * Additional edge-case coverage
   * ---------------------------------------------------------------------*/

  it("findMany with filter returns only matches", () =>
    Effect.runPromise(
      withTestDatabase(
        Effect.gen(function* () {
          const repo = createRepo();
          const e1 = yield* repo.create({ name: "f", value: 1 });
          yield* repo.create({ name: "g", value: 2 });

          const list = yield* repo.findMany({ filter: { name: "f" } });
          expect(list).toEqual([e1]);
        })
      )
    ));

  it("count with filter counts only matching rows", () =>
    Effect.runPromise(
      withTestDatabase(
        Effect.gen(function* () {
          const repo = createRepo();
          yield* repo.create({ name: "h", value: 1 });
          yield* repo.create({ name: "h", value: 2 });
          yield* repo.create({ name: "i", value: 3 });

          const cnt = yield* repo.count({ filter: { name: "h" } });
          expect(cnt).toBe(2);
        })
      )
    ));

  it("findOne returns some/none correctly", () =>
    Effect.runPromise(
      withTestDatabase(
        Effect.gen(function* () {
          const repo = createRepo();
          const created = yield* repo.create({ name: "j", value: 5 });
          const some = yield* repo.findOne({ filter: { name: "j" } });
          const none = yield* repo.findOne({ filter: { name: "zzz" } });

          expect(Option.isSome(some)).toBe(true);
          expect(Option.getOrNull(some)).toEqual(created);
          expect(Option.isNone(none)).toBe(true);
        })
      )
    ));

  it("parallel create generates unique ids", () =>
    Effect.runPromise(
      withTestDatabase(
        Effect.gen(function* () {
          const repo = createRepo();
          const inputs = Array.from({ length: 50 }, (_, i) => ({
            name: `p${i}`,
            value: i
          }));
          const created = yield* Effect.forEach(inputs, repo.create, {
            concurrency: 10
          });
          const ids = created.map((e) => e.id);
          expect(new Set(ids).size).toBe(inputs.length);
        })
      )
    ));

  it("updatedAt increases on successive updates", () =>
    Effect.runPromise(
      withTestDatabase(
        Effect.gen(function* () {
          const repo = createRepo();
          const created = yield* repo.create({ name: "q", value: 1 });
          const first = yield* repo.update(created.id, { value: 2 });
          const second = yield* repo.update(created.id, { value: 3 });
          expect(second.updatedAt.getTime()).toBeGreaterThan(
            first.updatedAt.getTime()
          );
        })
      )
    ));
});
