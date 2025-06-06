import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Context, Effect, Layer, Option } from "effect";
import { v4 as uuidv4 } from "uuid";
import type { RepositoryServiceApi } from "../../api.js";
import { EntityNotFoundError, RepositoryError } from "../../errors.js";
import type { BaseEntity, FindOptions } from "../../types.js";

/**
 * Creates a Drizzle/Postgres implementation of the RepositoryService.
 * Uses timestamps from Postgres for better accuracy and consistency.
 */
export interface DrizzleRepositoryDeps {
  db: PostgresJsDatabase;
  table: any; // Changed from PgTableWithColumns to any for compatibility
}

const createDrizzleRepository = <TEntity extends BaseEntity>(deps: DrizzleRepositoryDeps): RepositoryServiceApi<TEntity> => ({
  create: (entityData: TEntity["data"]): Effect.Effect<TEntity, RepositoryError> =>
    Effect.tryPromise({
      try: async () => {
        const now = new Date();
        const newId = uuidv4();
        const result = await deps.db.insert(deps.table)
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
          entityType: deps.table["name"],
          operation: "create",
        }),
    }),

  findById: (id: TEntity["id"]): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
    Effect.tryPromise({
      try: async () => {
        const result = await deps.db.select()
          .from(deps.table)
          .where(eq(deps.table["id"], id))
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
          entityType: deps.table["name"],
          operation: "findById",
        }),
    }),

  findMany: (options?: FindOptions<TEntity>): Effect.Effect<ReadonlyArray<TEntity>, RepositoryError> =>
    Effect.tryPromise({
      try: async () => {
        let query = deps.db.select().from(deps.table) as any;

        if (options?.filter) {
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
          entityType: deps.table["name"],
          operation: "findMany",
        }),
    }),

  findOne: (options?: FindOptions<TEntity>): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
    Effect.gen(function* () {
      const entities = yield* Effect.tryPromise({
        try: async () => {
          let query = deps.db.select().from(deps.table) as any;

          if (options?.filter) {
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

          query = query.limit(1);

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
            entityType: deps.table["name"],
            operation: "findOne",
          }),
      });
      return Option.fromNullable(entities[0]);
    }),

  update: (
    id: TEntity["id"],
    entityData: Partial<TEntity["data"]>,
  ): Effect.Effect<TEntity, RepositoryError | EntityNotFoundError> =>
    Effect.tryPromise({
      try: async () => {
        const now = new Date();
        const result = await deps.db.update(deps.table)
          .set({
            updated_at: now,
            data: sql`data || ${JSON.stringify(entityData)}::jsonb`,
          })
          .where(eq(deps.table["id"], id))
          .returning()
          .execute();

        if (!result || result.length === 0) {
          throw new EntityNotFoundError({ entityType: deps.table["name"] as string, entityId: id });
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
            entityType: deps.table["name"] as string,
            operation: "update",
          }),
    }),

  delete: (id: TEntity["id"]): Effect.Effect<void, RepositoryError | EntityNotFoundError> =>
    Effect.tryPromise({
      try: async () => {
        const result = await deps.db.delete(deps.table)
          .where(eq(deps.table["id"], id))
          .returning()
          .execute();

        if (!result || result.length === 0) {
          throw new EntityNotFoundError({ entityType: deps.table["name"] as string, entityId: id });
        }
      },
      catch: (cause) =>
        cause instanceof EntityNotFoundError
          ? cause
          : new RepositoryError({
            message: `Failed to delete entity with ID '${id}'`,
            cause,
            entityType: deps.table["name"] as string,
            operation: "delete",
          }),
    }),

  count: (options?: Pick<FindOptions<TEntity>, "filter">): Effect.Effect<number, RepositoryError> =>
    Effect.tryPromise({
      try: async () => {
        let query = deps.db.select({ count: sql<number>`count(*)::int` }).from(deps.table) as any;

        if (options?.filter) {
          const conditions = Object.entries(options.filter).map(([key, value]) =>
            sql`data ->> ${key} = ${JSON.stringify(value)}`,
          );
          if (conditions.length > 0) {
            query = query.where(sql`${conditions.join(" AND ")}`);
          }
        }

        const result = await query.execute();
        return result[0]?.count ?? 0;
      },
      catch: (cause) =>
        new RepositoryError({
          message: "Failed to count entities",
          cause,
          entityType: deps.table["name"],
          operation: "count",
        }),
    })
});

export const DrizzleRepository = <TEntity extends BaseEntity>(entityName: string) => {
  const Tag = Context.GenericTag<RepositoryServiceApi<TEntity>>(`DrizzleRepository<${entityName}>`);

  const live = (deps: DrizzleRepositoryDeps) =>
    Layer.succeed(Tag, createDrizzleRepository<TEntity>(deps));

  return { Tag, live };
};

export default DrizzleRepository;
