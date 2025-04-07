/**
 * @file Provides an In-Memory implementation of the RepositoryApi.
 * Uses Layer.succeedContext(DefaultServices.liveServices) to provide Clock.
 * Uses Clock.currentTimeMillis based on available API.
 * Uses Effect.flatMap(Option.match) pattern for update/delete operations.
 */

import { Effect, Layer, Option, Ref, Context, Clock, DefaultServices } from "effect";
import * as Arr from "effect/Array";
import { v4 as uuidv4 } from "uuid";
import type {
    BaseEntity, // BaseEntity uses number timestamps
    FindOptions,
    RepositoryApi, // Interface declares Clock requirement for create/update
} from "../../types.js";
import { EntityNotFoundError, RepositoryError } from "../../errors.js";
import type { Id, JsonObject } from "../../../../types.js";

// Import Temporal polyfill directly (see note in src/services/types.ts)
import { Temporal } from "@js-temporal/polyfill";

// --- In-Memory Repository Implementation Factory ---

const makeInMemoryRepository = <TEntity extends BaseEntity>(
    entityType: string
): Effect.Effect<RepositoryApi<TEntity>, never, Clock.Clock> => // Requires Clock
    Effect.gen(function* () {
        const store = yield* Ref.make(new Map<Id, TEntity>());

        // --- CRUD Method Implementations ---
        const create = (
            entityData: TEntity["data"]
        ): Effect.Effect<TEntity, RepositoryError, Clock.Clock> => // Requires Clock
            Effect.gen(function* () {
                const now = yield* Clock.currentTimeMillis; // Use millis
                const newId = uuidv4();
                const newEntity = { id: newId, createdAt: now, updatedAt: now, data: entityData } as unknown as TEntity;
                yield* Ref.update(store, (map) => map.set(newId, newEntity));
                return newEntity;
            }).pipe(Effect.catchAll((cause) => new RepositoryError({ message: `Failed to create ${entityType}`, cause })));

        const findById = (
            id: TEntity["id"]
        ): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
            Ref.get(store).pipe(
                Effect.map((map) => Option.fromNullable(map.get(id))),
                Effect.catchAll((cause) => new RepositoryError({ message: `Failed to find ${entityType} by ID '${id}'`, cause }))
            );

        const matchesFilter = (
            entity: TEntity,
            filter?: Partial<TEntity["data"]>
        ): boolean => {
            // If no filter is provided, everything matches
            if (!filter) {
                return true;
            }
            // Check every key provided in the filter
            for (const key in filter) {
                // Ensure the key belongs to the filter object itself (not prototype)
                // AND that the value in the entity's data doesn't match the filter's value
                if (
                    Object.prototype.hasOwnProperty.call(filter, key) &&
                    entity.data[key] !== filter[key]
                ) {
                    // If any mismatch is found, return false immediately
                    return false;
                }
            }
            // If all keys in the filter matched, return true
            return true;
        };

        const findMany = (
            options?: FindOptions<TEntity>
            // Signature matches RepositoryApi.findMany (R=never)
        ): Effect.Effect<ReadonlyArray<TEntity>, RepositoryError> =>
            Ref.get(store).pipe(
                Effect.map((map) => {
                    // Get all values from the map
                    let results = globalThis.Array.from(map.values());

                    // Apply filter if provided
                    if (options?.filter) {
                        results = results.filter((entity) => matchesFilter(entity, options.filter));
                    }

                    // Apply pagination (limit and offset)
                    const offset = options?.offset ?? 0;
                    const limit = options?.limit ?? results.length; // Default to all if no limit
                    // Ensure offset and limit are non-negative
                    const safeOffset = Math.max(0, offset);
                    const safeLimit = Math.max(0, limit);

                    // Slice the results and convert to Effect's ReadonlyArray
                    return Arr.fromIterable(results.slice(safeOffset, safeOffset + safeLimit)); // Use Arr. namespace
                }),
                // Catch potential errors during Ref.get or mapping
                Effect.catchAll((cause) => new RepositoryError({ message: `Failed to find many ${entityType}`, cause }))
            );

        const findOne = (
            options?: FindOptions<TEntity>
        ): Effect.Effect<Option.Option<TEntity>, RepositoryError> =>
            findMany({ ...options, limit: 1 }).pipe(Effect.map(Arr.head));

        // --- Refactored update using flatMap(Option.match) ---
        const update = (
            id: TEntity["id"],
            entityData: Partial<TEntity["data"]>
            // Signature matches RepositoryApi.update (requires Clock)
        ): Effect.Effect<TEntity, RepositoryError | EntityNotFoundError, Clock.Clock> =>
            Ref.get(store).pipe( // Start pipeline by getting the store
                Effect.map((map) => Option.fromNullable(map.get(id))), // Get Option<TEntity>
                Effect.flatMap(Option.match({ // FlatMap over the Option
                    // If None, fail with NotFoundError
                    onNone: () => Effect.fail(new EntityNotFoundError({ entityType, entityId: id })),
                    // If Some, proceed with update logic
                    onSome: (existing) => Effect.gen(function* () { // Use Effect.gen for the success path logic
                        const now = yield* Clock.currentTimeMillis; // Requires Clock
                        const updatedData = { ...existing.data, ...entityData };
                        const updatedEntity = {
                            ...existing,
                            updatedAt: now,
                            data: updatedData
                        } as unknown as TEntity; // Keep cast

                        // Update Ref, mapping potential Ref errors
                        yield* Ref.update(store, (map) => map.set(id, updatedEntity)).pipe(
                            Effect.mapError((cause) => new RepositoryError({
                                message: `Failed during Ref.update for ${entityType} ID '${id}'`,
                                cause
                            }))
                        );
                        // Return the updated entity
                        return updatedEntity;
                    })
                }))
                // Error channel E = EntityNotFoundError | RepositoryError
                // Context channel R = Clock.Clock
            );

        // --- Refactored del using flatMap(Option.match) ---
        const del = (
            id: TEntity["id"]
            // Signature matches RepositoryApi.delete (R=never)
        ): Effect.Effect<void, RepositoryError | EntityNotFoundError> =>
            Ref.get(store).pipe( // Start pipeline by getting the store
                // Check if the key exists
                Effect.map((map) => Option.fromNullable(map.get(id))), // Or just map.has(id) -> Option<boolean>
                Effect.flatMap(Option.match({
                    // If None, fail with NotFoundError
                    onNone: () => Effect.fail(new EntityNotFoundError({ entityType, entityId: id })),
                    // If Some (entity exists), proceed with deletion
                    onSome: (_existingEntity) => // Value not needed
                        Ref.update(store, (map) => {
                            map.delete(id);
                            return map; // Return the modified map
                        }).pipe(
                            // Ref.update returns void. Map potential Ref errors.
                            Effect.mapError((cause) => new RepositoryError({
                                message: `Failed during Ref.update for deleting ${entityType} ID '${id}'`,
                                cause
                            }))
                        )
                }))
                // Error channel E = EntityNotFoundError | RepositoryError
                // Context channel R = never
            );

        const count = (
            options?: Pick<FindOptions<TEntity>, "filter">
        ): Effect.Effect<number, RepositoryError> => // R = never is implicit and correct
            Ref.get(store).pipe(
                // Explicitly annotate the return type of the map function as number
                Effect.map((map): number => { // <--- Added ': number' annotation here
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
                Effect.catchAll((cause) => new RepositoryError({ message: `Failed to count ${entityType}`, cause }))
            );

        // This implementation object now correctly matches the updated RepositoryApi interface
        const implementation: RepositoryApi<TEntity> = {
            create,
            findById,
            findOne,
            findMany,
            update,
            delete: del,
            count
        };
        return implementation;
    });

// --- In-Memory Repository Layer Factory ---
// (Uses Layer.succeedContext(DefaultServices.liveServices) as confirmed working for Clock)
export const InMemoryRepositoryLiveLayer = <
    TEntity extends BaseEntity,
    TService extends RepositoryApi<TEntity>
>(
    tag: Context.Tag<TService, TService>,
    entityType: string
): Layer.Layer<TService> => {
    const effectRequiresClock: Effect.Effect<RepositoryApi<TEntity>, never, Clock.Clock> =
        makeInMemoryRepository<TEntity>(entityType);
    const layerRequiresClock = Layer.effect(
        tag,
        effectRequiresClock as Effect.Effect<TService, never, Clock.Clock>
    );
    const defaultServicesLayer = Layer.succeedContext(DefaultServices.liveServices);
    return Layer.provide(layerRequiresClock, defaultServicesLayer);
};
