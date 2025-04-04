// src/file/file-service-live.ts (Example path)
import { Effect, Layer, ReadonlyArray } from "effect";
import { type Readable } from "stream";
import {
    type IFileService, FileService, type FileMetadata, type FileMetadataEntityData,
    DataValidationError, FileNotFoundError, FileStorageError, InvalidReferenceOperationError,
    IContentStorage, ContentStorageTag, // Import internal interface and Tag
} from "./file-service"; // Adjust path
import { ILoggingService, LoggingService } from "../logging/types"; // Adjust path
import { IRepositoryService, RepositoryService, type BaseEntity } from "../repository/repository-service"; // Adjust path
import { EntityNotFoundError as RepoEntityNotFoundError } from "../repository/errors"; // Adjust path

// Helper to map Repo Entity to public FileMetadata
const mapEntityToMetadata = (entity: BaseEntity<FileMetadataEntityData>): FileMetadata => ({
    fileId: entity.id,
    filename: entity.data.filename,
    mimeType: entity.data.mimeType,
    sizeBytes: entity.data.sizeBytes,
    userId: entity.data.userId,
    referenceCount: entity.data.referenceCount,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
});

export class FileServiceLive implements IFileService {
    constructor(
        private readonly repository: IRepositoryService<FileMetadataEntityData>,
        private readonly contentStorage: IContentStorage,
        private readonly logging: ILoggingService
        // private readonly configService: ConfigurationService // To get storageLocation etc.
    ) { }

    // Internal helper to get metadata entity, mapping errors
    private getMetadataEntity = (fileId: string) =>
        this.repository.findById({ id: fileId }).pipe(
            Effect.mapError(error =>
                error instanceof RepoEntityNotFoundError
                    ? new FileNotFoundError({ fileId, message: `File metadata not found for id ${fileId}`, cause: error })
                    : new FileStorageError({ message: "Failed to retrieve file metadata", fileId, cause: error })
            )
        );

    uploadFile = (params: { userId: string; filename: string; mimeType: string; contentStream: Readable }) =>
        Effect.gen(function* (_) {
            const log = yield* _(this.logging.getLogger("FileService"));
            // Basic input validation
            if (!params.filename || !params.mimeType || !params.userId) {
                return yield* _(Effect.fail(new DataValidationError({ message: "userId, filename, and mimeType are required" })));
            }

            // Store content first
            const { storageRef, sizeBytes } = yield* _(
                this.contentStorage.store(params.contentStream)
                // FileStorageError is already the correct type from IContentStorage
            );

            // Create metadata
            const metadataToCreate: FileMetadataEntityData = {
                filename: params.filename,
                mimeType: params.mimeType,
                sizeBytes: sizeBytes,
                userId: params.userId,
                referenceCount: 0, // Initial count is 0
                storageLocation: "mock", // Hardcoded for mock, get from config in real impl
                storageRef: storageRef,
            };

            const createdEntity = yield* _(
                this.repository.create(metadataToCreate).pipe(
                    Effect.mapError(cause => new FileStorageError({ message: "Failed to create file metadata", cause }))
                    // If create fails, ideally we should try to delete the stored content
                    // Effect.onError((cause) => log.error("Metadata creation failed, attempting content cleanup", { storageRef, cause })) // Log error
                    // Effect.onError(() => this.contentStorage.delete(storageRef)) // Attempt cleanup
                )
            );

            const metadata = mapEntityToMetadata(createdEntity);
            yield* _(log.info("File uploaded successfully", { fileId: metadata.fileId, userId: params.userId }));
            return { fileId: metadata.fileId, metadata };

        }).pipe(Effect.annotateLogs({ service: "FileService", method: "uploadFile" }));


    getFileMetadata = (params: { fileId: string }) =>
        this.getMetadataEntity(params.fileId).pipe(
            Effect.map(mapEntityToMetadata),
            Effect.annotateLogs({ service: "FileService", method: "getFileMetadata" })
        );


    getFileStream = (params: { fileId: string }) =>
        Effect.gen(function* (_) {
            const entity = yield* _(this.getMetadataEntity(params.fileId));
            // In real impl, check entity.data.storageLocation and use correct storage impl
            const stream = yield* _(this.contentStorage.retrieve(entity.data.storageRef));
            return stream;
        }).pipe(Effect.annotateLogs({ service: "FileService", method: "getFileStream" }));


    listFiles = (params: { userId: string }) =>
        Effect.gen(function* (_) {
            const entities = yield* _(
                this.repository.find({ userId: params.userId }).pipe(
                    Effect.mapError(cause => new FileStorageError({ message: "Failed to list files", cause }))
                )
            );
            const metadataList = entities.map(mapEntityToMetadata);
            return ReadonlyArray.fromIterable(metadataList);
        }).pipe(Effect.annotateLogs({ service: "FileService", method: "listFiles" }));


    incrementReferenceCount = (params: { fileId: string }) =>
        Effect.gen(function* (_) {
            const log = yield* _(this.logging.getLogger("FileService"));
            // Attempt atomic increment via update
            // Note: Mock repo simulates this with specific update structure
            const updateResult = yield* _(
                this.repository.update(params.fileId, { $increment: { referenceCount: 1 } }).pipe(
                    Effect.mapError(error =>
                        error instanceof RepoEntityNotFoundError
                            ? new FileNotFoundError({ fileId: params.fileId, message: `File metadata not found for increment ref count`, cause: error })
                            : new FileStorageError({ message: "Failed to increment reference count", fileId: params.fileId, cause: error })
                    )
                )
            );
            yield* _(log.debug("Incremented reference count", { fileId: params.fileId, newCount: updateResult.data.referenceCount }));
        }).pipe(Effect.annotateLogs({ service: "FileService", method: "incrementReferenceCount" }));


    decrementReferenceCount = (params: { fileId: string }) =>
        Effect.gen(function* (_) {
            const log = yield* _(this.logging.getLogger("FileService"));

            // Need to get current count first if update isn't atomic returning
            // Or use atomic decrement if repo supports it
            const initialEntity = yield* _(this.getMetadataEntity(params.fileId)); // Handles FileNotFoundError

            if (initialEntity.data.referenceCount <= 0) {
                // Log warning or potentially throw InvalidReferenceOperationError
                yield* _(log.warn("Attempted to decrement reference count at or below zero", { fileId: params.fileId, currentCount: initialEntity.data.referenceCount }));
                // Optionally fail: return yield* _(Effect.fail(new InvalidReferenceOperationError({...})));
                // For now, let's allow it but it won't trigger deletion unless it *becomes* zero.
            }

            // Attempt atomic decrement via update
            const updatedEntity = yield* _(
                this.repository.update(params.fileId, { $increment: { referenceCount: -1 } }).pipe(
                    Effect.mapError(error =>
                        error instanceof RepoEntityNotFoundError // Should not happen if getMetadataEntity succeeded
                            ? new FileNotFoundError({ fileId: params.fileId, message: `File metadata disappeared before decrement ref count`, cause: error })
                            : new FileStorageError({ message: "Failed to decrement reference count", fileId: params.fileId, cause: error })
                    )
                )
            );

            const newCount = updatedEntity.data.referenceCount;
            yield* _(log.debug("Decremented reference count", { fileId: params.fileId, newCount }));

            // Check for deletion
            if (newCount <= 0) {
                yield* _(log.info("Reference count reached zero, initiating deletion", { fileId: params.fileId }));
                const storageRef = updatedEntity.data.storageRef;

                // Delete content first
                yield* _(
                    this.contentStorage.delete(storageRef).pipe(
                        Effect.catchAll((error) => {
                            // Log content deletion error but proceed to delete metadata
                            log.error("Failed to delete file content, proceeding with metadata deletion", { fileId: params.fileId, storageRef, error });
                            return Effect.void; // Don't fail the whole operation here
                        })
                    )
                );

                // Delete metadata
                yield* _(
                    this.repository.delete(params.fileId).pipe(
                        Effect.catchAll((error) => {
                            // Log metadata deletion error
                            log.error("Failed to delete file metadata after content deletion attempt", { fileId: params.fileId, error });
                            // Propagate this error? If metadata delete fails, file is orphaned.
                            return Effect.fail(new FileStorageError({ message: "Failed to delete file metadata during cleanup", fileId: params.fileId, cause: error }));
                        })
                    )
                );
                yield* _(log.info("File deleted successfully after ref count reached zero", { fileId: params.fileId }));
            }
        }).pipe(Effect.annotateLogs({ service: "FileService", method: "decrementReferenceCount" }));

}

// Layer for the Live Service
export const FileServiceLiveLayer = Layer.effect(
    FileService,
    Effect.gen(function* (_) {
        const logSvc = yield* _(LoggingService);
        const repoSvc = yield* _(RepositoryService); // Get the generic repo
        const contentStorage = yield* _(ContentStorageTag); // Get the content storage impl
        // const configSvc = yield* _(ConfigurationService); // Get config if needed
        return new FileServiceLive(repoSvc, contentStorage, logSvc);
    })
);