/**
 * @file Implements the FileSystem service for handling file system operations.
 * @module services/core/filesystem/service
 */

import { FileSystem } from "@effect/platform/FileSystem";
import { Effect } from "effect";
import type { FileSystemServiceApi } from "./api.js";
import { FileSystemError } from "./errors.js";

/**
 * Service for handling file system operations.
 * Uses Effect's FileSystem module for implementation.
 */
export class FileSystemService extends Effect.Service<FileSystemServiceApi>()(
  "FileSystemService",
  {
    effect: Effect.gen(function* () {
      // Get Effect's FileSystem
      const fs = yield* FileSystem;

      return {
        readFile: (path: string) => Effect.gen(function* () {
          try {
            const content = yield* fs.readFileString(path);
            return content;
          } catch (error) {
            return yield* Effect.fail(new FileSystemError({
              description: "Failed to read file",
              module: "FileSystemService",
              method: "readFile",
              cause: error
            }));
          }
        }),

        writeFile: (path: string, content: string) => Effect.gen(function* () {
          try {
            yield* fs.writeFileString(path, content);
          } catch (error) {
            return yield* Effect.fail(new FileSystemError({
              description: "Failed to write file",
              module: "FileSystemService",
              method: "writeFile",
              cause: error
            }));
          }
        }),

        exists: (path: string) => Effect.gen(function* () {
          try {
            const exists = yield* fs.exists(path);
            return exists;
          } catch (error) {
            return yield* Effect.fail(new FileSystemError({
              description: "Failed to check file existence",
              module: "FileSystemService",
              method: "exists",
              cause: error
            }));
          }
        })
      };
    })
  }
) { }
