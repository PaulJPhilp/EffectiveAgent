/**
 * @file Implements the drizzle-orm repository implementation
 * @module services/core/repository/implementations/drizzle/live
 */

import type { EntityId, JsonObject } from "@/types.js";
import { SQL, and, count, eq, sql } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";
import { v4 as uuidv4 } from "uuid";
import type { RepositoryServiceApi } from "../../api.js";
import { EntityNotFoundError, RepositoryError } from "../../errors.js";
import type { BaseEntity, FindOptions } from "../../types.js";
import type { DrizzleClientApi } from "./config.js";
import { DrizzleClient } from "./config.js";
import type { BaseModel, BaseTable } from "./schema.js";

/**
 * Creates a drizzle-orm repository implementation
 */
export function make<TData extends JsonObject, TEntity extends BaseEntity<TData>>(
    entityType: string,
    table: BaseTable<TData>
): Effect.Effect<RepositoryServiceApi<TEntity>, never, DrizzleClientApi> {
    return Effect.gen(function* () {
        const client = yield* DrizzleClient;
        const dbClient = yield* client.getClient();

        // Helper to convert drizzle model to entity
        const toEntity = (model: BaseModel<TData>): TEntity => {
            const entity: BaseEntity<TData> = {
                id: model.id,
                createdAt: new Date(model.createdAt),
                updatedAt: new Date(model.updatedAt),
                data: model.data
            };
            return entity as TEntity;
        };

        // Helper to build where clause from filter options
        const buildWhere = (options?: FindOptions<TEntity>) => {
            if (!options?.filter) return undefined;
            const conditions = Object.entries(options.filter).map(([key, value]) => {
                if (key === "id") return eq(table.id, value as string);
                if (key === "createdAt") return eq(table.createdAt, value as Date);
                if (key === "updatedAt") return eq(table.updatedAt, value as Date);
                // For data fields, use a raw SQL comparison
                return sql`${table.data}->>${key} = ${String(value)}`;
            }).filter((condition): condition is SQL<unknown> => condition !== undefined);
            return conditions.length > 1 ? and(...conditions) : conditions[0];
        };

        const create = (data: TData): Effect.Effect<TEntity, RepositoryError> =>
            Effect.tryPromise({
                try: (): Promise<BaseModel<TData>[]> => dbClient.insert(table).values({ id: uuidv4(), createdAt: sql`now()`, updatedAt: sql`now()`, data: data as any }).returning({
                    id: table.id,
                    createdAt: table.createdAt,
                    updatedAt: table.updatedAt,
                    data: table.data
                }),
                catch: (error: unknown) => {
                    if (error instanceof Error && error.message.includes("duplicate")) {
                        return new RepositoryError({
                            message: `Failed to create ${entityType}: duplicate entry`,
                            cause: error
                        });
                    }
                    return new RepositoryError({
                        message: `Failed to create ${entityType}`,
                        cause: error instanceof Error ? error : new Error(String(error))
                    });
                }
            }).pipe(Effect.map((results) => toEntity(results[0])));

        const findById = (id: EntityId): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
            Effect.tryPromise({
                try: (): Promise<BaseModel<TData>[]> => dbClient.select({
                    id: table.id,
                    createdAt: table.createdAt,
                    updatedAt: table.updatedAt,
                    data: table.data
                }).from(table).where(eq(table["id"], id)).limit(1),
                catch: (error: unknown) => new RepositoryError({
                    message: `Failed to find ${entityType} by ID ${id}`,
                    cause: error instanceof Error ? error : new Error(String(error))
                })
            }).pipe(
                Effect.map((results) => Option.fromNullable(results[0]).pipe(
                    Option.map(toEntity)
                ))
            );

        const findOne = (
            options?: FindOptions<TEntity>
        ): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
            Effect.tryPromise({
                try: (): Promise<BaseModel<TData>[]> => dbClient.select({
                    id: table.id,
                    createdAt: table.createdAt,
                    updatedAt: table.updatedAt,
                    data: table.data
                }).from(table).where(buildWhere(options)).limit(1).offset(options?.offset ?? 0),
                catch: (error: unknown) => new RepositoryError({
                    message: `Failed to find ${entityType}`,
                    cause: error instanceof Error ? error : new Error(String(error))
                })
            }).pipe(
                Effect.map((results) => Option.fromNullable(results[0]).pipe(
                    Option.map(toEntity)
                ))
            );

        const findMany = (
            options?: FindOptions<TEntity>
        ): Effect.Effect<ReadonlyArray<TEntity>, RepositoryError> =>
            Effect.tryPromise({
                try: (): Promise<BaseModel<TData>[]> => dbClient.select({
                    id: table.id,
                    createdAt: table.createdAt,
                    updatedAt: table.updatedAt,
                    data: table.data
                }).from(table).where(buildWhere(options)).limit(options?.limit ?? 100).offset(options?.offset ?? 0),
                catch: (error: unknown) => new RepositoryError({
                    message: `Failed to find many ${entityType}`,
                    cause: error instanceof Error ? error : new Error(String(error))
                })
            }).pipe(
                Effect.map((results) => results.map(toEntity))
            );

        const update = (
            id: EntityId,
            data: Partial<TData>
        ): Effect.Effect<TEntity, RepositoryError | EntityNotFoundError> =>
            Effect.gen(function* () {
                const existing = yield* findById(id);
                if (Option.isNone(existing)) {
                    return yield* Effect.fail(new EntityNotFoundError({
                        entityType,
                        entityId: id
                    }));
                }

                const results = yield* Effect.tryPromise({
                    try: (): Promise<BaseModel<TData>[]> => dbClient.update(table).set({
                        data: sql`${table["data"]} || ${JSON.stringify(data)}::jsonb`,
                        updatedAt: sql`now()`
                    }).where(eq(table["id"], id)).returning({
                        id: table.id,
                        createdAt: table.createdAt,
                        updatedAt: table.updatedAt,
                        data: table.data
                    }),
                    catch: (error: unknown) => new RepositoryError({
                        message: `Failed to update ${entityType} with ID ${id}`,
                        cause: error instanceof Error ? error : new Error(String(error))
                    })
                });

                return toEntity(results[0]);
            });

        const del = (id: EntityId): Effect.Effect<void, RepositoryError | EntityNotFoundError> =>
            Effect.tryPromise({
                try: (): Promise<BaseModel<TData>[]> => dbClient.delete(table).where(eq(table["id"], id)).returning({
                    id: table.id,
                    createdAt: table.createdAt,
                    updatedAt: table.updatedAt,
                    data: table.data
                }),
                catch: (error: unknown) => new RepositoryError({
                    message: `Failed to delete ${entityType} with ID ${id}`,
                    cause: error instanceof Error ? error : new Error(String(error))
                })
            }).pipe(
                Effect.flatMap((results) => {
                    if (results.length === 0) {
                        return Effect.fail(new EntityNotFoundError({
                            entityType,
                            entityId: id
                        }));
                    }
                    return Effect.succeed(undefined);
                })
            );

        const countEntities = (options?: Pick<FindOptions<TEntity>, "filter">): Effect.Effect<number, RepositoryError> =>
            Effect.tryPromise({
                try: (): Promise<any> => dbClient.select({ count: count(table.id) }).from(table).where(buildWhere(options)),
                catch: (error: unknown) => new RepositoryError({
                    message: `Failed to count ${entityType}`,
                    cause: error instanceof Error ? error : new Error(String(error))
                })
            }).pipe(
                Effect.map((results) => Number(results[0]?.count ?? 0))
            );

        return {
            create,
            findById,
            findOne,
            findMany,
            update,
            delete: del,
            count: countEntities
        };
    });
}

/**
 * Creates a layer for the drizzle repository implementation
 */
export function DrizzleRepositoryLiveLayer<TData extends JsonObject, TEntity extends BaseEntity<TData>>(
    entityType: string,
    table: BaseTable<TData>,
    Tag: Context.Tag<RepositoryServiceApi<TEntity>, RepositoryServiceApi<TEntity>>
): Layer.Layer<RepositoryServiceApi<TEntity>, never, DrizzleClientApi> {
    return Layer.effect(Tag, make(entityType, table));
}