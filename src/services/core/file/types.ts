/**
 * @file Defines the types for the File service.
 */

import type { EntityId, Timestamp } from "../../../types.js";
import type { FileServiceApi } from "./api.js";
import type { FileEntityData } from "./schema.js";

// Define the input data for storing a file - uses Buffer for content
// Renamed from StoreFileInputData
export type FileInput = Omit<FileEntityData, "contentBase64"> & {
    content: Buffer; // Accept raw Buffer as input
};

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
