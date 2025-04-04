import { Effect, pipe, Either } from "effect"
import { describe, expect, it } from "vitest"
import { DataValidationError, EntityNotFoundError, RepositoryError } from "../../../errors/index.js"
import { type JSONObject } from "../../../../../../../src/types.js"
import { type IRepositoryService } from "../../../types/repository-service.js"
import { RepositoryService } from "../../../types/repository-service.js"
import { RepositoryServiceSQLite } from "../repository-service-sqlite.js"

const testData: JSONObject = {
    name: "test",
    value: 42
}

const createTestData = (name: string, value: number): JSONObject => ({ name, value })

// Helper to run tests with repository service
const runTest = <T>(effect: Effect.Effect<T, RepositoryError | EntityNotFoundError | DataValidationError, IRepositoryService<JSONObject>>) =>
    pipe(
        effect,
        Effect.provideService(RepositoryService, new RepositoryServiceSQLite())
    )

describe("RepositoryServiceSqlite", () => {
    describe("create", () => {
        it("should create an entity with generated id and timestamps", () =>
            runTest(
                Effect.gen(function* () {
                    const service = yield* RepositoryService
                    const entity = yield* service.create(testData)
                    
                    expect(entity).toEqual({
                        id: expect.any(String),
                        data: testData,
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
                    const created = yield* service.create(testData)
                    const result = yield* Effect.either(service.findById({ id: created.id }))
                    
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
                    const result = yield* Effect.either(service.findById({ id: "not-found" }))
                    
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
                    yield* service.create(createTestData("test1", 42))
                    yield* service.create(createTestData("test2", 42))
                    yield* service.create(createTestData("test3", 43))

                    const results = yield* service.find({ value: 42 })
                    expect(results).toHaveLength(2)
                    expect(results.every(e => e.data && typeof e.data === 'object' && 'value' in e.data && e.data.value === 42)).toBe(true)
                })
            ))
    })

    describe("update", () => {
        it("should update entity", () =>
            runTest(
                Effect.gen(function* () {
                    const service = yield* RepositoryService
                    const created = yield* service.create(testData)
                    const result = yield* Effect.either(service.update(created.id, { value: 43 }))
                    
                    expect(Either.isRight(result)).toBe(true)
                    if (Either.isRight(result)) {
                        expect(result.right).toEqual({
                            id: created.id,
                            data: { ...created.data, value: 43 },
                            metadata: {
                                createdAt: created.metadata.createdAt,
                                updatedAt: expect.any(String)
                            }
                        })
                    }
                })
            ))

        it("should throw EntityNotFoundError when updating non-existent entity", () =>
            runTest(
                Effect.gen(function* () {
                    const service = yield* RepositoryService
                    const result = yield* Effect.either(service.update("non-existent", { value: 43 }))
                    
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
                    const created = yield* service.create(testData)
                    const deleteResult = yield* Effect.either(service.delete(created.id))
                    
                    expect(Either.isRight(deleteResult)).toBe(true)
                    const findResult = yield* Effect.either(service.findById({ id: created.id }))
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
