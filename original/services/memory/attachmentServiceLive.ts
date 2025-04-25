// src/attachment/attachment-service-live.ts (Example path)
import { Effect, Layer, ReadonlyArray } from "effect";
import { FileService, IFileService } from "../file/file-service"; // Adjust path
import { ILoggingService, LoggingService } from "../logging/types"; // Adjust path
import { EntityNotFoundError as RepoEntityNotFoundError, RepositoryError as RepoError } from "../repository/errors"; // Adjust path
import { IRepositoryService, RepositoryService } from "../repository/repository-service"; // Adjust path
import {
    type AttachmentEntityData, AttachmentExistsError, type AttachmentInfo,AttachmentNotFoundError,AttachmentService, FileNotFoundError, FileStorageError, // Import errors
    GenericAttachmentError, 
    type IAttachmentService, 
} from "./attachment-service"; // Adjust path

export class AttachmentServiceLive implements IAttachmentService {
    constructor(
        private readonly repository: IRepositoryService<AttachmentEntityData>,
        private readonly fileService: IFileService,
        private readonly logging: ILoggingService
    ) { }

    // Helper to map repo errors specifically for attachment entity
    private mapRepoError = (error: unknown, conversationId?: string, fileId?: string): AttachmentError => {
        if (error instanceof RepoEntityNotFoundError && conversationId && fileId) {
            return new AttachmentNotFoundError({ conversationId, fileId, message: `Attachment link not found: ${error.message}`, cause: error });
        }
        if (error instanceof RepoEntityNotFoundError) {
            // Should have context if mapping from repo error in context
            return new GenericAttachmentError({ message: `Repository entity not found: ${error.message}`, cause: error });
        }
        // Map RepoError and others to GenericAttachmentError
        return new GenericAttachmentError({ message: "Attachment repository operation failed", cause: error });
    }

    attachFile = (params: { conversationId: string; fileId: string }) =>
        Effect.gen(function* (_) {
            const log = yield* _(this.logging.getLogger("AttachmentService"));

            // 1. Verify File Exists (propagates FileNotFoundError/FileStorageError)
            yield* _(this.fileService.getFileMetadata({ fileId: params.fileId }));

            // 2. Check Existing Attachment
            const existing = yield* _(
                this.repository.find({ conversationId: params.conversationId, fileId: params.fileId })
                    .pipe(Effect.mapError(e => this.mapRepoError(e)))
            );
            if (existing.length > 0) {
                return yield* _(Effect.fail(new AttachmentExistsError({ conversationId: params.conversationId, fileId: params.fileId, message: "File already attached to this conversation" })));
            }

            // 3. Increment Ref Count (propagates FileNotFoundError/FileStorageError)
            // Use bracket notation for Effect.tapError to avoid breaking gen chain on expected errors
            yield* _(this.fileService.incrementReferenceCount({ fileId: params.fileId }), Effect.tapError(error => log.warn("Increment ref count failed (will attempt compensation if needed)", { error })));

            // 4. Create Attachment Record
            const attachmentData: AttachmentEntityData = {
                conversationId: params.conversationId,
                fileId: params.fileId,
                attachedAt: new Date(),
            };
            yield* _(
                this.repository.create(attachmentData).pipe(
                    Effect.mapError(e => this.mapRepoError(e)),
                    // 5. Compensation on Create Failure
                    Effect.catchAll((createError) =>
                        Effect.gen(function* (__) {
                            yield* __(log.error("Failed to create attachment record after incrementing ref count, attempting compensation", { createError }));
                            // Attempt to decrement - log if it fails but don't fail the overall operation with *this* error
                            yield* __(
                                this.fileService.decrementReferenceCount({ fileId: params.fileId }),
                                Effect.catchAll((decrementError) => log.error("Compensation (decrement ref count) failed", { decrementError }))
                            );
                            // Fail with the original creation error
                            return yield* __(Effect.fail(createError));
                        })
                    )
                )
            );

            yield* _(log.info("File attached successfully", { conversationId: params.conversationId, fileId: params.fileId }));

        }).pipe(Effect.annotateLogs({ service: "AttachmentService", method: "attachFile" }));


    listAttachments = (params: { conversationId: string }) =>
        Effect.gen(function* (_) {
            const log = yield* _(this.logging.getLogger("AttachmentService"));

            // 1. Find Attachment Links
            const attachmentEntities = yield* _(
                this.repository.find({ conversationId: params.conversationId })
                    .pipe(Effect.mapError(e => this.mapRepoError(e)))
            );

            if (attachmentEntities.length === 0) {
                return ReadonlyArray.empty<AttachmentInfo>();
            }

            // 2. Fetch Metadata for each link
            const infoEffects = attachmentEntities.map(entity =>
                this.fileService.getFileMetadata({ fileId: entity.data.fileId }).pipe(
                    Effect.map(metadata => ({ // Combine into AttachmentInfo
                        fileId: metadata.fileId,
                        filename: metadata.filename,
                        mimeType: metadata.mimeType,
                        sizeBytes: metadata.sizeBytes,
                        attachedAt: entity.data.attachedAt,
                    } satisfies AttachmentInfo)),
                    Effect.catchTag("FileNotFoundError", (error) => {
                        // Handle inconsistency: log and skip this attachment
                        log.warn("Attachment link found, but file metadata missing", { conversationId: params.conversationId, fileId: entity.data.fileId, error });
                        return Effect.succeedNone; // Use Option to filter out later
                    }),
                    Effect.catchTag("FileStorageError", (error) => {
                        // Handle inconsistency: log and skip this attachment
                        log.error("Failed to get file metadata for attachment", { conversationId: params.conversationId, fileId: entity.data.fileId, error });
                        return Effect.succeedNone; // Use Option to filter out later
                    })
                )
            );

            // 3. Execute fetches and filter out failures/skips
            const results = yield* _(Effect.all(infoEffects, { concurrency: 5 })); // Fetch metadata concurrently
            const successfulInfos = ReadonlyArray.getSomes(results); // Filter out None values

            return successfulInfos;

        }).pipe(Effect.annotateLogs({ service: "AttachmentService", method: "listAttachments" }));


    removeAttachment = (params: { conversationId: string; fileId: string }) =>
        Effect.gen(function* (_) {
            const log = yield* _(this.logging.getLogger("AttachmentService"));

            // 1. Find Attachment Link
            const existing = yield* _(
                this.repository.find({ conversationId: params.conversationId, fileId: params.fileId })
                    .pipe(Effect.mapError(e => this.mapRepoError(e)))
            );

            if (existing.length === 0) {
                return yield* _(Effect.fail(new AttachmentNotFoundError({ conversationId: params.conversationId, fileId: params.fileId, message: "Attachment link not found" })));
            }
            const attachmentId = existing[0].id;

            // 2. Delete Attachment Record
            yield* _(
                this.repository.delete(attachmentId).pipe(
                    // Don't fail if already deleted somehow
                    Effect.catchTag("EntityNotFoundError", () => Effect.void),
                    Effect.mapError(e => this.mapRepoError(e))
                )
            );

            // 3. Decrement Ref Count (propagates FileNotFoundError/FileStorageError)
            yield* _(
                this.fileService.decrementReferenceCount({ fileId: params.fileId }).pipe(
                    Effect.catchAll((error) => {
                        // Log error if decrement fails, but don't fail the removeAttachment operation itself
                        log.error("Failed to decrement file reference count after removing attachment link (potential orphan)", { conversationId: params.conversationId, fileId: params.fileId, error });
                        // If FileNotFoundError, it indicates inconsistency, log it.
                        // If FileStorageError, log it.
                        return Effect.void; // Succeed the removal operation anyway
                    })
                )
            );

            yield* _(log.info("Attachment removed successfully", { conversationId: params.conversationId, fileId: params.fileId }));

        }).pipe(Effect.annotateLogs({ service: "AttachmentService", method: "removeAttachment" }));

}

// Layer for the Live Service
export const AttachmentServiceLiveLayer = Layer.effect(
    AttachmentService,
    Effect.gen(function* (_) {
        const logSvc = yield* _(LoggingService);
        const repoSvc = yield* _(RepositoryService); // Get the generic repo
        const fileSvc = yield* _(FileService);     // Get the file service
        return new AttachmentServiceLive(repoSvc, fileSvc, logSvc);
    })
);
