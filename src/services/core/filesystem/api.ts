/**
 * @file Defines the API interface for the FileSystem service.
 * @module services/core/filesystem/api
 */

import { Effect } from "effect";
import type { FileSystemError } from "./errors.js";

/**
 * API interface for the FileSystem service.
 * Provides low-level file system operations.
 */
export interface FileSystemServiceApi {
  /**
   * Read a file's contents as a string
   * @param path Path to the file relative to basePath
   * @returns Effect yielding the file contents
   */
  readonly readFile: (path: string) => Effect.Effect<string, FileSystemError>;

  /**
   * Write content to a file
   * @param path Path to the file relative to basePath
   * @param content Content to write
   * @returns Effect yielding void on success
   */
  readonly writeFile: (path: string, content: string) => Effect.Effect<void, FileSystemError>;

  /**
   * Check if a file exists
   * @param path Path to check relative to basePath
   * @returns Effect yielding boolean indicating existence
   */
  readonly exists: (path: string) => Effect.Effect<boolean, FileSystemError>;
}
