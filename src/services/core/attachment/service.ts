/**
 * @file Implementation of the AttachmentService using Effect.Service pattern.
 */

import {
    AttachmentDbError,
    AttachmentLinkNotFoundError
} from "@core/attachment/errors.js";
import {
    AttachmentLinkEntity,
    AttachmentLinkEntityData
} from "@core/attachment/schema.js";
import { EntityNotFoundError as RepoEntityNotFoundError } from "@core/repository/errors.js";
import { RepositoryService } from "@core/repository/service.js";
import { Effect, Layer, Option } from "effect";

/**
 * Implementation of the AttachmentService using Effect.Service pattern.
 * Provides methods for creating, querying, and managing attachment links between entities.
 */
export class AttachmentService extends Effect.Service<AttachmentServiceApi>()(
    "AttachmentService",
    {
        effect: Effect.gen(function* (_) {
            // Get repository instance for AttachmentLinkEntity
            const repo = yield* RepositoryService<AttachmentLinkEntity>().Tag;

            const createLink = (
                input: CreateAttachmentLinkInput,
            ): Effect.Effect<AttachmentLinkEntity, AttachmentDbError> => {
                // Construct the data payload for the repository
                const dataToCreate: AttachmentLinkEntityData = {
                    entityA_id: input.entityA_id,
                    entityA_type: input.entityA_type,
                    entityB_id: input.entityB_id,
                    entityB_type: input.entityB_type,
                    linkType: input.linkType, // Pass optional linkType
                };
                return repo.create(dataToCreate).pipe(
                    Effect.mapError(
                        (cause) =>
                            new AttachmentDbError({
                                operation: "createLink",
                                message: "Failed to create attachment link",
                                cause,
                            }),
                    ),
                );
            };

            const deleteLink = (
                linkId: EntityId,
            ): Effect.Effect<void, AttachmentLinkNotFoundError | AttachmentDbError> =>
                repo.delete(linkId).pipe(
                    Effect.mapError((repoError) => {
                        if (repoError instanceof RepoEntityNotFoundError) {
                            return new AttachmentLinkNotFoundError({ linkId });
                        }
                        return new AttachmentDbError({
                            operation: "deleteLink",
                            message: `Failed to delete link ID ${linkId}`,
                            cause: repoError,
                        });
                    }),
                );

            const findLinksFrom = (
                entityA_id: EntityId,
                entityA_type: string,
            ): Effect.Effect<ReadonlyArray<AttachmentLinkEntity>, AttachmentDbError> =>
                repo.findMany({ filter: { entityA_id, entityA_type } }).pipe(
                    Effect.mapError(
                        (cause) =>
                            new AttachmentDbError({
                                operation: "findLinksFrom",
                                message: `Failed to find links from ${entityA_type}:${entityA_id}`,
                                cause,
                            }),
                    ),
                );

            const findLinksTo = (
                entityB_id: EntityId,
                entityB_type: string,
            ): Effect.Effect<ReadonlyArray<AttachmentLinkEntity>, AttachmentDbError> =>
                repo.findMany({ filter: { entityB_id, entityB_type } }).pipe(
                    Effect.mapError(
                        (cause) =>
                            new AttachmentDbError({
                                operation: "findLinksTo",
                                message: `Failed to find links to ${entityB_type}:${entityB_id}`,
                                cause,
                            }),
                    ),
                );

            const getLinkById = (
                linkId: EntityId,
            ): Effect.Effect<Option.Option<AttachmentLinkEntity>, AttachmentDbError> =>
                repo.findById(linkId).pipe(
                    Effect.mapError(
                        (cause) =>
                            new AttachmentDbError({
                                operation: "getLinkById",
                                message: `Failed to get link by ID ${linkId}`,
                                cause,
                            }),
                    ),
                );

            return {
                createLink,
                deleteLink,
                findLinksFrom,
                findLinksTo,
                getLinkById,
            };
        }),
        dependencies: [] // No explicit dependencies here as they're provided through the layer system
    }
) { }

/**
 * Live Layer for the AttachmentService.
 * Provides the default implementation for attachment link operations.
 */
export const AttachmentServiceLive = Layer.succeed(AttachmentService);

/**
 * Default export for the AttachmentService.
 */
export default AttachmentService;
