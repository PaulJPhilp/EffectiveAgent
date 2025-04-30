/**
 * @file Implementation of the FileService using Effect.Service pattern.
 * Uses a RepositoryApi<FileEntity> for database interaction.
 * Handles Base64 encoding/decoding for file content.
 */

import type { EntityId } from "@/types.js";
import { FileDbError, FileNotFoundError } from "@core/file/errors.js";
import type { FileEntity, FileEntityData } from "@core/file/schema.js";
import type { FileServiceApi, FileInfo, FileInput } from "@core/file/types.js";
import { EntityNotFoundError as RepoEntityNotFoundError } from "@core/repository/errors.js";
import { RepositoryService } from "@core/repository/service.js";
import type { RepositoryServiceApi } from "@core/repository/api.js";
import { Effect, Layer, Option } from "effect";

/**
 * FileService implementation using Effect.Service pattern.
 * This service provides file storage and retrieval functionality.
 */
export class FileService extends Effect.Service<FileServiceApi>()(
    "FileService",
    {
        effect: Effect.gen(function* (_) {
            // Get repository instance for FileEntity
            const repo = yield* RepositoryService<FileEntity>().Tag;

    const storeFile = (
        input: FileInput,
    ): Effect.Effect<FileEntity, FileDbError> => {
        const contentBase64 = input.content.toString("base64");
        const entityDataToCreate: FileEntityData = {
            filename: input.filename,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            ownerId: input.ownerId,
            contentBase64: contentBase64,
        };

        return repo.create(entityDataToCreate).pipe(
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
    };

    const retrieveFileContent = (
        id: EntityId,
    ): Effect.Effect<Buffer, FileNotFoundError | FileDbError> =>
        repo.findById(id).pipe(
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
                                        message: "Failed to decode Base64 content",
                                        cause: error,
                                    }),
                            }),
                    }),
            ),
        );

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
                                createdAt: fileEntity.createdAt,
                                updatedAt: fileEntity.updatedAt,
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
        repo.delete(id).pipe(
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

    const findFilesByOwner = (
        ownerId: EntityId,
    ): Effect.Effect<ReadonlyArray<FileInfo>, FileDbError> =>
        repo.findMany({ filter: { ownerId } }).pipe(
            Effect.map((entities: ReadonlyArray<FileEntity>) =>
                entities.map((fileEntity: FileEntity): FileInfo => {
                    const { contentBase64, ...metadataData } = fileEntity.data;
                    return {
                        id: fileEntity.id,
                        createdAt: fileEntity.createdAt,
                        updatedAt: fileEntity.updatedAt,
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
        dependencies: []
    }
) {}

/**
 * Live Layer for the FileService.
 * Provides the default file storage and retrieval implementation.
 */
export const FileServiceLive = Layer.succeed(FileService);

/**
 * Default export for the FileService.
 */
export default FileService;
