/**
 * @file Defines the Repository Service API interface.
 */

import type { EntityId, JsonObject } from "@/types.js";
import type { EntityNotFoundError, RepositoryError } from "./errors.js";
import type { BaseEntity, FindOptions } from "./types.js";
import { Effect, Option } from "effect";

/**
 * Generic interface defining standard CRUD operations for a repository.
 * Implementations manage entities conforming to the BaseEntity structure.
 * @template TEntity The specific type of BaseEntity managed by the repository.
 */
export interface RepositoryServiceApi<TEntity extends BaseEntity> {
    /**
     * Creates a new entity with the given data.
     * @param entityData The data payload for the new entity.
     * @returns Effect yielding the newly created TEntity.
     */
    readonly create: (
        entityData: TEntity["data"],
    ) => Effect.Effect<TEntity, RepositoryError>;

    /**
     * Finds an entity by its unique ID.
     * @param id The ID of the entity to find.
     * @returns Effect yielding an Option of the found TEntity.
     */
    readonly findById: (
        id: TEntity["id"],
    ) => Effect.Effect<Option.Option<TEntity>, RepositoryError>;

    /**
     * Finds a single entity matching the specified criteria.
     * Returns the first match if multiple exist.
     * @param options Optional filtering criteria.
     * @returns Effect yielding an Option of the found TEntity.
     */
    readonly findOne: (
        options?: FindOptions<TEntity>,
    ) => Effect.Effect<Option.Option<TEntity>, RepositoryError>;

    /**
     * Finds multiple entities matching the specified criteria.
     * @param options Optional filtering and pagination criteria.
     * @returns Effect yielding a ReadonlyArray of found TEntities.
     */
    readonly findMany: (
        options?: FindOptions<TEntity>,
    ) => Effect.Effect<ReadonlyArray<TEntity>, RepositoryError>;

    /**
     * Updates an existing entity identified by its ID with partial data.
     * @param id The ID of the entity to update.
     * @param entityData Partial data payload to update the entity with.
     * @returns Effect yielding the updated TEntity. Fails with EntityNotFoundError if ID doesn't exist.
     */
    readonly update: (
        id: TEntity["id"],
        entityData: Partial<TEntity["data"]>,
    ) => Effect.Effect<TEntity, RepositoryError | EntityNotFoundError>;

    /**
     * Deletes an entity identified by its ID.
     * @param id The ID of the entity to delete.
     * @returns Effect yielding void on success. Fails with EntityNotFoundError if ID doesn't exist.
     */
    readonly delete: (
        id: TEntity["id"],
    ) => Effect.Effect<void, RepositoryError | EntityNotFoundError>;

    /**
     * Counts the number of entities matching the specified filter criteria.
     * @param options Optional filtering criteria.
     * @returns Effect yielding the count as a number.
     */
    readonly count: (
        options?: Pick<FindOptions<TEntity>, "filter">,
    ) => Effect.Effect<number, RepositoryError>;
}