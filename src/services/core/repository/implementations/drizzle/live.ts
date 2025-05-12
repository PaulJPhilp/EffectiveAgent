/**
 * @file Implements the drizzle-orm repository implementation
 * @module services/core/repository/implementations/drizzle/live
 */

import { SQL, and, eq, sql } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";
import { v4 as uuidv4 } from "uuid";
import { DuplicateEntryError, EntityNotFoundError, RepositoryError } from "../../errors.js";
import type { BaseEntity, FindOptions } from "../../types.js";
import { DrizzleClient } from "./config.js";

/**
 * Creates a drizzle-orm repository implementation
 */
export function make<TData extends JsonObject, TEntity extends BaseEntity<TData>>(
    entityType: string,
    table: BaseTable<TData>
): Effect.Effect<RepositoryApi<TEntity>, never, DrizzleClient> {
    return Effect.gen(function* () {
        const client = yield* DrizzleClient;

        // Helper to convert drizzle model to entity
        const toEntity = (model: BaseModel<TData>): TEntity => {
            const entity: BaseEntity<TData> = {
                id: model.id,
                createdAt: new Date(model.createdAt).getTime(),
                updatedAt: new Date(model.updatedAt).getTime(),
                data: model.data
            };
            return entity as TEntity;
        };

        // Helper to build where clause from filter options
        const buildWhere = (options?: FindOptions<TEntity>) => {
            if (!options?.filter) return undefined;
            const conditions = Object.entries(options.filter).map(([key, value]) => {
                if (key === "id") return eq(table["id"], value);
                if (key === "createdAt") return eq(table["createdAt"], value);
                if (key === "updatedAt") return eq(table["updatedAt"], value);
                // For data fields, we need to check the jsonb data column
                return eq(sql`${table["data"]}->>${key}`, String(value));
            }).filter((condition): condition is SQL<unknown> => condition !== undefined);
            return conditions.length > 1 ? and(...conditions) : conditions[0];
        };

        const create = (data: TData): Effect.Effect<TEntity, RepositoryError> =>
            Effect.gen(function* () {
                const result = yield* Effect.promise(() =>
                    client
                        .insert(table)
                        .values({
                            id: uuidv4(),
                            createdAt: sql`now()`,
                            updatedAt: sql`now()`,
                            data: data as any
                        })
                        .returning()
                ).pipe(
                    Effect.map(([result]) => toEntity(result as unknown as BaseModel<TData>)),
                    Effect.catchAll((error) => {
                        if (error instanceof Error && error.message.includes("duplicate")) {
                            return Effect.fail(new DuplicateEntryError({
                                entityType,
                                conflictingField: "id",
                                conflictingValue: "unknown"
                            }));
                        }
                        return Effect.fail(new RepositoryError({
                            message: `Failed to create ${entityType}`,
                            cause: error instanceof Error ? error : new Error(String(error))
                        }));
                    })
                );
                return result;
            });

        const findById = (id: EntityId): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
            Effect.promise(() =>
                client.select().from(table).where(eq(table["id"], id)).limit(1)
            ).pipe(
                Effect.map(([result]) => Option.fromNullable(result as unknown as BaseModel<TData>).pipe(
                    Option.map(toEntity)
                )),
                Effect.catchAll((error) => Effect.fail(new RepositoryError({
                    message: `Failed to find ${entityType} by ID ${id}`,
                    cause: error instanceof Error ? error : new Error(String(error))
                })))
            );

        const findOne = (
            options?: FindOptions<TEntity>
        ): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
            Effect.gen(function* () {
                const where = buildWhere(options);
                return yield* Effect.promise(() =>
                    client
                        .select()
                        .from(table)
                        .where(where)
                        .limit(1)
                        .offset(options?.offset ?? 0)
                ).pipe(
                    Effect.map(([result]) => Option.fromNullable(result as unknown as BaseModel<TData>).pipe(
                        Option.map(toEntity)
                    )),
                    Effect.catchAll((error) => Effect.fail(new RepositoryError({
                        message: `Failed to find ${entityType}`,
                        cause: error instanceof Error ? error : new Error(String(error))
                    })))
                );
            });

        const findMany = (
            options?: FindOptions<TEntity>
        ): Effect.Effect<ReadonlyArray<TEntity>, RepositoryError> =>
            Effect.gen(function* () {
                const where = buildWhere(options);
                return yield* Effect.promise(() =>
                    client
                        .select()
                        .from(table)
                        .where(where)
                        .limit(options?.limit ?? 100)
                        .offset(options?.offset ?? 0)
                ).pipe(
                    Effect.map((results) => (results as unknown as BaseModel<TData>[]).map(toEntity)),
                    Effect.catchAll((error) => Effect.fail(new RepositoryError({
                        message: `Failed to find many ${entityType}`,
                        cause: error instanceof Error ? error : new Error(String(error))
                    })))
                );
            });

        const update = (
            id: EntityId,
            data: Partial<TData>
        ): Effect.Effect<TEntity, RepositoryError | EntityNotFoundError> =>
            Effect.gen(function* () {
                // First check if the entity exists
                const [result] = yield* Effect.promise(() =>
                    client
                        .select({ count: sql`count(*)`.mapWith(Number).as("count") })
                        .from(table)
                        .where(eq(table["id"], id))
                        .execute()
                ).pipe(
                    Effect.mapError((error: unknown) => new RepositoryError({
                        message: `Failed to check existence of ${entityType} with ID ${id}`,
                        cause: error instanceof Error ? error : new Error(String(error))
                    }))
                );

                if (result.count === 0) {
                    return yield* Effect.fail(new EntityNotFoundError({
                        entityType,
                        entityId: id
                    }));
                }

                // Then perform the update
                const [updated] = yield* Effect.promise(() =>
                    client
                        .update(table)
                        .set({
                            data: sql`${table["data"]} || ${JSON.stringify(data)}::jsonb`,
                            updatedAt: sql`now()`
                        })
                        .where(eq(table["id"], id))
                        .returning()
                        .execute()
                ).pipe(
                    Effect.mapError((error: unknown) => new RepositoryError({
                        message: `Failed to update ${entityType} with ID ${id}`,
                        cause: error instanceof Error ? error : new Error(String(error))
                    }))
                );

                return toEntity(updated as unknown as BaseModel<TData>);
            });

        const del = (id: EntityId): Effect.Effect<void, RepositoryError | EntityNotFoundError> =>
            Effect.promise(() =>
                client.delete(table).where(eq(table["id"], id)).returning()
            ).pipe(
                Effect.map(([result]) => {
                    if (!result) {
                        return Effect.fail(new EntityNotFoundError({
                            entityType,
                            entityId: id
                        }));
                    }
                    return Effect.succeed(undefined);
                }),
                Effect.catchAll((error) => Effect.fail(new RepositoryError({
                    message: `Failed to delete ${entityType} with ID ${id}`,
                    cause: error instanceof Error ? error : new Error(String(error))
                })))
            );

        const count = (options?: FindOptions<TEntity>): Effect.Effect<number, RepositoryError> =>
            Effect.gen(function* () {
                const where = buildWhere(options);
                return yield* Effect.promise(() =>
                    client.select({ count: sql`count(${table["id"]})` }).from(table).where(where)
                ).pipe(
                    Effect.map(([result]) => Number(result.count)),
                    Effect.catchAll((error) => Effect.fail(new RepositoryError({
                        message: `Failed to count ${entityType}`,
                        cause: error instanceof Error ? error : new Error(String(error))
                    })))
                );
            });

        return {
            create,
            findById,
            findOne,
            findMany,
            update,
            delete: del,
            count
        } as RepositoryApi<TEntity>;
    });
}

/**
 * Creates a layer that provides the drizzle-orm repository implementation
 */
export function DrizzleRepositoryLiveLayer<TData extends JsonObject, TEntity extends BaseEntity<TData>>(
    entityType: string,
    table: BaseTable<TData>,
    Tag: Context.Tag<RepositoryApi<TEntity>, RepositoryApi<TEntity>>
): Layer.Layer<RepositoryApi<TEntity>, never, DrizzleClient> {
    return Layer.effect(Tag, make(entityType, table));
} 