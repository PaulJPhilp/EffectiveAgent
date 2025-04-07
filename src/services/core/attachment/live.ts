/**
 * @file Live implementation of the AttachmentApi service.
 */

import type { EntityId } from "@/types.js";
import type {
    AttachmentLinkEntity,
    AttachmentLinkEntityData,
} from "@core/attachment/schema.js";
import { EntityNotFoundError as RepoEntityNotFoundError } from "@core/repository/errors.js";
import {
    AttachmentDbError,
    AttachmentLinkNotFoundError,
} from "@services/core/attachment/errors.js";
import {
    AttachmentApi,
    AttachmentLinkRepository,
    CreateAttachmentLinkInput,
} from "@services/core/attachment/types.js";
import { Effect, Layer, Option } from "effect";

// Implementation Factory
export const make = Effect.gen(function* () {
    const repo = yield* AttachmentLinkRepository;

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
});

// Live Layer
export const AttachmentApiLiveLayer = Layer.effect(
    AttachmentApi,
    make
);
