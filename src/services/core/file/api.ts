/**
 * @file Service API interface for the File service.
 */

import type { EntityId } from "@/types.js";
import type { FileError, FileNotFoundError } from "@core/file/errors.js";
import type { FileEntity } from "@core/file/schema.js";
import { Effect } from "effect";
import type { FileInput, FileInfo } from "@core/file/types.js";

/**
 * Interface defining operations for storing and retrieving file content
 * and metadata from the database. Handles Buffer <-> Base64 conversion.
 */
export interface FileServiceApi {
    /**
     * Stores file metadata and content (as Base64) in the database.
     * @param input Metadata and the raw content Buffer.
     * @returns Effect yielding the created FileEntity (including generated ID/timestamps).
     */
    readonly storeFile: (
        input: FileInput,
    ) => Effect.Effect<FileEntity, FileError, never>;

    /**
     * Retrieves the binary content of a file by its ID (decoding from Base64).
     * @param id The unique ID of the file.
     * @returns Effect yielding the file content as a Buffer.
     */
    readonly retrieveFileContent: (
        id: EntityId,
    ) => Effect.Effect<Buffer, FileNotFoundError | FileError, never>;

    /**
     * Retrieves the metadata/info of a file by its ID (excluding the content).
     * @param id The unique ID of the file.
     * @returns Effect yielding the FileInfo.
     */
    readonly retrieveFileMetadata: (
        id: EntityId,
    ) => Effect.Effect<
        FileInfo,
        FileNotFoundError | FileError,
        never
    >;

    /**
     * Deletes a file record from the database.
     * @param id The unique ID of the file to delete.
     * @returns Effect completing successfully or failing if the file is not found.
     */
    readonly deleteFile: (
        id: EntityId,
    ) => Effect.Effect<void, FileNotFoundError | FileError, never>;

    /**
     * Finds file metadata/info records associated with a specific owner.
     * @param ownerId The ID of the owner (e.g., agent ID).
     * @returns Effect yielding a readonly array of FileInfo records.
     */
    readonly findFilesByOwner: (
        ownerId: EntityId,
    ) => Effect.Effect<
        ReadonlyArray<FileInfo>,
        FileError,
        never
    >;
}
