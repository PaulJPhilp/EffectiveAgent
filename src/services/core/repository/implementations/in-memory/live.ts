/**
 * @file Provides an In-Memory implementation of the RepositoryApi.
 * Uses Date.now() for placeholder timestamps. Clock integration deferred.
 * The make function creates the repository implementation;
 * the layer should be constructed where needed.
 */

import { EntityId } from "@/types.js";
import { Context, Effect, Layer, Option, Ref } from "effect"; // Removed Clock
import * as Arr from "effect/Array";
import { v4 as uuidv4 } from "uuid";
import type { RepositoryServiceApi } from "../../api.js";
import {
    EntityNotFoundError,
    RepositoryError,
} from "../../errors.js";
import type {
    BaseEntity,
    FindOptions,
} from "../../types.js";

// --- In-Memory Repository Implementation Factory Function ---
// This function is NOT an Effect itself. It takes the Ref store
// and returns the API object directly. No Clock dependency.
export const make = <TEntity extends BaseEntity>(
    entityType: string,
    store: Ref.Ref<Map<EntityId, TEntity>>, // Accept Ref store as argument
): RepositoryServiceApi<TEntity> => { // Returns the implementation object directly
    // --- Helper ---
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

    // --- CRUD Method Implementations ---
    const create = (
        entityData: TEntity["data"],
    ): Effect.Effect<TEntity, RepositoryError> => // No Clock requirement
        Effect.gen(function* () {
            const now = new Date(); // Use new Date() for proper Date objects
            const newId = uuidv4();
            const newEntity = {
                id: newId,
                createdAt: now, // Date object
                updatedAt: now, // Date object
                data: entityData,
            } as TEntity; // Cast needed
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

    const findById = (
        id: TEntity["id"],
    ): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
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

    const findMany = (
        options?: FindOptions<TEntity>,
    ): Effect.Effect<ReadonlyArray<TEntity>, RepositoryError> =>
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
                        message: `Failed to find many ${entityType}`,
                        cause,
                        entityType,
                        operation: "findMany",
                    }),
                ),
            ),
        );

    const findOne = (
        options?: FindOptions<TEntity>,
    ): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
        findMany({ ...options, limit: 1 }).pipe(Effect.map(Arr.head));

    const update = (
        id: TEntity["id"],
        entityData: Partial<TEntity["data"]>,
    ): Effect.Effect<TEntity, RepositoryError | EntityNotFoundError> => // No Clock requirement
        Ref.get(store).pipe(
            Effect.map((map) => Option.fromNullable(map.get(id))),
            Effect.mapError((cause) => new RepositoryError({
                message: `Ref.get failed during update check for ${entityType} ID '${id}'`,
                cause, entityType, operation: "update"
            })),
            Effect.flatMap(
                (option: Option.Option<TEntity>): Effect.Effect<TEntity, EntityNotFoundError | RepositoryError> => // No Clock in R
                    Option.match(option, {
                        onNone: () => Effect.fail(new EntityNotFoundError({ entityType, entityId: id })),
                        onSome: (existing) => Effect.gen(function* () {
                            const now = new Date(); // Use new Date() for proper Date objects
                            const updatedData = { ...existing.data, ...entityData };
                            const updatedEntity = {
                                ...existing,
                                updatedAt: now, // Date object
                                data: updatedData,
                            } as TEntity;
                            yield* Ref.update(store, (map) => map.set(id, updatedEntity)).pipe(
                                Effect.mapError((cause) => new RepositoryError({
                                    message: `Ref.update failed for ${entityType} ID '${id}'`,
                                    cause, entityType, operation: "update"
                                }))
                            );
                            return updatedEntity;
                        }),
                    })
            )
        );

    const del = (
        id: TEntity["id"],
    ): Effect.Effect<void, RepositoryError | EntityNotFoundError> =>
        Ref.get(store).pipe(
            Effect.map((map) => Option.fromNullable(map.get(id))),
            Effect.mapError((cause) => new RepositoryError({
                message: `Ref.get failed during delete check for ${entityType} ID '${id}'`,
                cause, entityType, operation: "delete"
            })),
            Effect.flatMap(
                (option: Option.Option<TEntity>): Effect.Effect<void, EntityNotFoundError | RepositoryError, never> =>
                    Option.match(option, {
                        onNone: () => Effect.fail(new EntityNotFoundError({ entityType, entityId: id })),
                        onSome: (_existingEntity) =>
                            Ref.update(store, (map) => {
                                map.delete(id);
                                return map;
                            }).pipe(
                                Effect.mapError((cause) => new RepositoryError({
                                    message: `Ref.update failed for deleting ${entityType} ID '${id}'`,
                                    cause, entityType, operation: "delete"
                                }))
                            ),
                    })
            )
        );

    const count = (
        options?: Pick<FindOptions<TEntity>, "filter">,
    ): Effect.Effect<number, RepositoryError> =>
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

    // Return the implementation object
    return { create, findById, findOne, findMany, update, delete: del, count };
};

// --- In-Memory Repository Layer Factory (No Clock Requirement) ---
export const InMemoryRepositoryLiveLayer = <
    TEntity extends BaseEntity,
    TService extends RepositoryServiceApi<TEntity>
>(
    tag: Context.Tag<TService, TService>,
    entityType: string,
): Layer.Layer<TService, never, never> => { // Layer requires nothing

    // Layer.effect builds the service. It requires nothing.
    const layer = Layer.effect(
        tag,
        Effect.gen(function* () {
            // Dependencies required to build the service are resolved here
            const store = yield* Ref.make(new Map<EntityId, TEntity>()); // Create store here
            // Create the implementation by passing dependencies to make
            // No Clock needed for make anymore
            const implementation = make<TEntity>(entityType, store);
            return implementation as TService; // Cast to TService
        })
    );

    return layer;
};
