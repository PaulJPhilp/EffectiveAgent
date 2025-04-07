// File: src/services/core/repository/types.ts

import { Context, Effect, Option, Clock } from "effect"; // Added Clock
import type { Id, JsonObject } from "../../types.js";
import type { RepositoryError, EntityNotFoundError } from "./errors.js";

// BaseEntity uses number timestamps
export interface BaseEntity<TData extends JsonObject = JsonObject> {
    readonly id: Id;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly data: TData;
}

export interface FindOptions<TEntity extends BaseEntity> {
    readonly filter?: Partial<TEntity["data"]>;
    readonly limit?: number;
    readonly offset?: number;
}

/** Interface defining the standard CRUD operations for a repository. */
export interface RepositoryApi<TEntity extends BaseEntity> {
    /** Creates a new entity. Requires Clock for timestamps. */
    readonly create: (
        entityData: TEntity["data"]
        // CORRECTED: Declare Clock requirement
    ) => Effect.Effect<TEntity, RepositoryError, Clock.Clock>;

    /** Finds an entity by its unique ID. */
    readonly findById: (
        id: TEntity["id"]
    ) => Effect.Effect<Option.Option<TEntity>, RepositoryError>; // R = never

    /** Finds a single entity matching criteria. */
    readonly findOne: (
        options?: FindOptions<TEntity>
    ) => Effect.Effect<Option.Option<TEntity>, RepositoryError>; // R = never

    /** Finds multiple entities matching criteria. */
    readonly findMany: (
        options?: FindOptions<TEntity>
    ) => Effect.Effect<ReadonlyArray<TEntity>, RepositoryError>; // R = never

    /** Updates an existing entity by ID. Requires Clock for timestamps. */
    readonly update: (
        id: TEntity["id"],
        entityData: Partial<TEntity["data"]>
        // CORRECTED: Declare Clock requirement
    ) => Effect.Effect<TEntity, RepositoryError | EntityNotFoundError, Clock.Clock>;

    /** Deletes an entity by ID. */
    readonly delete: (
        id: TEntity["id"]
    ) => Effect.Effect<void, RepositoryError | EntityNotFoundError>; // R = never

    /** Counts entities matching criteria. */
    readonly count: (
        options?: Pick<FindOptions<TEntity>, "filter">
    ) => Effect.Effect<number, RepositoryError>; // R = never
}

/** Creates a Context.Tag for a specific RepositoryApi instance */
export const RepositoryApiTag = <
    TService extends RepositoryApi<BaseEntity<any>>
>(
    identifier: string
): Context.Tag<TService, TService> => {
    return Context.GenericTag<TService>(identifier);
};
