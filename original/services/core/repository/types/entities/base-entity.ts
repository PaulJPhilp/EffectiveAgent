/**
 * Base interface for all entities managed by the RepositoryService.
 */
export interface BaseEntity {
    /**
     * Unique identifier for the entity.
     * Typically a UUID or database-generated ID.
     */
    readonly id: string

    /**
     * Timestamp indicating when the entity was created.
     */
    readonly createdAt: Date

    /**
     * Timestamp indicating the last time the entity was updated.
     */
    readonly updatedAt: Date
} 