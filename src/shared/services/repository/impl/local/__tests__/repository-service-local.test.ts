import { Effect, pipe, Either } from "effect"
import { describe, expect, it } from "vitest"
import { DataValidationError, EntityNotFoundError, RepositoryError } from "../../../errors/index.js"
import { type BaseEntity } from "../../../types/entities/base-entity.js"
import { type IRepositoryService } from "../../../types/repository-service.js"
import { RepositoryService } from "../../../types/repository-service.js"
import { RepositoryServiceLocal } from "../repository-service-local.js"

// Test entity type
interface TestEntity extends BaseEntity {
    readonly name: string
    readonly value: number
}

// Test data and helpers
const TestData = { name: "test", value: 42 } as const
const createTestEntity = (name: string, value: number) => ({ name, value })

// Helper to run tests with repository service
const runTest = <T>(effect: Effect.Effect<T, RepositoryError | EntityNotFoundError | DataValidationError, IRepositoryService>) =>
    pipe(
        effect,
        Effect.provideService(RepositoryService, new RepositoryServiceLocal())
    )

describe("RepositoryServiceLocal", () => {
    describe("create", () => {
        it("should create an entity with generated id and timestamps", () =>
            runTest(
                Effect.gen(function* () {
                    const service = yield* RepositoryService
                    const entity = yield* service.create<TestEntity>(TestData)
                    
                    expect(entity).toEqual({
                        ...TestData,
                        id: expect.any(String),
                        createdAt: expect.any(Date),
                        updatedAt: expect.any(Date)
                    })
                })
            ))
    })

    describe("findById", () => {
        it("should find entity by id", () =>
            runTest(
                Effect.gen(function* () {
                    const service = yield* RepositoryService
                    const created = yield* service.create<TestEntity>(TestData)
                    const result = yield* Effect.either(service.findById<TestEntity>({ id: created.id }))
                    
                    expect(Either.isRight(result)).toBe(true)
                    if (Either.isRight(result)) {
                        expect(result.right).toEqual(created)
                    }
                })
            ))

        it("should throw EntityNotFoundError when entity not found", () =>
            runTest(
                Effect.gen(function* () {
                    const service = yield* RepositoryService
                    const result = yield* Effect.either(service.findById<TestEntity>({ id: "not-found" }))
                    
                    expect(Either.isLeft(result)).toBe(true)
                    if (Either.isLeft(result)) {
                        expect(result.left).toBeInstanceOf(EntityNotFoundError)
                    }
                })
            ))
    })

    describe("find", () => {
        it("should find entities by criteria", () =>
            runTest(
                Effect.gen(function* () {
                    const service = yield* RepositoryService
                    yield* service.create<TestEntity>(createTestEntity("test1", 42))
                    yield* service.create<TestEntity>(createTestEntity("test2", 42))
                    yield* service.create<TestEntity>(createTestEntity("test3", 43))
                    const found = yield* service.find<TestEntity>({ value: 42 })
                    
                    expect(found).toHaveLength(2)
                    expect(found).toEqual([
                        expect.objectContaining({ name: "test1", value: 42 }),
                        expect.objectContaining({ name: "test2", value: 42 })
                    ])
                })
            ))
    })

    describe("update", () => {
        it("should update entity", () =>
            runTest(
                Effect.gen(function* () {
                    const service = yield* RepositoryService
                    const created = yield* service.create<TestEntity>(TestData)
                    const result = yield* Effect.either(service.update<TestEntity>(created.id, { value: 43 }))
                    
                    expect(Either.isRight(result)).toBe(true)
                    if (Either.isRight(result)) {
                        expect(result.right).toEqual({
                            ...created,
                            value: 43,
                            updatedAt: expect.any(Date)
                        })
                    }
                })
            ))

        it("should throw EntityNotFoundError when updating non-existent entity", () =>
            runTest(
                Effect.gen(function* () {
                    const service = yield* RepositoryService
                    const result = yield* Effect.either(service.update<TestEntity>("non-existent", { value: 43 }))
                    
                    expect(Either.isLeft(result)).toBe(true)
                    if (Either.isLeft(result)) {
                        expect(result.left).toBeInstanceOf(EntityNotFoundError)
                    }
                })
            ))
    })

    describe("delete", () => {
        it("should delete entity", () =>
            runTest(
                Effect.gen(function* () {
                    const service = yield* RepositoryService
                    const created = yield* service.create<TestEntity>(TestData)
                    const deleteResult = yield* Effect.either(service.delete(created.id))
                    
                    expect(Either.isRight(deleteResult)).toBe(true)
                    
                    const findResult = yield* Effect.either(service.findById<TestEntity>({ id: created.id }))
                    expect(Either.isLeft(findResult)).toBe(true)
                    if (Either.isLeft(findResult)) {
                        expect(findResult.left).toBeInstanceOf(EntityNotFoundError)
                    }
                })
            ))

        it("should throw EntityNotFoundError when deleting non-existent entity", () =>
            runTest(
                Effect.gen(function* () {
                    const service = yield* RepositoryService
                    const result = yield* Effect.either(service.delete("non-existent"))
                    
                    expect(Either.isLeft(result)).toBe(true)
                    if (Either.isLeft(result)) {
                        expect(result.left).toBeInstanceOf(EntityNotFoundError)
                    }
                })
            ))
    })
})