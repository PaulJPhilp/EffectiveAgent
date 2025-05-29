/**
 * @file Defines supporting types for the Repository service.
 */

import type { EntityId, ImportedType, JsonObject } from "@/types.js";

/**
 * Base structure for entities managed by repositories.
 * Uses number timestamps (milliseconds since epoch).
 * @template TData The shape of the entity's specific data payload.
 */
export interface BaseEntity<TData extends JsonObject = JsonObject> {
    readonly id: EntityId;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly data: TData;
    readonly [key: string]: unknown;
}

/**
 * Base entity type with required data property.
 * This is an alias for BaseEntity to maintain compatibility with existing code.
 */
export interface BaseEntityWithData<T extends JsonObject = JsonObject> extends BaseEntity<T> {}

/** Options for filtering and pagination in find operations. */
export interface FindOptions<TEntity extends BaseEntity> {
    readonly filter?: Partial<TEntity["data"]>;
    readonly limit?: number;
    readonly offset?: number;
}
