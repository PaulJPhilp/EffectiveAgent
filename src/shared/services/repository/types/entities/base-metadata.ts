import { type JSONObject } from "../../../../../../src/types.js";

/**
 * Base metadata interface that all entity metadata must extend.
 * Provides common metadata fields required by all entities.
 */
export interface BaseMetadata extends JSONObject {
    /**
     * Timestamp indicating when the entity was created.
     */
    readonly createdAt: string;

    /**
     * Timestamp indicating the last time the entity was updated.
     */
    readonly updatedAt: string;
}
