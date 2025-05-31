/**
 * @file Defines the schema for the AttachmentLink entity.
 */

import { BaseEntitySchema } from "@/schema.js";
import { Schema as S } from "effect";
import { JsonObject } from "@/types.js";
import { BaseEntityWithData } from "../repository/types.js";

// Helper for EntityId schema
function EntityIdSchema() {
    return S.String.pipe(S.annotations({ identifier: "EntityId" }));
}

// Define the data schema
export const AttachmentLinkEntityDataSchema = S.Struct({
    entityA_id: EntityIdSchema(),
    entityA_type: S.String.pipe(S.minLength(1)),
    entityB_id: EntityIdSchema(),
    entityB_type: S.String.pipe(S.minLength(1)),
    // linkType is optional for now based on PRD
    linkType: S.String.pipe(S.minLength(1)).pipe(S.optional),
    // Additional fields for enhanced link functionality
    metadata: S.optional(S.Record({
        key: S.String,
        value: S.Union(
            S.String,
            S.Number,
            S.Boolean,
            S.Null,
            S.Record({ key: S.String, value: S.Unknown }),
            S.Array(S.Union(
                S.String,
                S.Number,
                S.Boolean,
                S.Null,
                S.Record({ key: S.String, value: S.Unknown })
            )),
            S.Array(S.Union(
                S.String,
                S.Number,
                S.Boolean,
                S.Null,
                S.Record({ key: S.String, value: S.Unknown })
            ))
        )
    })),
    createdBy: S.String.pipe(S.optional),
    expiresAt: S.Number.pipe(S.optional),
});

// Define the entity schema
export const AttachmentLinkEntitySchema = S.extend(
    BaseEntitySchema,
    S.Struct({
        data: AttachmentLinkEntityDataSchema
    })
);

// Inferred type for the data
export type AttachmentLinkEntityData = S.Schema.Type<typeof AttachmentLinkEntityDataSchema> & JsonObject;

// Entity interface
export interface AttachmentLinkEntity extends BaseEntityWithData<AttachmentLinkEntityData> {}