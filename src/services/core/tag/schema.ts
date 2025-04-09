/**
 * @file Defines schemas for Tag and EntityTagLink entities.
 */

import { BaseEntitySchema } from "@/schema.js";
import { EntityId } from "@/types.js";
import { Schema } from "@effect/schema";

// Helper for EntityId schema
function EntityIdSchema() {
    return Schema.String.pipe(Schema.annotations({ identifier: "EntityId" }));
}

// --- Tag Entity ---

// Schema for the 'data' part of the TagEntity
const TagEntityDataSchema = Schema.Struct({
    /** The unique name of the tag (e.g., "important", "todo", "project-alpha"). Case-insensitive matching likely needed. */
    name: Schema.String.pipe(Schema.minLength(1)),
    // Add description or color fields later if needed
});

// Full TagEntity schema
export const TagEntitySchema = Schema.extend(
    BaseEntitySchema, // Inherit id, createdAt, updatedAt
    Schema.Struct({
        data: TagEntityDataSchema,
    }),
);

// Inferred types for TagEntity
export type TagEntityData = Schema.Schema.Type<typeof TagEntityDataSchema>;
export type TagEntity = Schema.Schema.Type<typeof TagEntitySchema>;


// --- EntityTagLink Entity ---

// Schema for the 'data' part of the EntityTagLinkEntity
const EntityTagLinkEntityDataSchema = Schema.Struct({
    /** The ID of the tag being linked. */
    tagId: EntityIdSchema(),
    /** The ID of the entity being tagged. */
    entityId: EntityIdSchema(),
    /** A discriminator string identifying the type of the entity being tagged (e.g., "File", "ChatMessage"). */
    entityType: Schema.String.pipe(Schema.minLength(1)),
});

// Full EntityTagLinkEntity schema
// This represents the join table record for the many-to-many relationship.
export const EntityTagLinkEntitySchema = Schema.extend(
    BaseEntitySchema, // Inherit id, createdAt, updatedAt (id is the link's own ID)
    Schema.Struct({
        data: EntityTagLinkEntityDataSchema,
    }),
);

// Inferred types for EntityTagLinkEntity
export type EntityTagLinkEntityData = Schema.Schema.Type<
    typeof EntityTagLinkEntityDataSchema
>;
export type EntityTagLinkEntity = Schema.Schema.Type<
    typeof EntityTagLinkEntitySchema
>;

