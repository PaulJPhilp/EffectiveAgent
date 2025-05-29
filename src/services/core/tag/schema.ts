/**
 * @file Defines schemas for Tag and EntityTagLink entities.
 */

import { BaseEntitySchema } from "@/schema.js";
import { Schema as S } from "effect";
import { JsonObject } from "@/types.js";
import { BaseEntity, BaseEntityWithData } from "@/services/core/repository/types.js";

// Helper for EntityId schema
function EntityIdSchema() {
    return S.String.pipe(S.annotations({ identifier: "EntityId" }));
}

// --- Tag Entity ---

// Schema for the 'data' part of the TagEntity
const TagEntityDataSchema = S.Struct({
    /** The unique name of the tag (e.g., "important", "todo", "project-alpha"). Case-insensitive matching likely needed. */
    name: S.String.pipe(S.minLength(1)),
    // Add description or color fields later if needed
});

// Full TagEntity schema
export const TagEntitySchema = S.extend(
    BaseEntitySchema, // Inherit id, createdAt, updatedAt
    S.Struct({
        data: TagEntityDataSchema,
    }),
);

// Inferred types for TagEntity
export type TagEntityData = S.Schema.Type<typeof TagEntityDataSchema> & JsonObject;
export interface TagEntity extends BaseEntityWithData<TagEntityData> {}

// --- EntityTagLink Entity ---

// Schema for the 'data' part of the EntityTagLinkEntity
const EntityTagLinkEntityDataSchema = S.Struct({
    /** The ID of the tag being linked. */
    tagId: EntityIdSchema(),
    /** The ID of the entity being tagged. */
    entityId: EntityIdSchema(),
    /** A discriminator string identifying the type of the entity being tagged (e.g., "File", "ChatMessage"). */
    entityType: S.String.pipe(S.minLength(1)),
});

// Full EntityTagLinkEntity schema
// This represents the join table record for the many-to-many relationship.
export const EntityTagLinkEntitySchema = S.extend(
    BaseEntitySchema, // Inherit id, createdAt, updatedAt (id is the link's own ID)
    S.Struct({
        data: EntityTagLinkEntityDataSchema,
    }),
);

// Inferred types for EntityTagLinkEntity
export type EntityTagLinkEntityData = S.Schema.Type<typeof EntityTagLinkEntityDataSchema> & JsonObject;
export interface EntityTagLinkEntity extends BaseEntityWithData<EntityTagLinkEntityData> {}
