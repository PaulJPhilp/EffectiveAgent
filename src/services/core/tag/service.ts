/**
 * @file Implements the TagService using the Effect.Service pattern.
 */

import type { EntityId } from "@/types.js";
import {
  DuplicateTagNameError,
  LinkAlreadyExistsError,
  LinkNotFoundError,
  TagDbError,
  TagNotFoundError,
} from "@core/tag/errors.js";
import type {
  EntityTagLinkEntity,
  TagEntity,
} from "@core/tag/schema.js";
import * as Effect from "effect/Effect";
import { Layer, Option } from "effect";
import type { TagServiceApi } from "@core/tag/api.js";
import type { TaggedEntityRef } from "@core/tag/types.js";
import { EntityNotFoundError } from "@core/repository/errors.js";
import { RepositoryService } from "@core/repository/service.js";

/**
 * Helper function to normalize tag names for consistent storage and lookup.
 */
const normalizeTagName = (name: string): string => name.trim().toLowerCase();

/**
 * Implementation of the TagService using the Effect.Service pattern
 */
export class TagService extends Effect.Service<TagServiceApi>()(
  "TagService",
  {
    effect: Effect.gen(function* () {
      // Get repository instances
      const tagRepo = yield* RepositoryService<TagEntity>().Tag;
      const linkRepo = yield* RepositoryService<EntityTagLinkEntity>().Tag;
      
      return {
        /**
         * Creates a new tag with the given name.
         * @param name The name of the tag to create.
         * @returns An Effect resolving to the created tag or error.
         */
        createTag: (name: string): Effect.Effect<TagEntity, TagDbError | DuplicateTagNameError> => {
          const normalizedName = normalizeTagName(name);
          
          return Effect.gen(function* () {
            // Check if tag with same name already exists
            const existingTag = yield* tagRepo.findOne({
              filter: { name: normalizedName }
            }).pipe(Effect.option);
            
            if (Option.isSome(existingTag)) {
              return yield* Effect.fail(
                new DuplicateTagNameError({
                  tagName: name,
                  message: `Tag with name '${name}' already exists`
                })
              );
            }
            
            // Create new tag
            try {
              const newTag = yield* tagRepo.create({
                name: normalizedName,
              });

              return newTag;
            } catch (error) {
              return yield* Effect.fail(
                new TagDbError({
                  operation: "createTag",
                  message: `Failed to create tag '${name}'`,
                  cause: error,
                })
              );
            }
          }).pipe(
            Effect.catchTag("RepositoryError", (error) => 
              Effect.fail(new TagDbError({
                operation: "createTag",
                message: `Repository error: ${error.message}`,
                cause: error
              }))
            )
          );
        },

        /**
         * Gets a tag by its ID.
         * @param id The ID of the tag to get.
         * @returns An Effect resolving to the tag.
         */
        getTagById: (id: EntityId): Effect.Effect<Option.Option<TagEntity>, TagDbError> => {
          return Effect.gen(function* () {
            try {
              const tag = yield* tagRepo.findById(id);
              return tag;
            } catch (error) {
              return yield* Effect.fail(
                new TagDbError({
                  operation: "getTagById",
                  message: `Failed to get tag with ID ${id}`,
                  cause: error,
                })
              );
            }
          }).pipe(
            Effect.catchTag("RepositoryError", (error) => 
              Effect.fail(new TagDbError({
                operation: "getTagById",
                message: `Repository error: ${error.message}`,
                cause: error
              }))
            )
          );
        },
        
        /**
         * Gets a tag by its name.
         * @param name The name of the tag to get.
         * @returns An Effect resolving to the tag.
         */
        getTagByName: (name: string): Effect.Effect<Option.Option<TagEntity>, TagDbError> => {
          return Effect.gen(function* () {
            try {
              const normalizedName = normalizeTagName(name);
              
              const tag = yield* tagRepo.findOne({
                filter: { name: normalizedName }
              });
              
              return tag;
            } catch (error) {
              return yield* Effect.fail(
                new TagDbError({
                  operation: "getTagByName",
                  message: `Failed to get tag with name '${name}'`,
                  cause: error,
                })
              );
            }
          }).pipe(
            Effect.catchTag("RepositoryError", (error) => 
              Effect.fail(new TagDbError({
                operation: "getTagByName",
                message: `Repository error: ${error.message}`,
                cause: error
              }))
            )
          );
        },
        
        /**
         * Finds tags matching the given query.
         * @param prefix Optional prefix to filter tags by.
         * @returns An Effect resolving to an array of matching tags.
         */
        findTags: (prefix?: string): Effect.Effect<ReadonlyArray<TagEntity>, TagDbError> => {
          return Effect.gen(function* () {
            try {
              let filter = {};
              
              if (prefix) {
                const normalizedPrefix = normalizeTagName(prefix);
                // Add prefix condition if provided (using 'like' or similar operator)
                // Implementation depends on the repository's supported query operators
                filter = {
                  name: {
                    startsWith: normalizedPrefix
                  }
                };
              }
              
              // Find all tags matching the filter
              const tags = yield* tagRepo.findMany({
                filter
              });
              
              return tags;
            } catch (error) {
              return yield* Effect.fail(
                new TagDbError({
                  operation: "findTags",
                  message: `Failed to find tags${prefix ? ` with prefix '${prefix}'` : ''}`,
                  cause: error,
                })
              );
            }
          }).pipe(
            Effect.catchTag("RepositoryError", (error) => 
              Effect.fail(new TagDbError({
                operation: "findTags",
                message: `Repository error: ${error.message}`,
                cause: error
              }))
            )
          );
        },
        
        /**
         * Tags an entity with the given tag.
         * @param tagId The ID of the tag to use.
         * @param entityId The ID of the entity to tag.
         * @param entityType The type of the entity to tag.
         * @returns An Effect resolving to void.
         */
        tagEntity: (
          tagId: EntityId, 
          entityId: EntityId, 
          entityType: string
        ): Effect.Effect<void, TagDbError | TagNotFoundError | LinkAlreadyExistsError> => {
          return Effect.gen(function* () {
            // Verify tag exists
            const tagOption = yield* tagRepo.findById(tagId);
            
            if (Option.isNone(tagOption)) {
              return yield* Effect.fail(
                new TagNotFoundError({
                  message: `Tag with ID ${tagId} not found`,
                  identifier: tagId
                })
              );
            }
            
            // Check if link already exists
            const existingLink = yield* linkRepo.findOne({
              filter: { tagId, entityId, entityType }
            }).pipe(Effect.option);
            
            if (Option.isSome(existingLink)) {
              return yield* Effect.fail(
                new LinkAlreadyExistsError({
                  message: `Entity ${entityType}:${entityId} already tagged with tag ${tagId}`,
                  tagId,
                  entityId,
                  entityType
                })
              );
            }
            
            // Create link between tag and entity
            try {
              yield* linkRepo.create({
                tagId,
                entityId,
                entityType
              });
            } catch (error) {
              return yield* Effect.fail(
                new TagDbError({
                  operation: "tagEntity",
                  message: `Failed to tag entity: ${error instanceof Error ? error.message : String(error)}`,
                  cause: error,
                })
              );
            }
          }).pipe(
            Effect.catchTag("RepositoryError", (error) => 
              Effect.fail(new TagDbError({
                operation: "tagEntity",
                message: `Repository error: ${error.message}`,
                cause: error
              }))
            )
          );
        },
        
        /**
         * Removes a tag from an entity.
         * @param tagId The ID of the tag to remove.
         * @param entityId The ID of the entity to untag.
         * @param entityType The type of the entity to untag.
         * @returns An Effect resolving to void.
         */
        untagEntity: (
          tagId: EntityId, 
          entityId: EntityId, 
          entityType: string
        ): Effect.Effect<void, TagDbError | LinkNotFoundError> => {
          return Effect.gen(function* (_) {
            // Find the specific link to delete
            const linkOption: Option.Option<EntityTagLinkEntity> = yield* linkRepo.findOne({
              filter: { tagId, entityId, entityType }
            }).pipe(
              Effect.option,
              Effect.mapError((error) => new TagDbError({
                operation: "untagEntity (find link)",
                message: `Failed to find link between tag ${tagId} and entity ${entityType}:${entityId}`,
                cause: error
              }))
            );
            
            // If link doesn't exist, throw error
            if (Option.isNone(linkOption)) {
              return yield* Effect.fail(
                new LinkNotFoundError({
                  tagId,
                  entityId,
                  entityType,
                  message: `Link between tag ${tagId} and entity ${entityType}:${entityId} not found`
                })
              );
            }
            
            // If link exists, delete it by its ID
            const linkToDelete = linkOption.value;
            
            yield* linkRepo.delete(linkToDelete.data.id).pipe(
              Effect.mapError((error) => {
                // Check if repo error was EntityNotFoundError (shouldn't happen if findOne succeeded)
                if (error instanceof EntityNotFoundError) {
                  return new LinkNotFoundError({
                    tagId,
                    entityId,
                    entityType,
                    message: "Link disappeared before delete"
                  });
                }
                // Otherwise wrap as generic DB error
                return new TagDbError({
                  operation: "untagEntity (delete link)",
                  message: `DB error deleting link ID ${linkToDelete.data.id}`,
                  cause: error
                });
              })
            );
            
            // Explicitly return void
            return undefined;
          });
          // No need for catchTag here since we're already mapping repository errors to our domain errors
        },
        
        /**
         * Gets all tags for an entity.
         * @param entityId The ID of the entity to get tags for.
         * @param entityType The type of the entity to get tags for.
         * @returns An Effect resolving to an array of tags.
         */
        getTagsForEntity: (
          entityId: EntityId,
          entityType: string
        ): Effect.Effect<ReadonlyArray<TagEntity>, TagDbError> => {
          return Effect.gen(function* () {
            // Find all links for the entity
            const links: ReadonlyArray<EntityTagLinkEntity> = yield* linkRepo.findMany({
              filter: { entityId, entityType }
            }).pipe(
              Effect.mapError(
                (cause) =>
                  new TagDbError({
                    operation: "getTagsForEntity (find links)",
                    message: `DB error finding links for ${entityType}:${entityId}`,
                    cause,
                  }),
              ),
            );
            
            // If no links found, return empty array
            if (links.length === 0) {
              return [] as ReadonlyArray<TagEntity>;
            }
            
            // Extract tagIds and fetch corresponding tags
            const tagIds = links.map((link) => link.data.tagId);
            
            // Fetch all tags matching the found IDs
            return yield* tagRepo.findMany({
              filter: { id: { in: tagIds } },
            }).pipe(
              Effect.map(tags => tags as ReadonlyArray<TagEntity>),
              Effect.mapError(
                (cause) =>
                  new TagDbError({
                    operation: "getTagsForEntity (find tags)",
                    message: `DB error finding tags for entity ${entityType}:${entityId}`,
                    cause,
                  }),
              ),
            );
          });
        },
        
        /**
         * Gets all entities for a tag.
         * @param tagId The ID of the tag to get entities for.
         * @returns An Effect resolving to an array of entity references.
         */
        getEntitiesForTag: (
          tagId: EntityId
        ): Effect.Effect<ReadonlyArray<TaggedEntityRef>, TagDbError> => {
          return Effect.gen(function* () {
            // Find all links for the tag
            const links: ReadonlyArray<EntityTagLinkEntity> = yield* linkRepo.findMany({
              filter: { tagId }
            }).pipe(
              Effect.mapError(
                (cause) =>
                  new TagDbError({
                    operation: "getEntitiesForTag (find links)",
                    message: `DB error finding links for tag ${tagId}`,
                    cause,
                  }),
              ),
            );
            
            // Map results to the desired { entityId, entityType } shape
            return links.map((link) => ({
              entityId: link.data.entityId,
              entityType: link.data.entityType,
            })) as ReadonlyArray<TaggedEntityRef>;
          });
        }
      };
    }),
    dependencies: [],
  }
) {}

/**
 * Live layer for the TagService.
 */
export const TagServiceLive = Layer.succeed(TagService);

/**
 * Default export for the TagService.
 */
export default TagService;
