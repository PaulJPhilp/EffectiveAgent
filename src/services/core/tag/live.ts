/**
 * @file Live implementation of the TagApi service.
 */

import type { EntityId } from "@/types.js";
import { EntityNotFoundError as RepoEntityNotFoundError, RepositoryError } from "@core/repository/errors.js";
import type { RepositoryApi } from "@core/repository/types.js";
import {
    DuplicateTagNameError,
    LinkAlreadyExistsError,
    LinkNotFoundError,
    TagDbError,
    TagNotFoundError,
} from "@core/tag/errors.js";
import type {
    EntityTagLinkEntity,
    EntityTagLinkEntityData,
    TagEntity,
} from "@core/tag/schema.js";
import {
    EntityTagLinkRepository,
    TagApi,
    TagRepository, // Import repository Tags
} from "@core/tag/types.js";
import { Effect, Layer, Option } from "effect";

// --- Implementation Factory ---

export const make = Effect.gen(function* () {
    // Get repository dependencies from context
    const tagRepo = yield* TagRepository;
    const linkRepo = yield* EntityTagLinkRepository;

    // Helper to normalize tag names (e.g., lowercase) for consistent checks
    const normalizeTagName = (name: string): string => name.trim().toLowerCase();

    // --- Tag Methods ---

    const createTag = (
        name: string,
    ): Effect.Effect<TagEntity, DuplicateTagNameError | TagDbError> => {
        const normalizedName = normalizeTagName(name);
        if (!normalizedName) {
            // Or return a specific validation error if preferred
            return Effect.die(new Error("Tag name cannot be empty"));
        }
        // Check if tag with normalized name already exists
        return tagRepo.findOne({ filter: { name: normalizedName } }).pipe(
            Effect.mapError(
                (cause) =>
                    new TagDbError({
                        operation: "createTag (check duplicate)",
                        message: `DB error checking for duplicate tag name '${normalizedName}'`,
                        cause,
                    }),
            ),
            Effect.flatMap(
                Option.match({
                    // If name already exists, fail with type conversion
                    onSome: (_existingTag) =>
                        Effect.fail(new DuplicateTagNameError({ tagName: normalizedName })) as Effect.Effect<TagEntity, DuplicateTagNameError | TagDbError>,
                    // If name doesn't exist, create the new tag
                    onNone: () =>
                        tagRepo.create({ name: normalizedName }).pipe(
                            Effect.mapError(
                                (cause) =>
                                    new TagDbError({
                                        operation: "createTag (creation)",
                                        message: `DB error creating tag '${normalizedName}'`,
                                        cause,
                                    }),
                            ),
                        ),
                }),
            ),
        );
    };

    const getTagById = (
        tagId: EntityId,
    ): Effect.Effect<Option.Option<TagEntity>, TagDbError> =>
        tagRepo.findById(tagId).pipe(
            Effect.mapError(
                (cause) =>
                    new TagDbError({
                        operation: "getTagById",
                        message: `DB error getting tag by ID ${tagId}`,
                        cause,
                    }),
            ),
        );

    const getTagByName = (
        name: string,
    ): Effect.Effect<Option.Option<TagEntity>, TagDbError> => {
        const normalizedName = normalizeTagName(name);
        return tagRepo.findOne({ filter: { name: normalizedName } }).pipe(
            Effect.mapError(
                (cause) =>
                    new TagDbError({
                        operation: "getTagByName",
                        message: `DB error getting tag by name '${normalizedName}'`,
                        cause,
                    }),
            ),
        );
    };

    const findTags = (
        prefix?: string,
    ): Effect.Effect<ReadonlyArray<TagEntity>, TagDbError> => {
        // Note: InMemoryRepository doesn't support prefix matching directly.
        // A real DB implementation would use LIKE or similar.
        // For InMemory, we filter after fetching all if prefix is provided.
        const findEffect = prefix
            ? tagRepo.findMany().pipe(
                Effect.map((tags) =>
                    tags.filter((tag) =>
                        normalizeTagName(tag.data.name).startsWith(normalizeTagName(prefix)),
                    ),
                ),
            )
            : tagRepo.findMany(); // Fetch all if no prefix

        return findEffect.pipe(
            Effect.mapError(
                (cause) =>
                    new TagDbError({
                        operation: "findTags",
                        message: `DB error finding tags ${prefix ? `with prefix '${prefix}'` : ''}`,
                        cause,
                    }),
            ),
        );
    };

    // --- Linking Methods ---

    const tagEntity = (
        tagId: EntityId,
        entityId: EntityId,
        entityType: string,
    ): Effect.Effect<
        EntityTagLinkEntity,
        TagNotFoundError | LinkAlreadyExistsError | TagDbError
    > =>
        // 1. Verify tag exists
        getTagById(tagId).pipe(
            Effect.flatMap(
                Option.match({
                    onNone: () => Effect.fail(new TagNotFoundError({ identifier: tagId })) as Effect.Effect<Option.Option<EntityTagLinkEntity>, TagNotFoundError | RepositoryError>,
                    // 2. If tag exists, check if link already exists
                    onSome: (_tag) =>
                        linkRepo.findOne({ filter: { tagId, entityId, entityType } }),
                }),
            ),
            Effect.mapError((error) => {
                // If error is already TagNotFoundError, pass it through
                if (error instanceof TagNotFoundError) return error;
                // Otherwise wrap repo errors
                return new TagDbError({
                    operation: "tagEntity (check existing link)",
                    message: "DB error checking for existing link",
                    cause: error,
                });
            }),
            // 3. Process link existence check
            Effect.flatMap(
                Option.match({
                    // If link already exists, fail with type conversion
                    onSome: (_link) =>
                        Effect.fail(
                            new LinkAlreadyExistsError({ tagId, entityId, entityType }),
                        ) as Effect.Effect<EntityTagLinkEntity, LinkAlreadyExistsError | TagDbError>,
                    // If link doesn't exist, create it
                    onNone: () => {
                        const linkData: EntityTagLinkEntityData = {
                            tagId,
                            entityId,
                            entityType,
                        };
                        return linkRepo.create(linkData).pipe(
                            Effect.mapError(
                                (cause) =>
                                    new TagDbError({
                                        operation: "tagEntity (create link)",
                                        message: "DB error creating link",
                                        cause,
                                    }),
                            ),
                        );
                    },
                }),
            ),
        );

    const untagEntity = (
        tagId: EntityId,
        entityId: EntityId,
        entityType: string,
    ): Effect.Effect<void, LinkNotFoundError | TagDbError> =>
        // 1. Find the specific link to delete
        linkRepo.findOne({ filter: { tagId, entityId, entityType } }).pipe(
            Effect.mapError(
                (cause) =>
                    new TagDbError({
                        operation: "untagEntity (find link)",
                        message: "DB error finding link to delete",
                        cause,
                    }),
            ),
            // 2. Process find result
            Effect.flatMap(
                Option.match({
                    // If link doesn't exist, fail
                    onNone: () =>
                        Effect.fail(
                            new LinkNotFoundError({ tagId, entityId, entityType }),
                        ),
                    // If link exists, delete it by its ID
                    onSome: (linkToDelete) =>
                        linkRepo.delete(linkToDelete.id).pipe(
                            Effect.mapError((repoError) => {
                                // Check if repo error was EntityNotFoundError (shouldn't happen if findOne succeeded)
                                if (repoError instanceof RepoEntityNotFoundError) {
                                    return new LinkNotFoundError({ tagId, entityId, entityType, message: "Link disappeared before delete" });
                                }
                                // Otherwise wrap as generic DB error
                                return new TagDbError({
                                    operation: "untagEntity (delete link)",
                                    message: `DB error deleting link ID ${linkToDelete.id}`,
                                    cause: repoError,
                                });
                            }),
                        ),
                }),
            ),
        );

    const getTagsForEntity = (
        entityId: EntityId,
        entityType: string,
    ): Effect.Effect<ReadonlyArray<TagEntity>, TagDbError> =>
        // 1. Find all links for the entity
        linkRepo.findMany({ filter: { entityId, entityType } }).pipe(
            Effect.mapError(
                (cause) =>
                    new TagDbError({
                        operation: "getTagsForEntity (find links)",
                        message: `DB error finding links for ${entityType}:${entityId}`,
                        cause,
                    }),
            ),
            // 2. If links found, extract tagIds and fetch corresponding tags
            Effect.flatMap((links) => {
                if (links.length === 0) {
                    return Effect.succeed([]); // No links, return empty array
                }
                const tagIds = links.map((link) => link.data.tagId);
                // Fetch all tags matching the found IDs
                // Note: This assumes findMany can filter by multiple IDs (e.g., WHERE id IN (...))
                // If not, multiple findById calls would be needed, which is less efficient.
                // The InMemory repo currently filters after fetching all, so this works there.
                return tagRepo.findMany().pipe(
                    Effect.map(tags => tags.filter(tag => tagIds.includes(tag.id))),
                    Effect.mapError(
                        (cause) =>
                            new TagDbError({
                                operation: "getTagsForEntity (find tags)",
                                message: `DB error finding tags for entity ${entityType}:${entityId}`,
                                cause,
                            }),
                    ),
                );
            }),
        );

    const getEntitiesForTag = (
        tagId: EntityId,
    ): Effect.Effect<
        ReadonlyArray<{ entityId: EntityId; entityType: string }>,
        TagDbError
    > =>
        // 1. Find all links for the tag
        linkRepo.findMany({ filter: { tagId } }).pipe(
            Effect.mapError(
                (cause) =>
                    new TagDbError({
                        operation: "getEntitiesForTag (find links)",
                        message: `DB error finding links for tag ${tagId}`,
                        cause,
                    }),
            ),
            // 2. Map results to the desired { entityId, entityType } shape
            Effect.map((links) =>
                links.map((link) => ({
                    entityId: link.data.entityId,
                    entityType: link.data.entityType,
                })),
            ),
        );

    // Return the service implementation object
    return {
        createTag,
        getTagById,
        getTagByName,
        findTags,
        tagEntity,
        untagEntity,
        getTagsForEntity,
        getEntitiesForTag,
    };
});

// --- Live Layer ---
export const TagApiLiveLayer: Layer.Layer<
    TagApi,
    never,
    // Declare both repository dependencies
    RepositoryApi<TagEntity> | RepositoryApi<EntityTagLinkEntity>
> = Layer.effect(TagApi, make);
