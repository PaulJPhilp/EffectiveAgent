import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { type DrizzleTable, type DrizzleRow } from "./schema.js";
import { type JSONObject } from "../../../../../../src/types.js";
import { type BaseEntity, type IRepositoryService, type CreateEffect, type FindEffect, type DeleteEffect, type FindManyEffect, type UpdateEffect, type FindByIdCriteria } from "../../types/index.js";
import { DataValidationError, EntityNotFoundError, RepositoryError } from "../../errors/index.js";
import { BaseRepositoryService } from "../../base/base-repository-service.js";

/**
 * Configuration for DrizzleRepositoryService
 */
export interface DrizzleRepositoryConfig {
    /** The drizzle database instance */
    db: any;
    /** The drizzle table instance */
    table: DrizzleTable;
}

/**
 * Implementation of IRepositoryService using DrizzleORM.
 * 
 * Each entity type gets its own table with a standardized schema for:
 * - id: TEXT PRIMARY KEY
 * - data: TEXT (JSON string of entity data)
 * - createdAt: TEXT (ISO string)
 * - updatedAt: TEXT (ISO string)
 */
export class RepositoryServiceDrizzle extends BaseRepositoryService implements IRepositoryService<JSONObject> {
    private readonly db: any;
    private readonly table: DrizzleTable;

    constructor(config: DrizzleRepositoryConfig) {
        super();
        this.db = config.db;
        this.table = config.table;
    }

    create(data: JSONObject): CreateEffect<JSONObject> {
        const self = this;
        return Effect.gen(function* () {
            // Validate input data
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                return yield* Effect.fail(
                    new DataValidationError("Invalid data: must be a non-empty object")
                );
            }

            if (Object.keys(data).length === 0) {
                return yield* Effect.fail(
                    new DataValidationError("Invalid data: object must not be empty")
                );
            }

            const entity: BaseEntity<JSONObject> = {
                id: self.makeId(),
                data,
                metadata: self.createMetadata()
            };

            // Serialize entity for storage
            const serialized = yield* self.serializeEntity(entity);
            
            const row = {
                id: entity.id,
                data: serialized,
                createdAt: entity.metadata.createdAt,
                updatedAt: entity.metadata.updatedAt
            };

            yield* Effect.try(() => 
                self.db.insert(self.table).values(row).run()
            ).pipe(
                Effect.mapError((error) => 
                    new RepositoryError("Failed to create entity", { cause: error })
                )
            );

            return yield* Effect.succeed(entity);
        });
    }

    findById({ id }: FindByIdCriteria): FindEffect<JSONObject> {
        const self = this;
        return Effect.gen(function* () {
            const result = yield* Effect.try(() => 
                self.db.select().from(self.table).where(eq(self.table['id'], id)).get() as DrizzleRow | undefined
            ).pipe(
                Effect.mapError((error) => 
                    new RepositoryError("Failed to find entity", { cause: error })
                )
            );

            if (!result) {
                return yield* Effect.fail(
                    new EntityNotFoundError("Entity not found", { entityId: id })
                );
            }

            return yield* self.deserializeEntity(result['data']);
        });
    }

    find(criteria: Partial<JSONObject>): FindManyEffect<JSONObject> {
        const self = this;
        return Effect.gen(function* () {
            // Get all rows
            const rows = yield* Effect.try(() => 
                self.db.select().from(self.table).all() as DrizzleRow[]
            ).pipe(
                Effect.mapError((error) => 
                    new RepositoryError("Failed to find entities", { cause: error })
                )
            );

            // Deserialize all entities
            const entities = yield* Effect.forEach(rows, (row) => 
                self.deserializeEntity(row['data'])
            );

            // Filter by criteria if provided
            const filtered = Object.keys(criteria).length > 0
                ? entities.filter(entity => 
                    Object.entries(criteria).every(([key, value]) => 
                        entity.data[key] === value
                    )
                )
                : entities;

            return yield* Effect.succeed(filtered);
        });
    }

    update(id: string, data: Partial<JSONObject>): UpdateEffect<JSONObject> {
        const self = this;
        return Effect.gen(function* () {
            // First find the existing entity
            const existing = yield* self.findById({ id });

            // Validate update data
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                return yield* Effect.fail(
                    new DataValidationError("Invalid update data: must be an object")
                );
            }

            // Update the entity with current timestamp
            const updated: BaseEntity<JSONObject> = {
                id: existing.id,
                data: { ...existing.data, ...(data as JSONObject) },
                metadata: self.updateMetadata(existing.metadata)
            };

            // Serialize entity for storage
            const serialized = yield* self.serializeEntity(updated);
            
            // Store entity data and metadata
            const row = {
                id: updated.id,
                data: serialized,
                createdAt: updated.metadata.createdAt,
                updatedAt: updated.metadata.updatedAt
            };

            // Update in database
            yield* Effect.try(() => 
                self.db.update(self.table)
                    .set(row)
                    .where(eq(self.table['id'], id))
                    .run()
            ).pipe(
                Effect.mapError((error) => 
                    new RepositoryError("Failed to update entity", { cause: error })
                )
            );

            return yield* Effect.succeed(updated);
        });
    }

    delete(id: string): DeleteEffect {
        const self = this;
        return Effect.gen(function* () {
            // First check if entity exists
            const exists = yield* Effect.try(() => 
                self.db.select().from(self.table).where(eq(self.table['id'], id)).get()
            ).pipe(
                Effect.mapError((error) => 
                    new RepositoryError("Failed to check entity existence", { cause: error })
                )
            );

            if (!exists) {
                return yield* Effect.fail(
                    new EntityNotFoundError("Entity not found", { entityId: id })
                );
            }

            yield* Effect.try(() => 
                self.db.delete(self.table).where(eq(self.table['id'], id)).run()
            ).pipe(
                Effect.mapError((error) => 
                    new RepositoryError("Failed to delete entity", { cause: error })
                )
            );

            return yield* Effect.succeed(undefined);
        });
    }
}