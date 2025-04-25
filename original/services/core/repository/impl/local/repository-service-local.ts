import { Effect, Layer } from "effect"
import { v4 as uuidv4 } from "uuid"
import {
    DataValidationError,
    EntityNotFoundError,
    RepositoryError
} from "../../errors/index.js"
import {
    type BaseEntity,
    type FindByIdCriteria,
    type FindCriteria,
    type IRepositoryService,
    RepositoryService,
    type UpdateData
} from "../../types/index.js"

/**
 * In-memory implementation of the RepositoryService.
 * Uses a Map to store entities, primarily for testing and development.
 */
export class RepositoryServiceLocal implements IRepositoryService {
    // Map to store our entities, keyed by ID
    // We use a separate Map for each entity type to avoid type confusion
    private readonly storage = new Map<string, Map<string, BaseEntity>>()

    private getEntityStore<T extends BaseEntity>(entity: Partial<T>): Map<string, T> {
        // Use the constructor name as the type key, fallback to 'unknown' if not available
        const typeKey = (entity.constructor?.name ?? "unknown").toLowerCase()
        if (!this.storage.has(typeKey)) {
            this.storage.set(typeKey, new Map())
        }
        return this.storage.get(typeKey) as Map<string, T>
    }

    create<T extends BaseEntity>(
        data: Omit<T, "id" | "createdAt" | "updatedAt">
    ): Effect.Effect<T, DataValidationError | RepositoryError> {
        return Effect.try({
            try: () => {
                const now = new Date()
                const entity = {
                    ...data,
                    id: uuidv4(),
                    createdAt: now,
                    updatedAt: now
                } as T

                const store = this.getEntityStore(entity)
                store.set(entity.id, entity)
                return entity
            },
            catch: (error) => new RepositoryError("Failed to create entity", {
                cause: error instanceof Error ? error : new Error(String(error))
            })
        })
    }

    findById<T extends BaseEntity>(
        criteria: FindByIdCriteria
    ): Effect.Effect<T, EntityNotFoundError | RepositoryError> {
        return Effect.try({
            try: () => {
                // We need to search all stores since we don't know the entity type
                for (const store of this.storage.values()) {
                    const entity = store.get(criteria.id) as T | undefined
                    if (entity) return entity
                }
                throw new EntityNotFoundError(`Entity with ID '${criteria.id}' not found`, {
                    entityId: criteria.id
                })
            },
            catch: (error) => {
                if (error instanceof EntityNotFoundError) throw error
                throw new RepositoryError("Failed to find entity by ID", {
                    cause: error instanceof Error ? error : new Error(String(error))
                })
            }
        })
    }

    find<T extends BaseEntity>(
        criteria: FindCriteria<T>
    ): Effect.Effect<T[], RepositoryError> {
        return Effect.try({
            try: () => {
                const store = this.getEntityStore(criteria)
                return Array.from(store.values())
                    .filter(entity => {
                        // Check if all criteria properties match the entity
                        return Object.entries(criteria).every(([key, value]) =>
                            (entity as any)[key] === value
                        )
                    }) as T[]
            },
            catch: (error) => new RepositoryError("Failed to find entities", {
                cause: error instanceof Error ? error : new Error(String(error))
            })
        })
    }

    update<T extends BaseEntity>(
        id: string,
        data: UpdateData<T>
    ): Effect.Effect<T, EntityNotFoundError | DataValidationError | RepositoryError> {
        return Effect.try({
            try: () => {
                // First find the entity to update
                let found = false
                let updatedEntity: T | undefined

                for (const store of this.storage.values()) {
                    const existingEntity = store.get(id) as T | undefined
                    if (existingEntity) {
                        updatedEntity = {
                            ...existingEntity,
                            ...data,
                            id, // Ensure ID doesn't change
                            createdAt: existingEntity.createdAt, // Preserve creation time
                            updatedAt: new Date() // Update the modification time
                        }
                        store.set(id, updatedEntity)
                        found = true
                        break
                    }
                }

                if (!found) {
                    throw new EntityNotFoundError(`Entity with ID '${id}' not found`, {
                        entityId: id
                    })
                }

                return updatedEntity!
            },
            catch: (error) => {
                if (error instanceof EntityNotFoundError) throw error
                throw new RepositoryError("Failed to update entity", {
                    cause: error instanceof Error ? error : new Error(String(error))
                })
            }
        })
    }

    delete(id: string): Effect.Effect<void, EntityNotFoundError | RepositoryError> {
        return Effect.try({
            try: () => {
                let found = false

                for (const store of this.storage.values()) {
                    if (store.has(id)) {
                        store.delete(id)
                        found = true
                        break
                    }
                }

                if (!found) {
                    throw new EntityNotFoundError(`Entity with ID '${id}' not found`, {
                        entityId: id
                    })
                }
            },
            catch: (error) => {
                if (error instanceof EntityNotFoundError) throw error
                throw new RepositoryError("Failed to delete entity", {
                    cause: error instanceof Error ? error : new Error(String(error))
                })
            }
        })
    }
}

/**
 * Layer that provides the local implementation of RepositoryService.
 */
export const RepositoryServiceLocalLayer = Layer.succeed(
    RepositoryService,
    new RepositoryServiceLocal()
) 