/**
 * @file Defines the generic interface and supporting types for a Repository service.
 * Specific repository implementations should define their own Context Tags.
 */

import { Context, Effect, Option } from "effect"; // Removed Clock
import type { EntityId, JsonObject, Timestamp } from "@/types.js";
import type { RepositoryError, EntityNotFoundError } from "@core/repository/errors.js";

/**
 * Base structure for entities managed by repositories.
 * Uses number timestamps (milliseconds since epoch).
 * @template TData The shape of the entity's specific data payload.
 */
export interface BaseEntity<TData extends JsonObject = JsonObject> {
    readonly id: EntityId;
    readonly createdAt: Timestamp; // Still part of the structure
    readonly updatedAt: Timestamp; // Still part of the structure
    readonly data: TData;
}

/** Options for filtering and pagination in find operations. */
export interface FindOptions<TEntity extends BaseEntity> {
    readonly filter?: Partial<TEntity["data"]>;
    readonly limit?: number;
    readonly offset?: number;
}

/**
 * Generic interface defining standard CRUD operations for a repository.
 * Implementations manage entities conforming to the BaseEntity structure.
 * @template TEntity The specific type of BaseEntity managed by the repository.
 */
export interface RepositoryApi<TEntity extends BaseEntity> {
    /**
     * Creates a new entity with the given data.
     * Timestamp generation is implementation-specific (currently placeholder).
     * @param entityData The data payload for the new entity.
     * @returns Effect yielding the newly created TEntity.
     */
    readonly create: (
        entityData: TEntity["data"],
    ) => Effect.Effect<TEntity, RepositoryError>; // Removed Clock requirement

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
     * Timestamp update is implementation-specific (currently placeholder).
     * @param id The ID of the entity to update.
     * @param entityData Partial data payload to update the entity with.
     * @returns Effect yielding the updated TEntity. Fails with EntityNotFoundError if ID doesn't exist.
     */
    readonly update: (
        id: TEntity["id"],
        entityData: Partial<TEntity["data"]>,
    ) => Effect.Effect<TEntity, RepositoryError | EntityNotFoundError>; // Removed Clock requirement

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
