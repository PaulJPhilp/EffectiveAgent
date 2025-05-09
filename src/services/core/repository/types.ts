/**
 * @file Defines supporting types for the Repository service.
 */

import type { ImportedType } from "../../../types.js";

/**
 * Base structure for entities managed by repositories.
 * Uses number timestamps (milliseconds since epoch).
 * @template TData The shape of the entity's specific data payload.
 */
export interface BaseEntity<TData extends JsonObject = JsonObject> {
    readonly id: EntityId;
    readonly createdAt: Timestamp;
    readonly updatedAt: Timestamp;
    readonly data: TData;
}

/** Options for filtering and pagination in find operations. */
export interface FindOptions<TEntity extends BaseEntity> {
    readonly filter?: Partial<TEntity["data"]>;
    readonly limit?: number;
    readonly offset?: number;
}
