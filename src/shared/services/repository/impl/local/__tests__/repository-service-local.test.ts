import { Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { EntityNotFoundError } from "../../../errors/index.js"
import { type BaseEntity } from "../../../types/entities/base-entity.js"
import { RepositoryService } from "../../../types/repository-service.js"
import { RepositoryServiceLocal, RepositoryServiceLocalLayer } from "../repository-service-local.js"

// Test entity type
interface TestEntity extends BaseEntity {
    name: string
    value: number
}

describe("RepositoryServiceLocal", () => {
    let repository: RepositoryServiceLocal

    beforeEach(() => {
        repository = new RepositoryServiceLocal()
    })

    describe("create", () => {
        it("should create an entity with generated id and timestamps", async () => {
            const data = { name: "test", value: 42 }
            const program = Effect.gen(function* (_) {
                const service = yield* _(RepositoryService)
                const entity = yield* _(service.create<TestEntity>(data))
                return entity
            })

            const entity = await Effect.runPromise(
                Effect.provide(program, RepositoryServiceLocalLayer)
            )

            expect(entity).toEqual({
                ...data,
                id: expect.any(String),
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date)
            })
        })
    })

    describe("findById", () => {
        it("should find an entity by id", async () => {
            const data = { name: "test", value: 42 }
            const program = Effect.gen(function* (_) {
                const service = yield* _(RepositoryService)
                const created = yield* _(service.create<TestEntity>(data))
                const found = yield* _(service.findById<TestEntity>({ id: created.id }))
                return { created, found }
            })

            const { created, found } = await Effect.runPromise(
                Effect.provide(program, RepositoryServiceLocalLayer)
            )

            expect(found).toEqual(created)
        })

        it("should throw EntityNotFoundError for non-existent id", async () => {
            const program = Effect.gen(function* (_) {
                const service = yield* _(RepositoryService)
                return yield* _(service.findById<TestEntity>({ id: "non-existent" }))
            })

            await expect(
                Effect.runPromise(Effect.provide(program, RepositoryServiceLocalLayer))
            ).rejects.toThrow(EntityNotFoundError)
        })
    })

    describe("find", () => {
        it("should find entities matching criteria", async () => {
            const data1 = { name: "test1", value: 42 }
            const data2 = { name: "test2", value: 42 }
            const data3 = { name: "test3", value: 43 }

            const program = Effect.gen(function* (_) {
                const service = yield* _(RepositoryService)
                const entity1 = yield* _(service.create<TestEntity>(data1))
                const entity2 = yield* _(service.create<TestEntity>(data2))
                yield* _(service.create<TestEntity>(data3))

                const found = yield* _(service.find<TestEntity>({ value: 42 }))
                return { entity1, entity2, found }
            })

            const { entity1, entity2, found } = await Effect.runPromise(
                Effect.provide(program, RepositoryServiceLocalLayer)
            )

            expect(found).toHaveLength(2)
            expect(found).toEqual(expect.arrayContaining([entity1, entity2]))
        })

        it("should return empty array when no entities match criteria", async () => {
            const program = Effect.gen(function* (_) {
                const service = yield* _(RepositoryService)
                const found = yield* _(service.find<TestEntity>({ value: 999 }))
                return found
            })

            const found = await Effect.runPromise(
                Effect.provide(program, RepositoryServiceLocalLayer)
            )

            expect(found).toEqual([])
        })
    })

    describe("update", () => {
        it("should update an existing entity", async () => {
            const data = { name: "test", value: 42 }
            const program = Effect.gen(function* (_) {
                const service = yield* _(RepositoryService)
                const created = yield* _(service.create<TestEntity>(data))
                const updated = yield* _(service.update<TestEntity>(created.id, { value: 43 }))
                return { created, updated }
            })

            const { created, updated } = await Effect.runPromise(
                Effect.provide(program, RepositoryServiceLocalLayer)
            )

            expect(updated).toEqual({
                ...created,
                value: 43,
                updatedAt: expect.any(Date)
            })
            expect(updated.updatedAt > created.updatedAt).toBe(true)
        })

        it("should throw EntityNotFoundError when updating non-existent entity", async () => {
            const program = Effect.gen(function* (_) {
                const service = yield* _(RepositoryService)
                return yield* _(service.update<TestEntity>("non-existent", { value: 43 }))
            })

            await expect(
                Effect.runPromise(Effect.provide(program, RepositoryServiceLocalLayer))
            ).rejects.toThrow(EntityNotFoundError)
        })
    })

    describe("delete", () => {
        it("should delete an existing entity", async () => {
            const data = { name: "test", value: 42 }
            const program = Effect.gen(function* (_) {
                const service = yield* _(RepositoryService)
                const created = yield* _(service.create<TestEntity>(data))
                yield* _(service.delete(created.id))
                return created.id
            })

            const deletedId = await Effect.runPromise(
                Effect.provide(program, RepositoryServiceLocalLayer)
            )

            // Verify the entity is deleted
            const verifyProgram = Effect.gen(function* (_) {
                const service = yield* _(RepositoryService)
                return yield* _(service.findById<TestEntity>({ id: deletedId }))
            })

            await expect(
                Effect.runPromise(Effect.provide(verifyProgram, RepositoryServiceLocalLayer))
            ).rejects.toThrow(EntityNotFoundError)
        })

        it("should throw EntityNotFoundError when deleting non-existent entity", async () => {
            const program = Effect.gen(function* (_) {
                const service = yield* _(RepositoryService)
                return yield* _(service.delete("non-existent"))
            })

            await expect(
                Effect.runPromise(Effect.provide(program, RepositoryServiceLocalLayer))
            ).rejects.toThrow(EntityNotFoundError)
        })
    })
}) 