/**
 * @file Implements the drizzle-orm repository implementation
 * @module services/core/repository/implementations/drizzle/live
 */

import type { JsonObject } from "@/types.js";
import { SQL, and, count, eq, sql } from "drizzle-orm";
import { Duration, Effect, Option } from "effect";
import { v4 as uuidv4 } from "uuid";
import type { RepositoryServiceApi } from "../../api.js";
import { EntityNotFoundError, RepositoryError } from "../../errors.js";
import type { BaseEntity, FindOptions } from "../../types.js";
import type { DrizzleClientApi } from "./config.js";
import { DrizzleClient } from "./config.js";
import type { BaseModel, BaseTable } from "./schema.js";
import { ResilienceService } from "@/services/execution/resilience/index.js";
import type {
  RetryPolicy,
  CircuitBreakerConfig,
} from "@/services/execution/resilience/index.js";

// --- Resilience Configuration ---

const DB_OPERATION_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelay: Duration.millis(200),
  maxDelay: Duration.seconds(5),
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [],
  nonRetryableErrors: ["EntityNotFoundError"],
};

const DB_OPERATION_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  name: "repository-service-database",
  failureThreshold: 5,
  resetTimeout: Duration.seconds(60),
  halfOpenMaxAttempts: 2,
};

/**
 * Creates a drizzle-orm repository implementation
 */
export function make<
  TData extends JsonObject,
  TEntity extends BaseEntity<TData>
>(entityType: string, table: BaseTable<TData>): RepositoryServiceApi<TEntity> {
  // Helper to convert drizzle model to entity
  const toEntity = (model: BaseModel<TData>): TEntity => {
    const entity: BaseEntity<TData> = {
      id: model.id,
      createdAt: new Date(model.createdAt),
      updatedAt: new Date(model.updatedAt),
      data: model.data,
    };
    return entity as TEntity;
  };

  // Helper to build where clause from filter options
  const buildWhere = (options?: FindOptions<TEntity>) => {
    if (!options?.filter) return undefined;
    const conditions = Object.entries(options.filter)
      .map(([key, value]) => {
        if (key === "id") return eq(table.id, value as string);
        if (key === "createdAt") return eq(table.createdAt, value as Date);
        if (key === "updatedAt") return eq(table.updatedAt, value as Date);
        // For data fields, use a raw SQL comparison
        return sql`${table.data}->>${key} = ${String(value)}`;
      })
      .filter(
        (condition): condition is SQL<unknown> => condition !== undefined
      );
    return conditions.length > 1 ? and(...conditions) : conditions[0];
  };

  // Helper to add resilience to database operations
  const withDatabaseResilience = <A, E>(
    operation: Effect.Effect<A, E, DrizzleClientApi>,
    operationName: string
  ): Effect.Effect<A, E, DrizzleClientApi> => {
    return Effect.gen(function* () {
      // Try to get ResilienceService - if not available, run operation directly
      const resilience = yield* Effect.serviceOption(ResilienceService);

      if (Option.isSome(resilience)) {
        const metrics = yield* resilience.value.getCircuitBreakerMetrics(
          "repository-service-database"
        );
        const result = yield* operation;
        yield* Effect.logDebug(
          `Database operation '${operationName}' completed successfully`
        );
        return result;
      } else {
        // Run operation directly if ResilienceService is not available
        return yield* operation;
      }
    }).pipe(
      Effect.catchAll((error: E) => {
        return Effect.gen(function* () {
          yield* Effect.logWarning(
            `Database operation '${operationName}' failed`,
            { error }
          );
          return yield* Effect.fail(error);
        });
      })
    );
  };

  const create = (
    entityData: TEntity["data"]
  ): Effect.Effect<TEntity, RepositoryError, DrizzleClientApi> =>
    withDatabaseResilience(
      Effect.gen(function* () {
        const client = yield* DrizzleClient;
        const dbClient = yield* client.getClient();
        const results = yield* Effect.tryPromise({
          try: async (_signal) => {
            const result = await dbClient
              .insert(table)
              .values({
                id: uuidv4(),
                createdAt: sql`now()`,
                updatedAt: sql`now()`,
                data: entityData as TData,
              })
              .returning({
                id: table.id,
                createdAt: table.createdAt,
                updatedAt: table.updatedAt,
                data: table.data,
              })
              .execute();
            return result as BaseModel<TData>[];
          },
          catch: (error: unknown): RepositoryError => {
            if (error instanceof Error && error.message.includes("duplicate")) {
              return new RepositoryError({
                message: `Failed to create ${entityType}: duplicate entry`,
                cause: error,
              });
            }
            return new RepositoryError({
              message: `Failed to create ${entityType}`,
              cause: error instanceof Error ? error : new Error(String(error)),
            });
          },
        });
        return toEntity(results[0]);
      }),
      `create-${entityType}`
    );

  const findById = (
    id: TEntity["id"]
  ): Effect.Effect<Option.Option<TEntity>, RepositoryError, DrizzleClientApi> =>
    withDatabaseResilience(
      Effect.gen(function* () {
        const client = yield* DrizzleClient;
        const dbClient = yield* client.getClient();
        const results = yield* Effect.tryPromise({
          try: async (): Promise<BaseModel<TData>[]> => {
            const result = await dbClient
              .select({
                id: table.id,
                createdAt: table.createdAt,
                updatedAt: table.updatedAt,
                data: table.data,
              })
              .from(table)
              .where(eq(table["id"], id))
              .limit(1)
              .execute();
            return result as unknown as BaseModel<TData>[];
          },
          catch: (error: unknown) =>
            new RepositoryError({
              message: `Failed to find ${entityType} by ID ${id}`,
              cause: error instanceof Error ? error : new Error(String(error)),
            }),
        });
        return Option.fromNullable(results[0]).pipe(Option.map(toEntity));
      }),
      `findById-${entityType}`
    );

  const findOne = (
    options?: FindOptions<TEntity>
  ): Effect.Effect<Option.Option<TEntity>, RepositoryError, DrizzleClientApi> =>
    withDatabaseResilience(
      Effect.gen(function* () {
        const client = yield* DrizzleClient;
        const dbClient = yield* client.getClient();
        const results = yield* Effect.tryPromise({
          try: async (): Promise<BaseModel<TData>[]> => {
            const result = await dbClient
              .select({
                id: table.id,
                createdAt: table.createdAt,
                updatedAt: table.updatedAt,
                data: table.data,
              })
              .from(table)
              .where(buildWhere(options))
              .limit(1)
              .execute();
            return result as unknown as BaseModel<TData>[];
          },
          catch: (error: unknown) =>
            new RepositoryError({
              message: `Failed to find ${entityType}`,
              cause: error instanceof Error ? error : new Error(String(error)),
            }),
        });
        return Option.fromNullable(results[0]).pipe(Option.map(toEntity));
      }),
      `findOne-${entityType}`
    );

  const findMany = (
    options?: FindOptions<TEntity>
  ): Effect.Effect<ReadonlyArray<TEntity>, RepositoryError, DrizzleClientApi> =>
    withDatabaseResilience(
      Effect.gen(function* () {
        const client = yield* DrizzleClient;
        const dbClient = yield* client.getClient();
        const results = yield* Effect.tryPromise({
          try: async (): Promise<BaseModel<TData>[]> => {
            const result = await dbClient
              .select({
                id: table.id,
                createdAt: table.createdAt,
                updatedAt: table.updatedAt,
                data: table.data,
              })
              .from(table)
              .where(buildWhere(options))
              .limit(options?.limit ?? 100)
              .offset(options?.offset ?? 0)
              .execute();
            return result as unknown as BaseModel<TData>[];
          },
          catch: (error: unknown) =>
            new RepositoryError({
              message: `Failed to find many ${entityType}`,
              cause: error instanceof Error ? error : new Error(String(error)),
            }),
        });
        return results.map(toEntity);
      }),
      `findMany-${entityType}`
    );

  const update = (
    id: TEntity["id"],
    entityData: Partial<TEntity["data"]>
  ): Effect.Effect<
    TEntity,
    RepositoryError | EntityNotFoundError,
    DrizzleClientApi
  > =>
    withDatabaseResilience(
      Effect.gen(function* () {
        const existing = yield* findById(id);
        if (Option.isNone(existing)) {
          return yield* Effect.fail(
            new EntityNotFoundError({
              entityType,
              entityId: id,
            })
          );
        }
        const client = yield* DrizzleClient;
        const dbClient = yield* client.getClient();
        const results = yield* Effect.tryPromise({
          try: async (): Promise<BaseModel<TData>[]> => {
            const result = await dbClient
              .update(table)
              .set({
                data: sql`${table["data"]} || ${JSON.stringify(
                  entityData
                )}::jsonb`,
                updatedAt: sql`now()`,
              })
              .where(eq(table["id"], id))
              .returning({
                id: table.id,
                createdAt: table.createdAt,
                updatedAt: table.updatedAt,
                data: table.data,
              })
              .execute();
            return result as unknown as BaseModel<TData>[];
          },
          catch: (error: unknown) =>
            new RepositoryError({
              message: `Failed to update ${entityType} with ID ${id}`,
              cause: error instanceof Error ? error : new Error(String(error)),
            }),
        });
        return toEntity(results[0]);
      }),
      `update-${entityType}`
    );

  const del = (
    id: TEntity["id"]
  ): Effect.Effect<
    void,
    RepositoryError | EntityNotFoundError,
    DrizzleClientApi
  > =>
    withDatabaseResilience(
      Effect.gen(function* () {
        const client = yield* DrizzleClient;
        const dbClient = yield* client.getClient();
        const results = yield* Effect.tryPromise({
          try: async (): Promise<BaseModel<TData>[]> => {
            const result = await dbClient
              .delete(table)
              .where(eq(table["id"], id))
              .returning({
                id: table.id,
                createdAt: table.createdAt,
                updatedAt: table.updatedAt,
                data: table.data,
              })
              .execute();
            return result as unknown as BaseModel<TData>[];
          },
          catch: (error: unknown) =>
            new RepositoryError({
              message: `Failed to delete ${entityType} with ID ${id}`,
              cause: error instanceof Error ? error : new Error(String(error)),
            }),
        });
        if (results.length === 0) {
          return yield* Effect.fail(
            new EntityNotFoundError({
              entityType,
              entityId: id,
            })
          );
        }
        return undefined;
      }),
      `delete-${entityType}`
    );

  const countEntities = (
    options?: Pick<FindOptions<TEntity>, "filter">
  ): Effect.Effect<number, RepositoryError, DrizzleClientApi> =>
    withDatabaseResilience(
      Effect.gen(function* () {
        const client = yield* DrizzleClient;
        const dbClient = yield* client.getClient();
        const results = yield* Effect.tryPromise({
          try: (): Promise<{ count: number }[]> =>
            dbClient
              .select({ count: count(table.id) })
              .from(table)
              .where(buildWhere(options)),
          catch: (error: unknown) =>
            new RepositoryError({
              message: `Failed to count ${entityType}`,
              cause: error instanceof Error ? error : new Error(String(error)),
            }),
        });
        return Number(results[0]?.count ?? 0);
      }),
      `count-${entityType}`
    );

  return {
    create,
    findById,
    findOne,
    findMany,
    update,
    delete: del,
    count: countEntities,
  };
}

/**
 * Creates a drizzle repository instance
 */
export function createDrizzleRepository<
  TData extends JsonObject,
  TEntity extends BaseEntity<TData>
>(
  entityType: string,
  table: BaseTable<TData>
): Effect.Effect<RepositoryServiceApi<TEntity>, never, DrizzleClientApi> {
  return Effect.gen(function* () {
    const client = yield* DrizzleClient;
    return make<TData, TEntity>(entityType, table);
  });
}
