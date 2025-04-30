/**
 * @file Service API interface for the Attachment service.
 */

import type { EntityId } from "@/types.js";
import type {
    AttachmentError,
    AttachmentLinkNotFoundError,
} from "@core/attachment/errors.js";
import type {
    AttachmentLinkEntity,
} from "@core/attachment/schema.js";
import { Effect, Option } from "effect";
import type { CreateAttachmentLinkInput } from "@core/attachment/types.js";

/**
 * Interface defining operations for managing attachment links between entities.
 */
export interface AttachmentServiceApi {
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
