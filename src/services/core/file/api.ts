/**
 * @file Service API interface for the File service.
 *
 * The File service provides a unified interface for storing and retrieving files
 * and their associated metadata in the system. It handles all aspects of file
 * management including:
 * - Storage and retrieval of file content
 * - Management of file metadata
 * - Automatic Base64 encoding/decoding of binary content
 * - Association of files with owners
 * - Content type and size tracking
 *
 * Files are stored with their content encoded in Base64 format in the database,
 * along with metadata such as original filename, content type, and size.
 */

import { Effect } from "effect";
import type { EntityId } from "../../../types.js";
import type { DrizzleClientApi } from "../repository/implementations/drizzle/config.js";
import type { FileError, FileNotFoundError } from "./errors.js";
import type { FileEntity } from "./schema.js";
import type { FileInfo, FileInput } from "./types.js";

/**
 * Interface defining operations for storing and retrieving file content
 * and metadata from the database.
 *
 * @remarks
 * All file content is automatically converted between Buffer and Base64 formats
 * during storage and retrieval. This ensures consistent storage in the database
 * while providing convenient Buffer interfaces for consumers.
 *
 * Files are immutable once stored - to modify a file, you must delete the old
 * version and store a new one. This ensures consistency and simplifies the
 * implementation.
 */
export interface FileServiceApi {
  /**
   * Stores file metadata and content in the database.
   *
   * @param input - Object containing:
   *               - content: The file content as a Buffer
   *               - filename: Original name of the file
   *               - contentType: MIME type of the file
   *               - ownerId: ID of the entity that owns this file
   * @returns Effect resolving to the created FileEntity, including generated ID and timestamps
   * @throws FileError if the file cannot be stored
   *
   * @remarks
   * The file content is automatically converted to Base64 format before storage.
   * The size is automatically calculated from the input Buffer.
   *
   * @example
   * ```typescript
   * const file = yield* FileService.storeFile({
   *   content: Buffer.from('Hello World'),
   *   filename: 'hello.txt',
   *   contentType: 'text/plain',
   *   ownerId: 'user123'
   * });
   * ```
   */
  readonly storeFile: (
    input: FileInput
  ) => Effect.Effect<FileEntity, FileError, DrizzleClientApi>;

  /**
   * Retrieves the binary content of a file by its ID.
   *
   * @param id - Unique identifier of the file to retrieve
   * @returns Effect resolving to the file content as a Buffer
   * @throws FileNotFoundError if the file doesn't exist
   * @throws FileError if the content cannot be retrieved or decoded
   *
   * @remarks
   * The stored Base64 content is automatically decoded back to a Buffer.
   * For large files, consider implementing streaming in the future.
   */
  readonly retrieveFileContent: (
    id: EntityId
  ) => Effect.Effect<Buffer, FileNotFoundError | FileError, DrizzleClientApi>;

  /**
   * Retrieves the metadata/info of a file by its ID (excluding the content).
   *
   * @param id - Unique identifier of the file
   * @returns Effect resolving to the FileInfo containing metadata like filename,
   *          content type, size, and timestamps
   * @throws FileNotFoundError if the file doesn't exist
   * @throws FileError if the metadata cannot be retrieved
   *
   * @remarks
   * This is more efficient than retrieveFileContent when you only need metadata,
   * as it doesn't transfer or decode the file content.
   */
  readonly retrieveFileMetadata: (
    id: EntityId
  ) => Effect.Effect<FileInfo, FileNotFoundError | FileError, DrizzleClientApi>;

  /**
   * Deletes a file and its metadata from the database.
   *
   * @param id - Unique identifier of the file to delete
   * @returns Effect resolving to void on successful deletion
   * @throws FileNotFoundError if the file doesn't exist
   * @throws FileError if the deletion fails
   *
   * @remarks
   * This operation is permanent and cannot be undone. Consider implementing
   * soft delete if needed in the future.
   */
  readonly deleteFile: (
    id: EntityId
  ) => Effect.Effect<void, FileNotFoundError | FileError, DrizzleClientApi>;

  /**
   * Finds all files associated with a specific owner.
   *
   * @param ownerId - ID of the owner entity (e.g., user ID, agent ID)
   * @returns Effect resolving to a readonly array of FileInfo records
   * @throws FileError if the query fails
   *
   * @remarks
   * Returns only metadata for efficiency. To get file contents, call
   * retrieveFileContent separately for each file of interest.
   *
   * @example
   * ```typescript
   * const files = yield* FileService.findFilesByOwner('user123');
   * for (const file of files) {
   *   console.log(`${file.filename}: ${file.size} bytes`);
   * }
   * ```
   */
  readonly findFilesByOwner: (
    ownerId: EntityId
  ) => Effect.Effect<ReadonlyArray<FileInfo>, FileError, DrizzleClientApi>;
}
