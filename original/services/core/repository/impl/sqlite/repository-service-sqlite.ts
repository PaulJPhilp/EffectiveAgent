import { Effect } from "effect"
import { Database } from "bun:sqlite"
import { DataValidationError, EntityNotFoundError, RepositoryError } from "../../errors/index.js"
import { type BaseEntity } from "../../types/entities/base-entity.js"
import { type JSONValue } from "../../../../../../src/types.js"
import { type IRepositoryService, type CreateEffect, type FindEffect, type DeleteEffect, type FindManyEffect, type UpdateEffect, type FindByIdCriteria } from "../../types/repository-service.js"
import { BaseRepositoryService } from "../../base/base-repository-service.js"

/**
 * Implementation of IRepositoryService using Bun's SQLite database.
 * 
 * Each entity type gets its own table with the following schema:
 * - id: TEXT PRIMARY KEY
 * - data: TEXT (JSON string of entity data)
 * - createdAt: TEXT (ISO string)
 * - updatedAt: TEXT (ISO string)
 */
export class RepositoryServiceSQLite extends BaseRepositoryService implements IRepositoryService<Record<string, JSONValue>> {
    private readonly type: string
    private readonly db: Database
    private readonly collections = new Map<string, boolean>()

    constructor(dbPath?: string) {
        super();
        this.db = new Database(dbPath ?? ":memory:")
        this.type = this.constructor.name
    }

    private ensureCollection(this: RepositoryServiceSQLite, entity: BaseEntity<Record<string, JSONValue>>): Effect.Effect<void, RepositoryError> {
        const self = this
        return Effect.try({
            try: () => {
                const type = entity.constructor.name
                if (!self.collections.has(type)) {
                    self.db.run(`CREATE TABLE IF NOT EXISTS ${type} (
                        id TEXT PRIMARY KEY,
                        data TEXT NOT NULL,
                        createdAt TEXT NOT NULL,
                        updatedAt TEXT NOT NULL
                    )`)
                    self.collections.set(type, true)
                }
            },
            catch: (error) => new RepositoryError("Failed to create collection", { cause: error })
        })
    }

    create(data: Record<string, JSONValue>): CreateEffect<Record<string, JSONValue>> {
        const self = this
        return Effect.gen(function* () {
            const entity: BaseEntity<Record<string, JSONValue>> = {
                id: self.makeId(),
                data,
                metadata: self.createMetadata()
            }

            yield* self.ensureCollection(entity)
            
            yield* Effect.try({
                try: () => {
                    const type = entity.constructor.name
                    self.db.prepare(`INSERT INTO ${type} (id, data, createdAt, updatedAt) VALUES (?, ?, ?, ?)`)
                        .run(
                            entity.id,
                            JSON.stringify(data),
                            entity.metadata.createdAt,
                            entity.metadata.updatedAt
                        )
                    return entity
                },
                catch: (error) => new RepositoryError("Failed to create entity", { cause: error })
            })

            return entity
        })
    }

    findById({ id }: FindByIdCriteria): FindEffect<Record<string, JSONValue>> {
        const self = this
        return Effect.gen(function* () {
            const result = yield* Effect.try({
                try: () => {
                    const type = self.type
                    const row = self.db.prepare(`SELECT * FROM ${type} WHERE id = ?`).get(id) as { id: string; data: string; createdAt: string; updatedAt: string } | undefined
                    if (!row) {
                        throw new EntityNotFoundError("Entity not found", { entityId: id })
                    }
                    const data = JSON.parse(row.data)
                    return {
                        id: row.id,
                        data: JSON.parse(row.data),
                        metadata: {
                            createdAt: row.createdAt,
                            updatedAt: row.updatedAt
                        }
                    } as BaseEntity<Record<string, JSONValue>>
                },
                catch: (error) => {
                    if (error instanceof EntityNotFoundError) {
                        return error
                    }
                    return new RepositoryError("Failed to find entity", { cause: error })
                }
            })

            return result
        })
    }

    find(criteria: Partial<Record<string, JSONValue>>): FindManyEffect<Record<string, JSONValue>> {
        const self = this
        return Effect.gen(function* () {
            const results = yield* Effect.try({
                try: () => {
                    const type = self.type
                    const rows = self.db.prepare(`SELECT * FROM ${type}`).all() as Array<{ id: string; data: string; createdAt: string; updatedAt: string }>
                    return rows
                        .map(row => {
                            const data = JSON.parse(row.data)
                            const entity: BaseEntity<Record<string, JSONValue>> = {
                                id: row.id,
                                data,
                                metadata: {
                                    createdAt: row.createdAt,
                                    updatedAt: row.updatedAt
                                }
                            }
                            return entity
                        })
                        .filter(entity => {
                            return Object.entries(criteria).every(([key, value]) => 
                                entity.data[key] === value
                            )
                        })
                },
                catch: (error) => new RepositoryError("Failed to find entities", { cause: error })
            })

            return results
        })
    }

    update(id: string, data: Partial<Record<string, JSONValue>>): UpdateEffect<Record<string, JSONValue>> {
        const self = this
        return Effect.gen(function* () {
            const existing = yield* self.findById({ id })
            const updated: BaseEntity<Record<string, JSONValue>> = {
                id: existing.id,
                data: { ...existing.data, ...(data as Record<string, JSONValue>) },
                metadata: self.updateMetadata(existing.metadata)
            }

            yield* Effect.try({
                try: () => {
                    const type = self.type
                    const result = self.db.prepare(`UPDATE ${type} SET data = ?, updatedAt = ? WHERE id = ?`)
                        .run(
                            JSON.stringify(updated.data),
                            updated.metadata.updatedAt,
                            id
                        )
                    if (result.changes === 0) {
                        throw new EntityNotFoundError("Entity not found", { entityId: id })
                    }
                },
                catch: (error) => {
                    if (error instanceof EntityNotFoundError) {
                        return error
                    }
                    return new RepositoryError("Failed to update entity", { cause: error })
                }
            })

            return updated
        })
    }

    delete(id: string): DeleteEffect {
        const self = this
        return Effect.gen(function* () {
            yield* Effect.try({
                try: () => {
                    const type = self.type
                    const result = self.db.prepare(`DELETE FROM ${type} WHERE id = ?`).run(id)
                    if (result.changes === 0) {
                        throw new EntityNotFoundError("Entity not found", { entityId: id })
                    }
                },
                catch: (error) => {
                    if (error instanceof EntityNotFoundError) {
                        return error
                    }
                    return new RepositoryError("Failed to delete entity", { cause: error })
                }
            })
        })
    }
}
