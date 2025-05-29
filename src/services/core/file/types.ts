/**
 * @file Defines the types for the File service.
 */

import { EntityId, Timestamp } from "@/types.js";
import type { FileServiceApi } from "./api.js";
import { FileEntityData } from "./schema.js";

// Define the input data for storing a file - uses Buffer for content
// Renamed from StoreFileInputData
export interface FileInput {
    /** The file content as a Buffer */
    content: Buffer;
    /** Original name of the file */
    filename: string;
    /** MIME type of the file */
    mimeType: string;
    /** Size of the file in bytes */
    sizeBytes: number;
    /** ID of the entity that owns this file */
    ownerId: EntityId;
    /** Optional metadata */
    metadata?: Record<string, unknown>;
}

// Define a specific type for File Info/Metadata (excluding content)
// Renamed from FileMetadata
export type FileInfo = {
    readonly id: EntityId;
    readonly createdAt: Timestamp;
    readonly updatedAt: Timestamp;
    readonly data: Omit<FileEntityData, "contentBase64">; // Data payload without content
};

// Export the API for backwards compatibility
export type { FileServiceApi };

// No Tag needed here - Effect.Service pattern doesn't use Context.GenericTag
