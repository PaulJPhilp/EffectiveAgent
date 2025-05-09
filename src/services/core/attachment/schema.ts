/**
 * @file Defines the schema for the AttachmentLink entity.
 */

import { BaseEntitySchema } from "@/schema.js";
import { EntityId } from "@/types.js";
import { Schema as S } from "@effect/schema.js";

// Helper for EntityId schema
function EntityIdSchema() {
    return Schema.String.pipe(Schema.annotations({ identifier: "EntityId" }));
}

// Schema for the 'data' payload
const AttachmentLinkEntityDataSchema = Schema.Struct({
    entityA_id: EntityIdSchema(),
    entityA_type: Schema.String.pipe(Schema.minLength(1)),
    entityB_id: EntityIdSchema(),
    entityB_type: Schema.String.pipe(Schema.minLength(1)),
    // linkType is optional for now based on PRD
    linkType: S.optional(Schema.String.pipe(Schema.minLength(1))),
});

// Full entity schema
export const AttachmentLinkEntitySchema = Schema.extend(
    BaseEntitySchema,
    Schema.Struct({
        data: AttachmentLinkEntityDataSchema,
    }),
);

// Inferred types
export type AttachmentLinkEntityData = Schema.Schema.Type<
    typeof AttachmentLinkEntityDataSchema
>;
export type AttachmentLinkEntity = Schema.Schema.Type<
    typeof AttachmentLinkEntitySchema
>;
