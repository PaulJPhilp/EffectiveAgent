/**
 * @file Implementation of the FileService using Effect.Service pattern.
 * Uses a RepositoryApi<FileEntity> for database interaction.
 * Handles Base64 encoding/decoding for file content.
 */

import { EntityId } from "@/types.js";
import { Effect, Option } from "effect";
import { EntityNotFoundError as RepoEntityNotFoundError } from "../repository/errors.js";
import { RepositoryService } from "../repository/service.js";
import type { FileServiceApi } from "./api.js";
import { FileDbError, FileNotFoundError } from "./errors.js";
import type { FileEntity, FileEntityData } from "./schema.js";
import type { FileInfo, FileInput } from "./types.js";

/**
 * FileService implementation using Effect.Service pattern.
 * This service provides file storage and retrieval functionality.
 */
export class FileService extends Effect.Service<FileServiceApi>()(
    "FileService",
    {
        effect: Effect.gen(function* (_) {
            yield* Effect.logDebug("Initializing FileService");

            // Get repository instance for FileEntity
            const repo = yield* RepositoryService<FileEntity>().Tag;

            const storeFile = (
                input: FileInput,
            ): Effect.Effect<FileEntity, FileDbError> => {
                return Effect.gen(function* () {
                    yield* Effect.logDebug("Storing file", {
                        filename: input.filename,
                        mimeType: input.mimeType,
                        sizeBytes: input.sizeBytes
                    });

                    const contentBase64 = input.content.toString("base64");
                    const entityDataToCreate: FileEntityData = {
                        filename: input.filename,
                        mimeType: input.mimeType,
                        sizeBytes: input.sizeBytes,
                        ownerId: input.ownerId,
                        contentBase64: contentBase64,
                    };

                    const result = yield* repo.create(entityDataToCreate).pipe(
                        // First log the error as a side effect
                        Effect.tapError(
                            (repoError) => Effect.logError("Error from repo.create", repoError)
                        ),
                        // Then transform the error
                        Effect.mapError(
                            (repoError) => new FileDbError({
                                operation: "storeFile",
                                message: "Failed to store file in repository",
                                cause: repoError,
                            })
                        ),
                    );

                    yield* Effect.logDebug("File stored successfully", {
                        fileId: result.id,
                        filename: input.filename
                    });

                    return result;
                });
            };

            const retrieveFileContent = (
                id: EntityId,
            ): Effect.Effect<Buffer, FileNotFoundError | FileDbError> =>
                Effect.gen(function* () {
                    yield* Effect.logDebug("Retrieving file content", { fileId: id });

                    const result = yield* repo.findById(id).pipe(
                        Effect.mapError((repoError) => { // Map findById error first
                            if (repoError instanceof RepoEntityNotFoundError) {
                                return new FileNotFoundError({
                                    fileId: id,
                                    message: "File not found via repository"
                                });
                            }
                            return new FileDbError({
                                operation: "retrieveFileContent",
                                fileId: id,
                                message: "Repository error during findById for content retrieval",
                                cause: repoError,
                            });
                        }),
                        // Now flatMap over Effect<Option<FileEntity>, FileNotFoundError | FileDbError, ...>
                        Effect.flatMap(
                            // Explicitly annotate the return type of this function
                            (
                                option: Option.Option<FileEntity>,
                            ): Effect.Effect<Buffer, FileNotFoundError | FileDbError, never> => // Combined errors
                                Option.match(option, {
                                    // This case should technically be unreachable if findById already failed with FileNotFoundError,
                                    // but we handle it defensively.
                                    onNone: () => Effect.fail(new FileNotFoundError({ fileId: id })),
                                    // If found, decode Base64 string back to Buffer
                                    onSome: (fileEntity) =>
                                        Effect.try({
                                            try: () => Buffer.from(fileEntity.data.contentBase64, "base64"),
                                            // Catch decoding errors
                                            catch: (error) =>
                                                new FileDbError({
                                                    operation: "retrieveFileContent",
                                                    fileId: id,
                                                    message: "Base64 decoding error",
                                                    cause: error,
                                                }),
                                        }),
                                }),
                        ),
                    );

                    yield* Effect.logDebug("File content retrieved successfully", { fileId: id });
                    return result;
                });

            const retrieveFileMetadata = (
                id: EntityId,
            ): Effect.Effect<FileInfo, FileNotFoundError | FileDbError> =>
                repo.findById(id).pipe(
                    Effect.mapError((repoError) => { // Map findById error first
                        if (repoError instanceof RepoEntityNotFoundError) {
                            return new FileNotFoundError({
                                fileId: id,
                                message: "File metadata not found via repository",
                            });
                        }
                        return new FileDbError({
                            operation: "retrieveFileMetadata",
                            fileId: id,
                            message: "Repository error during findById for metadata retrieval",
                            cause: repoError,
                        });
                    }),
                    // Now flatMap over Effect<Option<FileEntity>, FileNotFoundError | FileDbError, ...>
                    Effect.flatMap(
                        // Explicitly annotate the return type of this function
                        (
                            option: Option.Option<FileEntity>,
                        ): Effect.Effect<FileInfo, FileNotFoundError, never> => // Only FileNotFoundError from onNone
                            Option.match(option, {
                                // This case should technically be unreachable if findById already failed with FileNotFoundError
                                onNone: () => Effect.fail(new FileNotFoundError({ fileId: id })),
                                // If found, omit the contentBase64 before returning
                                onSome: (fileEntity) => {
                                    const { contentBase64, ...metadataData } = fileEntity.data;
                                    const result: FileInfo = {
                                        id: fileEntity.id,
                                        createdAt: fileEntity.createdAt.getTime(),
                                        updatedAt: fileEntity.updatedAt.getTime(),
                                        data: metadataData,
                                    };
                                    return Effect.succeed(result);
                                },
                            }),
                    ),
                );

            const deleteFile = (
                id: EntityId,
            ): Effect.Effect<void, FileNotFoundError | FileDbError> =>
                Effect.gen(function* () {
                    yield* Effect.logDebug("Deleting file", { fileId: id });

                    const result = yield* repo.delete(id).pipe(
                        Effect.mapError((repoError) => {
                            if (repoError instanceof RepoEntityNotFoundError) {
                                return new FileNotFoundError({
                                    fileId: id,
                                    message: "File to delete not found via repository"
                                });
                            }
                            return new FileDbError({
                                operation: "deleteFile",
                                fileId: id,
                                message: "Failed to delete file from repository",
                                cause: repoError,
                            });
                        }),
                    );

                    yield* Effect.logDebug("File deleted successfully", { fileId: id });
                    return result;
                });

            const findFilesByOwner = (
                ownerId: EntityId,
            ): Effect.Effect<ReadonlyArray<FileInfo>, FileDbError> =>
                repo.findMany({ filter: { ownerId } }).pipe(
                    Effect.map((entities: ReadonlyArray<FileEntity>) =>
                        entities.map((fileEntity: FileEntity): FileInfo => {
                            const { contentBase64, ...metadataData } = fileEntity.data;
                            return {
                                id: fileEntity.id,
                                createdAt: fileEntity.createdAt.getTime(),
                                updatedAt: fileEntity.updatedAt.getTime(),
                                data: metadataData,
                            };
                        }),
                    ),
                    Effect.mapError(
                        (repoError) =>
                            new FileDbError({
                                operation: "findFilesByOwner",
                                message: `Failed to find files by owner ID ${ownerId}`,
                                cause: repoError,
                            }),
                    ),
                );

            return {
                storeFile,
                retrieveFileContent,
                retrieveFileMetadata,
                deleteFile,
                findFilesByOwner,
            };
        }),
        dependencies: [RepositoryService<FileEntity>().live]
    }
) { }

/**
 * Default export for the FileService.
 */
export default FileService;
