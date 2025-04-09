/**
 * @file Defines the API structure and Tag for the Tag service.
 */

import type { EntityId } from "@/types.js";
import type { RepositoryApi } from "@core/repository/types.js";
import type { DuplicateTagNameError, LinkAlreadyExistsError, LinkNotFoundError, TagError, TagNotFoundError } from "@core/tag/errors.js";
import type { EntityTagLinkEntity, TagEntity } from "@core/tag/schema.js";
import { Context, Effect, Option } from "effect";

// Define the specific repository Tags needed by the TagApi implementation
export const TagRepository = Context.GenericTag<RepositoryApi<TagEntity>>("TagRepository");
export const EntityTagLinkRepository = Context.GenericTag<RepositoryApi<EntityTagLinkEntity>>("EntityTagLinkRepository");

// Define the combined context required by the TagApi implementation
export type TagApiDependencies = RepositoryApi<TagEntity> | RepositoryApi<EntityTagLinkEntity>;

/**
 * Interface defining operations for managing tags and their associations with entities.
 */
export interface TagApi {
    /**
     * Creates a new tag. Fails if a tag with the same name already exists (case-insensitive check likely needed).
     * @param name The name for the new tag.
     * @returns Effect yielding the created TagEntity.
     */
    readonly createTag: (
        name: string,
    ) => Effect.Effect<TagEntity, DuplicateTagNameError | TagError, TagApiDependencies>;

    /**
     * Gets a tag by its unique ID.
     * @param tagId The ID of the tag.
     * @returns Effect yielding an Option of the TagEntity.
     */
    readonly getTagById: (
        tagId: EntityId,
    ) => Effect.Effect<Option.Option<TagEntity>, TagError, TagApiDependencies>;

    /**
     * Gets a tag by its unique name (case-insensitive lookup likely needed).
     * @param name The name of the tag.
     * @returns Effect yielding an Option of the TagEntity.
     */
    readonly getTagByName: (
        name: string,
    ) => Effect.Effect<Option.Option<TagEntity>, TagError, TagApiDependencies>;

    /**
    * Finds multiple tags, optionally filtering by name prefix (case-insensitive).
    * @param prefix Optional name prefix to filter by.
    * @returns Effect yielding a ReadonlyArray of matching TagEntities.
    */
    readonly findTags: (
        prefix?: string,
    ) => Effect.Effect<ReadonlyArray<TagEntity>, TagError, TagApiDependencies>;

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
    ) => Effect.Effect<EntityTagLinkEntity, TagNotFoundError | LinkAlreadyExistsError | TagError, TagApiDependencies>;

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
    ) => Effect.Effect<void, LinkNotFoundError | TagError, TagApiDependencies>;

    /**
     * Gets all tags associated with a specific entity.
     * @param entityId The ID of the entity.
     * @param entityType The type of the entity.
     * @returns Effect yielding a ReadonlyArray of associated TagEntities.
     */
    readonly getTagsForEntity: (
        entityId: EntityId,
        entityType: string,
    ) => Effect.Effect<ReadonlyArray<TagEntity>, TagError, TagApiDependencies>;

    /**
     * Gets all entities associated with a specific tag (by ID).
     * Returns only the IDs and types of the linked entities.
     * @param tagId The ID of the tag.
     * @returns Effect yielding a ReadonlyArray of { entityId, entityType } objects.
     */
    readonly getEntitiesForTag: (
        tagId: EntityId,
    ) => Effect.Effect<ReadonlyArray<{ entityId: EntityId; entityType: string }>, TagError, TagApiDependencies>;
}

/** Tag for the TagApi service. */
export const TagApi = Context.GenericTag<TagApi>("TagApi");
