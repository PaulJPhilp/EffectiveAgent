import type { EntityId } from "@/types.js";
import { Context, Effect, Layer, Option, Ref } from "effect";
import * as Arr from "effect/Array";
import { v4 as uuidv4 } from "uuid";
import type { RepositoryServiceApi } from "../../api.js";
import { EntityNotFoundError, RepositoryError } from "../../errors.js";
import type { BaseEntity, FindOptions } from "../../types.js";

/**
 * Creates an in-memory implementation of the RepositoryService.
 * Uses Date.now() for timestamps.
 */
export const InMemoryRepository = <TEntity extends BaseEntity>() => {
  const Tag = Context.GenericTag<"RepositoryService", RepositoryServiceApi<TEntity>>("InMemoryRepository");
  const matchesFilter = (
    entity: TEntity,
    filter?: Partial<TEntity["data"]>,
  ): boolean => {
    if (!filter) return true;
    for (const key in filter) {
      if (
        Object.prototype.hasOwnProperty.call(filter, key) &&
        entity.data[key] !== filter[key]
      ) {
        return false;
      }
    }
    return true;
  };

  const make = (entityType: string) => Effect.gen(function* () {
    const store = yield* Ref.make(new Map<EntityId, TEntity>());

    const create = (entityData: TEntity["data"]): Effect.Effect<TEntity, RepositoryError> =>
      Effect.gen(function* () {
        const now = Date.now();
        const newId = uuidv4();
        const newEntity = {
          id: newId,
          createdAt: now,
          updatedAt: now,
          data: entityData,
        } as TEntity;
        yield* Ref.update(store, (map) => map.set(newId, newEntity));
        return newEntity;
      }).pipe(
        Effect.catchAll((cause) =>
          Effect.fail(
            new RepositoryError({
              message: `Failed to create ${entityType}`,
              cause,
              entityType,
              operation: "create",
            }),
          ),
        ),
      );

    const findById = (id: TEntity["id"]): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
      Ref.get(store).pipe(
        Effect.map((map) => Option.fromNullable(map.get(id))),
        Effect.catchAll((cause) =>
          Effect.fail(
            new RepositoryError({
              message: `Failed to find ${entityType} by ID '${id}'`,
              cause,
              entityType,
              operation: "findById",
            }),
          ),
        ),
      );

    const findMany = (options?: FindOptions<TEntity>): Effect.Effect<ReadonlyArray<TEntity>, RepositoryError> =>
      Ref.get(store).pipe(
        Effect.map((map) => {
          let results = globalThis.Array.from(map.values());
          if (options?.filter) {
            results = results.filter((entity) =>
              matchesFilter(entity, options.filter),
            );
          }
          const offset = options?.offset ?? 0;
          const limit = options?.limit ?? results.length;
          const safeOffset = Math.max(0, offset);
          const safeLimit = Math.max(0, limit);
          return Arr.fromIterable(
            results.slice(safeOffset, safeOffset + safeLimit),
          );
        }),
        Effect.catchAll((cause) =>
          Effect.fail(
            new RepositoryError({
              message: `Failed to find ${entityType}`,
              cause,
              entityType,
              operation: "findMany",
            }),
          ),
        ),
      );

    const findOne = (options?: FindOptions<TEntity>): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
      findMany(options).pipe(
        Effect.map((entities) => Option.fromNullable(entities[0])),
      );

    const update = (
      id: TEntity["id"],
      entityData: Partial<TEntity["data"]>,
    ): Effect.Effect<TEntity, RepositoryError | EntityNotFoundError> =>
      findById(id).pipe(
        Effect.flatMap((option) =>
          Option.match(option, {
            onNone: () =>
              Effect.fail(new EntityNotFoundError({ entityType, entityId: id })),
            onSome: (existing) =>
              Effect.gen(function* () {
                const now = Date.now();
                const updatedEntity: TEntity = {
                  ...existing,
                  updatedAt: now,
                  data: {
                    ...existing.data,
                    ...entityData
                  }
                };
                yield* Ref.update(store, (map) => map.set(id, updatedEntity));
                return updatedEntity;
              }),
          }),
        ),
      );

    const del = (id: TEntity["id"]): Effect.Effect<void, RepositoryError | EntityNotFoundError> =>
      findById(id).pipe(
        Effect.flatMap((option) =>
          Option.match(option, {
            onNone: () =>
              Effect.fail(new EntityNotFoundError({ entityType, entityId: id })),
            onSome: () =>
              Ref.update(store, (map) => {
                map.delete(id);
                return map;
              }),
          }),
        ),
      );

    const count = (options?: Pick<FindOptions<TEntity>, "filter">): Effect.Effect<number, RepositoryError> =>
      Ref.get(store).pipe(
        Effect.map((map): number => {
          if (!options?.filter) {
            return map.size;
          }
          let count = 0;
          for (const entity of map.values()) {
            if (matchesFilter(entity, options.filter)) {
              count++;
            }
          }
          return count;
        }),
        Effect.catchAll((cause) =>
          Effect.fail(
            new RepositoryError({
              message: `Failed to count ${entityType}`,
              cause,
              entityType,
              operation: "count",
            }),
          ),
        ),
      );

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

  const live = (entityType: string) =>
    Layer.effect(
      Tag,
      make(entityType),
    );

  return { Tag, make, live } as const;
};

export default InMemoryRepository;
