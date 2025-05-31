/**
 * @file Defines the schema for the File entity stored in the database.
 */

import { BaseEntitySchema } from "@/schema.js"; // Use path alias
import { Schema as S } from "effect";

// Helper for EntityId schema
function EntityIdSchema() {
    return S.String.pipe(S.annotations({ identifier: "EntityId" }));
}

// Define the schema for the 'data' part of the FileEntity
const FileEntityDataSchema = S.Struct({
    /** The original filename provided by the user or agent. */
    filename: S.String.pipe(S.minLength(1)),

    /** The IANA media type (MIME type) of the file (e.g., "text/plain", "image/png"). */
    mimeType: S.String.pipe(S.minLength(1)),

    /** The size of the file content in bytes (before encoding). */
    sizeBytes: S.Number.pipe(S.nonNegative()),

    /** The Base64 encoded content of the file. */
    contentBase64: S.String, // Store content as Base64 string

    /** The ID of the agent or user who owns/uploaded this file. */
    ownerId: EntityIdSchema(),
});

/**
 * Schema definition for a File entity.
 * Extends BaseEntitySchema and nests file-specific fields under 'data'.
 */
export const FileEntitySchema = S.extend(
    BaseEntitySchema,
    S.Struct({
        data: FileEntityDataSchema,
    }),
);

/**
 * Inferred TypeScript type for the File entity data payload.
 */
export type FileEntityData = S.Schema.Type<typeof FileEntityDataSchema>;

/**
 * Inferred TypeScript type for the complete File entity.
 */
export type FileEntity = S.Schema.Type<typeof FileEntitySchema>;
