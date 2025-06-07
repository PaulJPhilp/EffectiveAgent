/**
 * @file Implements the TagService using the Effect.Service pattern.
 */

import { EntityId } from "@/types.js";
import { Option } from "effect";
import * as Effect from "effect/Effect";
import { RepositoryError } from "../repository/errors.js";
import { RepositoryService } from "../repository/service.js";
import { BaseEntityWithData } from "../repository/types.js";
import type { TagServiceApi } from "./api.js";
import {
  DuplicateTagNameError,
  LinkAlreadyExistsError,
  LinkNotFoundError,
  TagDbError,
  TagNotFoundError,
} from "./errors.js";
import type {
  EntityTagLinkEntity,
  TagEntity
} from "./schema.js";
import type { TaggedEntityRef } from "./types.js";

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
      const tagRepo = yield* RepositoryService<TagEntity & BaseEntityWithData>().make();
      const linkRepo = yield* RepositoryService<EntityTagLinkEntity & BaseEntityWithData>().make();

      return {
        /**
         * Creates a new tag with the given name.
         * @param name The name of the tag to create.
         * @returns An Effect resolving to the created tag or error.
         */
        createTag: (name: string) => {
          const normalizedName = normalizeTagName(name);

          return Effect.gen(function* () {
            // Check if tag with same name already exists
            const existingTag = yield* tagRepo.findOne({
              filter: { name: normalizedName }
            }).pipe(
              Effect.mapError(error => new TagDbError({
                operation: "createTag",
                message: "Failed to check for existing tag",
                cause: error
              }))
            );

            if (Option.isSome(existingTag)) {
              return yield* Effect.fail(
                new DuplicateTagNameError({
                  tagName: name,
                  message: `Tag with name '${name}' already exists`
                })
              );
            }

            // Create new tag
            return yield* tagRepo.create({ name: normalizedName }).pipe(
              Effect.mapError(error => new TagDbError({
                operation: "createTag",
                message: `Failed to create tag '${name}'`,
                cause: error
              }))
            );
          }).pipe(
            Effect.catchAll((error) => {
              if (error instanceof TagDbError || error instanceof DuplicateTagNameError) {
                return Effect.fail(error)
              }
              return Effect.fail(new TagDbError({
                operation: "createTag",
                message: "Unexpected error",
                cause: error
              }))
            })
          );
        },

        /**
         * Gets a tag by its ID.
         * @param id The ID of the tag to get.
         * @returns An Effect resolving to the tag.
         */
        getTagById: (id: EntityId) => {
          return Effect.gen(function* () {
            const tag = yield* Effect.try(() => tagRepo.findById(id)).pipe(
              Effect.catchAll(error =>
                Effect.fail(new TagDbError({ operation: "getTagById", message: `Failed to get tag with ID ${id}`, cause: error }))
              )
            );
            return tag;
          }).pipe(
            Effect.catchAll((error) => {
              if (error instanceof RepositoryError) {
                return Effect.fail(new TagDbError({
                  operation: "getTagById",
                  message: `Repository error: ${error}`,
                  cause: error
                }))
              }
              return Effect.fail(error)
            })
          );
        },

        /**
         * Gets a tag by its name.
         * @param name The name of the tag to get.
         * @returns An Effect resolving to the tag.
         */
        getTagByName: (name: string) => {
          return Effect.gen(function* () {
            const tag = yield* Effect.try(() => {
              const normalizedName = normalizeTagName(name);
              return tagRepo.findOne({ filter: { name: normalizedName } });
            }).pipe(
              Effect.catchAll(error =>
                Effect.fail(new TagDbError({ operation: "getTagByName", message: `Failed to get tag with name '${name}'`, cause: error }))
              )
            );
            return tag;
          }).pipe(
            Effect.catchAll((error) =>
              error instanceof RepositoryError
                ? Effect.fail(new TagDbError({ operation: "getTagByName", message: `Repository error: ${error}`, cause: error }))
                : Effect.fail(error)
            )
          );
        },

        /**
         * Finds tags matching the given query.
         * @param prefix Optional prefix to filter tags by.
         * @returns An Effect resolving to an array of matching tags.
         */
        findTags: (prefix?: string) => {
          return Effect.gen(function* () {
            const tags = yield* Effect.try(() => {
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
              return tagRepo.findMany({
                filter
              });
            }).pipe(
              Effect.catchAll(error =>
                Effect.fail(new TagDbError({
                  operation: "findTags",
                  message: `Failed to find tags${prefix ? ` with prefix '${prefix}'` : ''}`,
                  cause: error
                }))
              )
            );
            return tags;
          }).pipe(
            Effect.catchAll((error) =>
              error instanceof RepositoryError
                ? Effect.fail(new TagDbError({ operation: "findTags", message: `Repository error: ${String(error)}`, cause: error }))
                : Effect.fail(error)
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
        ) => {
          return Effect.gen(function* (): Generator<any, void, any> {
            // Verify tag exists
            const tagOption = yield* tagRepo.findById(tagId).pipe(
              Effect.mapError(error => new TagDbError({
                operation: "tagEntity",
                message: `Failed to find tag ${tagId}`,
                cause: error
              }))
            );

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
            }).pipe(
              Effect.option,
              Effect.mapError(error => new TagDbError({
                operation: "tagEntity",
                message: `Failed to check existing link`,
                cause: error
              }))
            );

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
            yield* linkRepo.create({ tagId, entityId, entityType }).pipe(
              Effect.mapError(error => new TagDbError({
                operation: "tagEntity",
                message: `Failed to create link`,
                cause: error
              }))
            );
          });
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
        ) => {
          return Effect.gen(function* () {
            // Find the specific link to delete
            const linkOption = yield* linkRepo.findOne({
              filter: { tagId, entityId, entityType }
            }).pipe(
              Effect.option,
              Effect.mapError((error) => new TagDbError({
                operation: "untagEntity",
                message: `Failed to find link between tag ${tagId} and entity ${entityType}:${entityId}`,
                cause: error
              }))
            );

            // If link doesn't exist, throw error
            const link = Option.getOrNull(linkOption) as (EntityTagLinkEntity & BaseEntityWithData) | null;
            if (!link) {
              return yield* Effect.fail(
                new LinkNotFoundError({
                  tagId,
                  entityId,
                  entityType,
                  message: `Link between tag ${tagId} and entity ${entityType}:${entityId} not found`
                })
              );
            }

            // Delete the link
            return yield* linkRepo.delete(link.id).pipe(
              Effect.mapError((error) => new TagDbError({
                operation: "untagEntity",
                message: `Failed to delete link`,
                cause: error
              }))
            );
          });
        },

        /**
         * Gets all entities tagged with the given tag.
         * @param tagId The ID of the tag to get entities for.
         * @returns An Effect resolving to an array of entity references.
         */
        getEntitiesForTag: (
          tagId: EntityId
        ) => {
          return Effect.gen(function* () {
            // Find all links for the tag
            const links = yield* linkRepo.findMany({
              filter: { tagId }
            }).pipe(
              Effect.map((results: Array<EntityTagLinkEntity & BaseEntityWithData>) => results),
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
    })
  }
) { }

// Export the service class directly