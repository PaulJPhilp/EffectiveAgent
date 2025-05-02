/**
 * @file Defines the API interface for the Tag service.
 *
 * The Tag service provides a flexible tagging system that allows any entity in the
 * system to be tagged with one or more labels. Tags are normalized (case-insensitive)
 * and unique within the system. The service supports:
 *
 * - Creating and retrieving tags
 * - Associating tags with any entity type
 * - Finding entities by tags
 * - Finding tags by prefix
 * - Managing tag-entity relationships
 *
 * Tags are useful for categorization, filtering, and creating ad-hoc relationships
 * between entities that may not have explicit relationships otherwise.
 */

import type { EntityId } from "@/types.js";
import type { 
  DuplicateTagNameError, 
  LinkAlreadyExistsError, 
  LinkNotFoundError, 
  TagError, 
  TagNotFoundError 
} from "@core/tag/errors.js";
import type { EntityTagLinkEntity, TagEntity } from "@core/tag/schema.js";
import { Effect, Option } from "effect";

/**
 * Interface defining operations for managing tags and their associations with entities.
 *
 * @remarks
 * All tag names are normalized to lowercase for consistency. Tag-entity relationships
 * are tracked through a separate link entity that maintains the many-to-many
 * relationships between tags and entities.
 *
 * @example
 * ```typescript
 * // Create a tag
 * const tag = yield* TagService.createTag("important");
 *
 * // Tag a document
 * yield* TagService.tagEntity(tag.id, "doc123", "Document");
 *
 * // Find all important documents
 * const entities = yield* TagService.getEntitiesForTag(tag.id);
 * ```
 */
export interface TagServiceApi {
  /**
   * Creates a new tag in the system.
   *
   * @param name - The name for the new tag
   * @returns Effect resolving to the created TagEntity
   * @throws DuplicateTagNameError if a tag with the same name exists (case-insensitive)
   * @throws TagError if the creation fails for other reasons
   *
   * @remarks
   * Tag names are automatically normalized to lowercase for storage and comparison.
   * This ensures consistent lookup regardless of the case used in queries.
   *
   * @example
   * ```typescript
   * const tag = yield* TagService.createTag("Important");
   * console.log(tag.data.name); // "important"
   * ```
   */
  readonly createTag: (
    name: string,
  ) => Effect.Effect<TagEntity, DuplicateTagNameError | TagError>;

  /**
   * Gets a tag by its unique ID.
   *
   * @param tagId - The ID of the tag to retrieve
   * @returns Effect resolving to an Option of the TagEntity (None if not found)
   * @throws TagError if the query fails
   *
   * @remarks
   * This method returns an Option rather than throwing a NotFound error
   * to better handle the common case of checking for tag existence.
   */
  readonly getTagById: (
    tagId: EntityId,
  ) => Effect.Effect<Option.Option<TagEntity>, TagError>;

  /**
   * Gets a tag by its unique name.
   *
   * @param name - The name of the tag to retrieve
   * @returns Effect resolving to an Option of the TagEntity (None if not found)
   * @throws TagError if the query fails
   *
   * @remarks
   * The lookup is case-insensitive. The name is normalized to lowercase
   * before querying, so "Important" and "important" will return the same tag.
   */
  readonly getTagByName: (
    name: string,
  ) => Effect.Effect<Option.Option<TagEntity>, TagError>;

  /**
   * Finds multiple tags, optionally filtering by name prefix.
   *
   * @param prefix - Optional name prefix to filter by
   * @returns Effect resolving to a ReadonlyArray of matching TagEntities
   * @throws TagError if the query fails
   *
   * @remarks
   * The prefix matching is case-insensitive. If no prefix is provided,
   * returns all tags in the system. Results are ordered alphabetically
   * by name.
   *
   * @example
   * ```typescript
   * // Find all tags starting with "prod"
   * const tags = yield* TagService.findTags("prod");
   * // Might return: ["production", "product", "prototype"]
   * ```
   */
  readonly findTags: (
    prefix?: string,
  ) => Effect.Effect<ReadonlyArray<TagEntity>, TagError>;

  /**
   * Associates a tag with a specific entity.
   *
   * @param tagId - The ID of the tag to associate
   * @param entityId - The ID of the entity to tag
   * @param entityType - The type of the entity (e.g., "Document", "User")
   * @returns Effect resolving to the created EntityTagLinkEntity
   * @throws TagNotFoundError if the specified tag doesn't exist
   * @throws LinkAlreadyExistsError if this exact tag-entity association already exists
   * @throws TagError if the operation fails for other reasons
   *
   * @remarks
   * This creates a directional relationship from the entity to the tag.
   * The entityType parameter helps maintain type safety and allows for
   * efficient querying of tagged entities of a specific type.
   *
   * @example
   * ```typescript
   * // Tag a document as important
   * const link = yield* TagService.tagEntity(
   *   importantTag.id,
   *   "doc123",
   *   "Document"
   * );
   * ```
   */
  readonly tagEntity: (
    tagId: EntityId,
    entityId: EntityId,
    entityType: string,
  ) => Effect.Effect<EntityTagLinkEntity, TagNotFoundError | LinkAlreadyExistsError | TagError>;

  /**
   * Removes a tag from a specific entity.
   *
   * @param tagId - The ID of the tag to remove
   * @param entityId - The ID of the entity to untag
   * @param entityType - The type of the entity
   * @returns Effect resolving to void on successful removal
   * @throws LinkNotFoundError if the tag-entity association doesn't exist
   * @throws TagError if the operation fails for other reasons
   *
   * @remarks
   * This operation only removes the association between the tag and entity.
   * It does not delete either the tag or the entity themselves.
   */
  readonly untagEntity: (
    tagId: EntityId,
    entityId: EntityId,
    entityType: string,
  ) => Effect.Effect<void, LinkNotFoundError | TagError>;

  /**
   * Gets all tags associated with a specific entity.
   *
   * @param entityId - The ID of the entity to get tags for
   * @param entityType - The type of the entity
   * @returns Effect resolving to a ReadonlyArray of associated TagEntities
   * @throws TagError if the query fails
   *
   * @remarks
   * Returns an empty array if the entity exists but has no tags.
   * The tags are returned in alphabetical order by name.
   *
   * @example
   * ```typescript
   * // Get all tags for a document
   * const tags = yield* TagService.getTagsForEntity(
   *   "doc123",
   *   "Document"
   * );
   * ```
   */
  readonly getTagsForEntity: (
    entityId: EntityId,
    entityType: string,
  ) => Effect.Effect<ReadonlyArray<TagEntity>, TagError>;

  /**
   * Gets all entities associated with a specific tag.
   *
   * @param tagId - The ID of the tag to get entities for
   * @returns Effect resolving to a ReadonlyArray of entity references
   * @throws TagError if the query fails
   *
   * @remarks
   * Returns only entity references (ID and type) rather than full entities
   * for efficiency. To get the full entities, you'll need to query the
   * appropriate service for each entity type.
   *
   * Returns an empty array if the tag exists but has no associated entities.
   *
   * @example
   * ```typescript
   * // Find all entities tagged as "important"
   * const entities = yield* TagService.getEntitiesForTag(importantTag.id);
   * for (const entity of entities) {
   *   console.log(`${entity.entityType}:${entity.entityId}`);
   * }
   * ```
   */
  readonly getEntitiesForTag: (
    tagId: EntityId,
  ) => Effect.Effect<ReadonlyArray<{ entityId: EntityId; entityType: string }>, TagError>;
}
