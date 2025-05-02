import { Context, Effect, Layer, Option } from "effect";
import { eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgColumn, PgTable, PgTableWithColumns, TableConfig } from "drizzle-orm/pg-core";
import { v4 as uuidv4 } from "uuid";
import type { EntityId } from "../../../../../types.js";
import { EntityNotFoundError, RepositoryError } from "../../errors.js";
import type { BaseEntity, FindOptions } from "../../types.js";
import type { RepositoryServiceApi } from "../../api.js";

/**
 * Creates a Drizzle/Postgres implementation of the RepositoryService.
 * Uses timestamps from Postgres for better accuracy and consistency.
 */
export interface DrizzleRepositoryDeps {
  db: PostgresJsDatabase;
  table: PgTableWithColumns<any>;
}

export const DrizzleRepository = <TEntity extends BaseEntity>() => {
  const Tag = Context.GenericTag<"RepositoryService", RepositoryServiceApi<TEntity>>("DrizzleRepository");



  const make = (deps: DrizzleRepositoryDeps) => Effect.gen(function* () {
    const { db, table } = deps;

    const create = (entityData: TEntity["data"]): Effect.Effect<TEntity, RepositoryError> =>
      Effect.tryPromise({
        try: async () => {
          const now = new Date();
          const newId = uuidv4();
          const result = await db.insert(table)
            .values({
              id: newId,
              created_at: now,
              updated_at: now,
              data: entityData,
            } as any)
            .returning()
            .execute();

          const created = result[0] as any;
          return {
            id: created["id"],
            createdAt: created["created_at"].getTime(),
            updatedAt: created["updated_at"].getTime(),
            data: created["data"],
          } as TEntity;
        },
        catch: (cause) =>
          new RepositoryError({
            message: `Failed to create entity`,
            cause,
            entityType: table["name"],
            operation: "create",
          }),
      });

    const findById = (id: TEntity["id"]): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
      Effect.tryPromise({
        try: async () => {
          const result = await db.select()
            .from(table)
            .where(eq(table["id"], id))
            .execute();

          if (!result || result.length === 0) {
            return Option.none();
          }

          const found = result[0] as any;
          return Option.some<TEntity>({
            id: found["id"],
            createdAt: found["created_at"].getTime(),
            updatedAt: found["updated_at"].getTime(),
            data: found["data"],
          } as TEntity);
        },
        catch: (cause) =>
          new RepositoryError({
            message: `Failed to find entity by ID '${id}'`,
            cause,
            entityType: table["name"],
            operation: "findById",
          }),
      });

    const findMany = (options?: FindOptions<TEntity>): Effect.Effect<ReadonlyArray<TEntity>, RepositoryError> =>
      Effect.tryPromise({
        try: async () => {
          let query = db.select().from(table) as any;

          if (options?.filter) {
            // Convert filter to SQL conditions
            const conditions = Object.entries(options.filter).map(([key, value]) =>
              sql`data ->> ${key} = ${JSON.stringify(value)}`,
            );
            if (conditions.length > 0) {
              query = query.where(sql`${conditions.join(" AND ")}`);
            }
          }

          if (options?.offset) {
            query = query.offset(options.offset);
          }

          if (options?.limit) {
            query = query.limit(options.limit);
          }

          const results = await query.execute();

          return results.map((result: any): TEntity => ({
            id: result["id"],
            createdAt: result["created_at"].getTime(),
            updatedAt: result["updated_at"].getTime(),
            data: result["data"],
          } as TEntity));
        },
        catch: (cause) =>
          new RepositoryError({
            message: "Failed to find entities",
            cause,
            entityType: table["name"],
            operation: "findMany",
          }),
      });

    const findOne = (options?: FindOptions<TEntity>): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
      findMany({ ...options, limit: 1 }).pipe(
        Effect.map((entities) => Option.fromNullable(entities[0])),
      );

    const update = (
      id: TEntity["id"],
      entityData: Partial<TEntity["data"]>,
    ): Effect.Effect<TEntity, RepositoryError | EntityNotFoundError> =>
      Effect.tryPromise({
        try: async () => {
          const now = new Date();
          const result = await db.update(table)
            .set({
              updated_at: now,
              data: sql`data || ${JSON.stringify(entityData)}::jsonb`,
            })
            .where(eq(table["id"], id))
            .returning()
            .execute();

          if (!result || result.length === 0) {
            throw new EntityNotFoundError({ entityType: table["name"] as string, entityId: id });
          }

          const updated = result[0] as any;
          return {
            id: updated.id,
            createdAt: updated.created_at.getTime(),
            updatedAt: updated.updated_at.getTime(),
            data: updated.data,
          } as TEntity;
        },
        catch: (cause) =>
          cause instanceof EntityNotFoundError
            ? cause
            : new RepositoryError({
                message: `Failed to update entity with ID '${id}'`,
                cause,
                entityType: table["name"] as string,
                operation: "update",
              }),
      });

    const del = (id: TEntity["id"]): Effect.Effect<void, RepositoryError | EntityNotFoundError> =>
      Effect.tryPromise({
        try: async () => {
          const result = await db.delete(table)
            .where(eq(table["id"], id))
            .returning()
            .execute();

          if (!result || result.length === 0) {
            throw new EntityNotFoundError({ entityType: table["name"] as string, entityId: id });
          }
        },
        catch: (cause) =>
          cause instanceof EntityNotFoundError
            ? cause
            : new RepositoryError({
                message: `Failed to delete entity with ID '${id}'`,
                cause,
                entityType: table["name"] as string,
                operation: "delete",
              }),
      });

    const count = (options?: Pick<FindOptions<TEntity>, "filter">): Effect.Effect<number, RepositoryError> =>
      Effect.tryPromise({
        try: async () => {
          let query = db.select({ count: sql<number>`count(*)::int` }).from(table) as any;

          if (options?.filter) {
            // Convert filter to SQL conditions
            const conditions = Object.entries(options.filter).map(([key, value]) =>
              sql`data ->> ${key} = ${JSON.stringify(value)}`,
            );
            if (conditions.length > 0) {
              query = query.where(sql`${conditions.join(" AND ")}`);
            }
          }

          const result = await query.execute();
          return result[0].count;
        },
        catch: (cause) =>
          new RepositoryError({
            message: "Failed to count entities",
            cause,
            entityType: table["name"] as string,
            operation: "count",
          }),
      });

    return {
      create,
      findById,
      findOne,
      findMany,
      update,
      delete: del,
      count,
    } as const;
  });

  const live = (deps: DrizzleRepositoryDeps) =>
    Layer.effect(
      Tag,
      make(deps),
    );

  return { Tag, make, live } as const;
};

export default DrizzleRepository;
