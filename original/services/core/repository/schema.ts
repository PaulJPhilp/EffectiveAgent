/**
 * Base schema for all entities in the repository
 */
export interface EntitySchema {
    id: string;
    data: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Type for the database row
 */
export type DatabaseRow = EntitySchema;
