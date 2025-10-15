/**
 * @file Defines the Repository Service API interface.
 *
 * IMPORTANT: The Repository service is the ONLY service in the codebase that
 * is allowed to use Context.Tag for dependency injection. All other services
 * must follow the Effect.Service pattern without Context.Tag usage.
 *
 * This exception exists because the Repository service needs to be dynamically
 * instantiated with different entity types, making it impossible to use the
 * standard Effect.Service pattern directly.
 */

import type { Effect, Option } from "effect";
import type { DrizzleClientApi } from "@/services/core/repository/implementations/drizzle/config.js";
import type { EntityNotFoundError, RepositoryError } from "./errors.js";
import type { BaseEntity, FindOptions } from "./types.js";

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
    ) => Effect.Effect<TEntity, RepositoryError, DrizzleClientApi>;

    /**
     * Finds an entity by its unique ID.
     * @param id The ID of the entity to find.
     * @returns Effect yielding an Option of the found TEntity.
     */
    readonly findById: (
        id: TEntity["id"],
    ) => Effect.Effect<Option.Option<TEntity>, RepositoryError, DrizzleClientApi>;

    /**
     * Finds a single entity matching the specified criteria.
     * Returns the first match if multiple exist.
     * @param options Optional filtering criteria.
     * @returns Effect yielding an Option of the found TEntity.
     */
    readonly findOne: (
        options?: FindOptions<TEntity>,
    ) => Effect.Effect<Option.Option<TEntity>, RepositoryError, DrizzleClientApi>;

    /**
     * Finds multiple entities matching the specified criteria.
     * @param options Optional filtering and pagination criteria.
     * @returns Effect yielding a ReadonlyArray of found TEntities.
     */
    readonly findMany: (
        options?: FindOptions<TEntity>,
    ) => Effect.Effect<ReadonlyArray<TEntity>, RepositoryError, DrizzleClientApi>;

    /**
     * Updates an existing entity identified by its ID with partial data.
     * @param id The ID of the entity to update.
     * @param entityData Partial data payload to update the entity with.
     * @returns Effect yielding the updated TEntity. Fails with EntityNotFoundError if ID doesn't exist.
     */
    readonly update: (
        id: TEntity["id"],
        entityData: Partial<TEntity["data"]>,
    ) => Effect.Effect<TEntity, RepositoryError | EntityNotFoundError, DrizzleClientApi>;

    /**
     * Deletes an entity identified by its ID.
     * @param id The ID of the entity to delete.
     * @returns Effect yielding void on success. Fails with EntityNotFoundError if ID doesn't exist.
     */
    readonly delete: (
        id: TEntity["id"],
    ) => Effect.Effect<void, RepositoryError | EntityNotFoundError, DrizzleClientApi>;

    /**
     * Counts the number of entities matching the specified filter criteria.
     * @param options Optional filtering criteria.
     * @returns Effect yielding the count as a number.
     */
    readonly count: (
        options?: Pick<FindOptions<TEntity>, "filter">,
    ) => Effect.Effect<number, RepositoryError, DrizzleClientApi>;
}