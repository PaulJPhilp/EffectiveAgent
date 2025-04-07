/**
 * @file Defines the API structure and Tag for the Attachment service.
 */

import type { EntityId } from "@/types.js";
import type {
    AttachmentError,
    AttachmentLinkNotFoundError,
} from "@core/attachment/errors.js";
import type {
    AttachmentLinkEntity,
    AttachmentLinkEntityData,
} from "@core/attachment/schema.js";
import type { RepositoryApi } from "@core/repository/types.js";
import { Context, Effect, Option } from "effect";

// Define the specific Repository Tag needed by the AttachmentApi service
export class AttachmentLinkRepository extends Context.Tag("AttachmentLinkRepository")<
    AttachmentLinkRepository,
    RepositoryApi<AttachmentLinkEntity>
>() { }

// Input type for creating a link (omit system fields)
export type CreateAttachmentLinkInput = Omit<
    AttachmentLinkEntityData,
    "linkType" // Make linkType optional here too if schema allows
> & { linkType?: string }; // Explicitly allow optional linkType

/**
 * Interface defining operations for managing links between entities.
 */
export interface AttachmentApiInterface {
    /** Creates a directional link between two entities. */
    readonly createLink: (
        input: CreateAttachmentLinkInput,
    ) => Effect.Effect<
        AttachmentLinkEntity, // Returns the created link entity
        AttachmentError // R is implicitly never here
    >;

    /** Deletes a link by its unique ID. */
    readonly deleteLink: (
        linkId: EntityId,
    ) => Effect.Effect<
        void,
        AttachmentLinkNotFoundError | AttachmentError // R is implicitly never
    >;

    /** Finds all links originating from a specific entity. */
    readonly findLinksFrom: (
        entityA_id: EntityId,
        entityA_type: string,
    ) => Effect.Effect<
        ReadonlyArray<AttachmentLinkEntity>,
        AttachmentError // R is implicitly never
    >;

    /** Finds all links pointing to a specific entity. */
    readonly findLinksTo: (
        entityB_id: EntityId,
        entityB_type: string,
    ) => Effect.Effect<
        ReadonlyArray<AttachmentLinkEntity>,
        AttachmentError // R is implicitly never
    >;

    /** Gets a specific link by its ID. */
    readonly getLinkById: (
        linkId: EntityId,
    ) => Effect.Effect<
        Option.Option<AttachmentLinkEntity>,
        AttachmentError // R is implicitly never
    >;
}

/** Tag for the AttachmentApi service. */
export class AttachmentApi extends Context.Tag("AttachmentApi")<
    AttachmentApi,
    AttachmentApiInterface
>() { }
