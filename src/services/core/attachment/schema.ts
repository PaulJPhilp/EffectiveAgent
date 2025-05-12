/**
 * @file Defines the schema for the AttachmentLink entity.
 */

import { BaseEntitySchema } from "@/schema.js";
import { Schema as S } from "@effect/schema";

// Helper for EntityId schema
function EntityIdSchema() {
    return S.String.pipe(S.annotations({ identifier: "EntityId" }));
}

// Define the data class schema
export class AttachmentLinkEntityData extends S.Class<AttachmentLinkEntityData>("AttachmentLinkEntityData")({
    entityA_id: EntityIdSchema(),
    entityA_type: S.String.pipe(S.minLength(1)),
    entityB_id: EntityIdSchema(),
    entityB_type: S.String.pipe(S.minLength(1)),
    // linkType is optional for now based on PRD
    linkType: S.optional(S.String.pipe(S.minLength(1))),
    // Additional fields for enhanced link functionality
    metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
    createdBy: S.optional(S.String),
    expiresAt: S.optional(S.Number),
}) { }

// Define the entity class schema
export class AttachmentLinkEntity extends BaseEntitySchema.extend<AttachmentLinkEntity>("AttachmentLinkEntity")({
    data: S.instanceOf(AttachmentLinkEntityData),
}) { }