/**
 * @file Defines specific error types for the FileSystem service.
 * @module services/core/filesystem/errors
 */

import { Data } from "effect";

/**
 * Base error class for FileSystem service errors
 */
export class FileSystemError extends Data.TaggedError("FileSystemError")<{
  /** Description of what went wrong */
  description: string;
  /** Module where the error occurred */
  module: string;
  /** Method where the error occurred */
  method: string;
  /** Optional underlying cause */
  cause?: unknown;
}> {}
