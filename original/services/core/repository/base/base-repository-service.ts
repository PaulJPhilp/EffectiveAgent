import { Effect } from "effect";
import { type BaseEntity } from "../types/index.js";
import { type BaseMetadata } from "../types/entities/base-metadata.js";
import { type JSONObject } from "../../../../../src/types.js";
import { RepositoryError } from "../errors/index.js";

/**
 * Base repository service that provides common functionality for all implementations
 */
export abstract class BaseRepositoryService {
    /**
     * Generate a unique identifier for a new entity
     */
    protected makeId(): string {
        return crypto.randomUUID();
    }

    /**
     * Create base metadata for an entity
     */
    protected createMetadata(): BaseMetadata {
        const now = new Date().toISOString();
        return {
            createdAt: now,
            updatedAt: now
        };
    }

    /**
     * Update metadata for an entity
     */
    protected updateMetadata(metadata: BaseMetadata): BaseMetadata {
        return {
            ...metadata,
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Serialize an entity to a string for storage
     */
    protected serializeEntity<T extends JSONObject, M extends BaseMetadata>(
        entity: BaseEntity<T, M>
    ): Effect.Effect<string, RepositoryError> {
        return Effect.try(() => {
            return JSON.stringify(entity);
        }).pipe(
            Effect.mapError((error) => 
                new RepositoryError("Failed to serialize entity", { cause: error })
            )
        );
    }

    /**
     * Deserialize a string back into an entity
     */
    protected deserializeEntity<T extends JSONObject, M extends BaseMetadata>(
        data: string
    ): Effect.Effect<BaseEntity<T, M>, RepositoryError> {
        return Effect.try(() => {
            const parsed = JSON.parse(data);
            return {
                id: parsed.id,
                data: parsed.data as T,
                metadata: parsed.metadata as M
            };
        }).pipe(
            Effect.mapError((error) => 
                new RepositoryError("Failed to deserialize entity", { cause: error })
            )
        );
    }
}
