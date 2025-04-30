/**
 * @file Defines the API interface for the Tag service.
 */

import type { EntityId } from "@/types.js";
import type { 
  DuplicateTagNameError, 
  LinkAlreadyExistsError, 
  LinkNotFoundError, 
  TagError, 
  TagNotFoundError 
} from "./errors.js";
import type { EntityTagLinkEntity, TagEntity } from "./schema.js";
import { Effect, Option } from "effect";

/**
 * Interface defining operations for managing tags and their associations with entities.
 */
export interface TagServiceApi {
  /**
   * Creates a new tag. Fails if a tag with the same name already exists (case-insensitive check).
   * @param name The name for the new tag.
   * @returns Effect yielding the created TagEntity.
   */
  readonly createTag: (
    name: string,
  ) => Effect.Effect<TagEntity, DuplicateTagNameError | TagError>;

  /**
   * Gets a tag by its unique ID.
   * @param tagId The ID of the tag.
   * @returns Effect yielding an Option of the TagEntity.
   */
  readonly getTagById: (
    tagId: EntityId,
  ) => Effect.Effect<Option.Option<TagEntity>, TagError>;

  /**
   * Gets a tag by its unique name (case-insensitive lookup).
   * @param name The name of the tag.
   * @returns Effect yielding an Option of the TagEntity.
   */
  readonly getTagByName: (
    name: string,
  ) => Effect.Effect<Option.Option<TagEntity>, TagError>;

  /**
   * Finds multiple tags, optionally filtering by name prefix (case-insensitive).
   * @param prefix Optional name prefix to filter by.
   * @returns Effect yielding a ReadonlyArray of matching TagEntities.
   */
  readonly findTags: (
    prefix?: string,
  ) => Effect.Effect<ReadonlyArray<TagEntity>, TagError>;

  /**
   * Associates a tag (by ID) with a specific entity. Creates the link record.
   * Fails if the link already exists or if the tag doesn't exist.
   * @param tagId The ID of the tag.
   * @param entityId The ID of the entity to tag.
   * @param entityType The type of the entity being tagged.
   * @returns Effect yielding the created EntityTagLinkEntity.
   */
  readonly tagEntity: (
    tagId: EntityId,
    entityId: EntityId,
    entityType: string,
  ) => Effect.Effect<EntityTagLinkEntity, TagNotFoundError | LinkAlreadyExistsError | TagError>;

  /**
   * Removes the association between a tag (by ID) and a specific entity. Deletes the link record.
   * Fails if the link doesn't exist.
   * @param tagId The ID of the tag.
   * @param entityId The ID of the entity to untag.
   * @param entityType The type of the entity being untagged.
   * @returns Effect completing successfully or failing with an error.
   */
  readonly untagEntity: (
    tagId: EntityId,
    entityId: EntityId,
    entityType: string,
  ) => Effect.Effect<void, LinkNotFoundError | TagError>;

  /**
   * Gets all tags associated with a specific entity.
   * @param entityId The ID of the entity.
   * @param entityType The type of the entity.
   * @returns Effect yielding a ReadonlyArray of associated TagEntities.
   */
  readonly getTagsForEntity: (
    entityId: EntityId,
    entityType: string,
  ) => Effect.Effect<ReadonlyArray<TagEntity>, TagError>;

  /**
   * Gets all entities associated with a specific tag (by ID).
   * Returns only the IDs and types of the linked entities.
   * @param tagId The ID of the tag.
   * @returns Effect yielding a ReadonlyArray of { entityId, entityType } objects.
   */
  readonly getEntitiesForTag: (
    tagId: EntityId,
  ) => Effect.Effect<ReadonlyArray<{ entityId: EntityId; entityType: string }>, TagError>;
}
