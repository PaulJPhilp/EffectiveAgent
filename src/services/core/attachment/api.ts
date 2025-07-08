/**
 * @file Service API interface for the Attachment service.
 *
 * The Attachment service manages directional relationships between entities in the system.
 * It provides functionality to create, delete, and query links between any two entities,
 * enabling features like document references, parent-child relationships, and general
 * entity associations.
 *
 * Each link is directional (from entityA to entityB) and includes metadata about the
 * relationship type and any additional attributes specific to that relationship.
 */

import type { EntityId } from "@/types.js";
import { Effect, Option } from "effect";
import type { DrizzleClientApi } from "../repository/implementations/drizzle/config.js";
import type { AttachmentError, AttachmentLinkNotFoundError } from "./errors.js";
import type { AttachmentLinkEntity } from "./schema.js";
import type { CreateAttachmentLinkInput } from "./types.js";

/**
 * Interface defining operations for managing attachment links between entities.
 *
 * @remarks
 * All operations are implemented as Effect-based functions that handle errors
 * through the Effect type system. Operations that might fail return specific
 * error types to enable precise error handling by consumers.
 */
export interface AttachmentServiceApi {
  /**
   * Creates a directional link between two entities.
   *
   * @param input - Configuration object containing source entity (A), target entity (B),
   *               relationship type, and optional metadata.
   * @returns Effect resolving to the created link entity.
   * @throws AttachmentError if the link creation fails.
   *
   * @example
   * ```typescript
   * const link = yield* AttachmentService.createLink({
   *   entityA_id: "doc123",
   *   entityA_type: "Document",
   *   entityB_id: "ref456",
   *   entityB_type: "Reference",
   *   relationType: "references",
   *   metadata: { page: 5 }
   * });
   * ```
   */
  readonly createLink: (
    input: CreateAttachmentLinkInput
  ) => Effect.Effect<AttachmentLinkEntity, AttachmentError, DrizzleClientApi>;

  /**
   * Deletes a link by its unique ID.
   *
   * @param linkId - Unique identifier of the link to delete.
   * @returns Effect resolving to void on successful deletion.
   * @throws AttachmentLinkNotFoundError if the link doesn't exist.
   * @throws AttachmentError for other deletion failures.
   */
  readonly deleteLink: (
    linkId: EntityId
  ) => Effect.Effect<
    void,
    AttachmentLinkNotFoundError | AttachmentError,
    DrizzleClientApi
  >;

  /**
   * Finds all links originating from a specific entity.
   *
   * @param entityA_id - ID of the source entity.
   * @param entityA_type - Type of the source entity.
   * @returns Effect resolving to an array of link entities where entityA is the source.
   * @throws AttachmentError if the query fails.
   */
  readonly findLinksFrom: (
    entityA_id: EntityId,
    entityA_type: string
  ) => Effect.Effect<
    ReadonlyArray<AttachmentLinkEntity>,
    AttachmentError,
    DrizzleClientApi
  >;

  /**
   * Finds all links pointing to a specific entity.
   *
   * @param entityB_id - ID of the target entity.
   * @param entityB_type - Type of the target entity.
   * @returns Effect resolving to an array of link entities where entityB is the target.
   * @throws AttachmentError if the query fails.
   */
  readonly findLinksTo: (
    entityB_id: EntityId,
    entityB_type: string
  ) => Effect.Effect<
    ReadonlyArray<AttachmentLinkEntity>,
    AttachmentError,
    DrizzleClientApi
  >;

  /**
   * Gets a specific link by its ID.
   *
   * @param linkId - Unique identifier of the link to retrieve.
   * @returns Effect resolving to an Option of the link entity (None if not found).
   * @throws AttachmentError if the query fails.
   */
  readonly getLinkById: (
    linkId: EntityId
  ) => Effect.Effect<
    Option.Option<AttachmentLinkEntity>,
    AttachmentError,
    DrizzleClientApi
  >;

  /**
   * Creates multiple directional links in a single operation.
   *
   * @param inputs - Array of link configuration objects.
   * @returns Effect resolving to an array of created link entities.
   * @throws AttachmentError if the bulk creation fails.
   *
   * @example
   * ```typescript
   * const links = yield* AttachmentService.createLinks([
   *   {
   *     entityA_id: "doc123",
   *     entityA_type: "Document",
   *     entityB_id: "ref456",
   *     entityB_type: "Reference"
   *   },
   *   {
   *     entityA_id: "doc123",
   *     entityA_type: "Document",
   *     entityB_id: "img789",
   *     entityB_type: "Image",
   *     metadata: { position: "cover" }
   *   }
   * ]);
   * ```
   */
  readonly createLinks: (
    inputs: ReadonlyArray<CreateAttachmentLinkInput>
  ) => Effect.Effect<
    ReadonlyArray<AttachmentLinkEntity>,
    AttachmentError,
    DrizzleClientApi
  >;

  /**
   * Deletes all links originating from a specific entity.
   *
   * @param entityA_id - ID of the source entity.
   * @param entityA_type - Type of the source entity.
   * @returns Effect resolving to the number of links deleted.
   * @throws AttachmentError if the operation fails.
   *
   * @example
   * ```typescript
   * const deletedCount = yield* AttachmentService.deleteLinksFrom("doc123", "Document");
   * console.log(`Deleted ${deletedCount} links from the document`);
   * ```
   */
  readonly deleteLinksFrom: (
    entityA_id: EntityId,
    entityA_type: string
  ) => Effect.Effect<number, AttachmentError, DrizzleClientApi>;

  /**
   * Deletes all links pointing to a specific entity.
   *
   * @param entityB_id - ID of the target entity.
   * @param entityB_type - Type of the target entity.
   * @returns Effect resolving to the number of links deleted.
   * @throws AttachmentError if the operation fails.
   *
   * @example
   * ```typescript
   * const deletedCount = yield* AttachmentService.deleteLinksTo("file456", "File");
   * console.log(`Deleted ${deletedCount} links to the file`);
   * ```
   */
  readonly deleteLinksTo: (
    entityB_id: EntityId,
    entityB_type: string
  ) => Effect.Effect<number, AttachmentError, DrizzleClientApi>;
}
