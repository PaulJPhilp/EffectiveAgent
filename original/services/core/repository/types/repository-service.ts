import { Context, Effect } from "effect"
import { type DataValidationError, type EntityNotFoundError, type RepositoryError } from "../errors/index.js"
import { type BaseEntity } from "./entities/base-entity.js"

// Define criteria types for querying
export interface FindByIdCriteria {
    id: string
}

export type FindCriteria<T> = Partial<T> // Simple partial match for now, can be expanded

export type UpdateData<T> = Partial<Omit<T, "id" | "createdAt" | "updatedAt">>

/**
 * Defines the contract for a generic repository service.
 * Provides CRUD operations for entities conforming to BaseEntity.
 */
export interface IRepositoryService {
    /**
     * Creates a new entity.
     * @param data - The data for the new entity (excluding id, createdAt, updatedAt).
     * @returns An Effect that resolves with the created entity or fails with DataValidationError/RepositoryError.
     */
    create<T extends BaseEntity>(
        data: Omit<T, "id" | "createdAt" | "updatedAt">
    ): Effect.Effect<T, DataValidationError | RepositoryError>

    /**
     * Finds an entity by its ID.
     * @param criteria - The ID of the entity to find.
     * @returns An Effect that resolves with the found entity or fails with EntityNotFoundError/RepositoryError.
     */
    findById<T extends BaseEntity>(
        criteria: FindByIdCriteria
    ): Effect.Effect<T, EntityNotFoundError | RepositoryError>

    /**
     * Finds entities matching the given criteria.
     * @param criteria - The criteria to filter entities.
     * @returns An Effect that resolves with an array of found entities or fails with RepositoryError.
     */
    find<T extends BaseEntity>(
        criteria: FindCriteria<T>
    ): Effect.Effect<T[], RepositoryError>

    /**
     * Updates an existing entity identified by ID.
     * @param id - The ID of the entity to update.
     * @param data - The partial data to update the entity with.
     * @returns An Effect that resolves with the updated entity or fails with EntityNotFoundError/DataValidationError/RepositoryError.
     */
    update<T extends BaseEntity>(
        id: string,
        data: UpdateData<T>
    ): Effect.Effect<T, EntityNotFoundError | DataValidationError | RepositoryError>

    /**
     * Deletes an entity by its ID.
     * @param id - The ID of the entity to delete.
     * @returns An Effect that resolves with void or fails with EntityNotFoundError/RepositoryError.
     */
    delete(id: string): Effect.Effect<void, EntityNotFoundError | RepositoryError>
}

/**
 * The Effect Context Tag for the RepositoryService.
 */
export class RepositoryService extends Context.Tag("RepositoryService")<
    IRepositoryService,
    IRepositoryService
>() { } 