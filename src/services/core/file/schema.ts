/**
 * @file Defines the schema for the File entity stored in the database.
 */

import { BaseEntitySchema } from "@/schema.js"; // Use path alias
import { Schema } from "@effect/schema";

// Helper for EntityId schema
function EntityIdSchema() {
    return Schema.String.pipe(Schema.annotations({ identifier: "EntityId" }));
}

// Define the schema for the 'data' part of the FileEntity
const FileEntityDataSchema = Schema.Struct({
    /** The original filename provided by the user or agent. */
    filename: Schema.String.pipe(Schema.minLength(1)),

    /** The IANA media type (MIME type) of the file (e.g., "text/plain", "image/png"). */
    mimeType: Schema.String.pipe(Schema.minLength(1)),

    /** The size of the file content in bytes (before encoding). */
    sizeBytes: Schema.Number.pipe(Schema.nonNegative()),

    /** The Base64 encoded content of the file. */
    contentBase64: Schema.String, // Store content as Base64 string

    /** The ID of the agent or user who owns/uploaded this file. */
    ownerId: EntityIdSchema(),
});

/**
 * Schema definition for a File entity.
 * Extends BaseEntitySchema and nests file-specific fields under 'data'.
 */
export const FileEntitySchema = Schema.extend(
    BaseEntitySchema,
    Schema.Struct({
        data: FileEntityDataSchema,
    }),
);

/**
 * Inferred TypeScript type for the File entity data payload.
 */
export type FileEntityData = Schema.Schema.Type<typeof FileEntityDataSchema>;

/**
 * Inferred TypeScript type for the complete File entity.
 */
export type FileEntity = Schema.Schema.Type<typeof FileEntitySchema>;
