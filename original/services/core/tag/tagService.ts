import { Context, Data, Effect, Layer, ReadonlyArray } from "effect";
import { z } from "zod";

// Assuming RepositoryService types/errors are accessible
import {
    type BaseEntity,
    type EntityNotFoundError as RepoEntityNotFoundError,
    type RepositoryError as RepoError,
} from "../repository/repository-service"; // Adjust path as needed

// --- Data Structures ---

/**
 * Represents the public view of a Tag.
 */
export interface Tag {
    readonly id: string; // The unique ID of the tag entity
    readonly name: string; // The unique name of the tag
    // readonly description?: string;
    // readonly createdAt: Date; // Could be added if needed from BaseEntity
}

/**
 * Zod schema for the data stored for each unique Tag definition
 * via the RepositoryService.
 */
export const TagEntityDataSchema = z.object({
    /** The unique name of the tag (case-insensitive recommended). */
    name: z.string().min(1, { message: "Tag name cannot be empty" }),
    /** Optional description for the tag. */
    // description: z.string().optional(),
});

/** Inferred TypeScript type for the tag definition data part. */
export type TagEntityData = z.infer<typeof TagEntityDataSchema>;

/** Type alias for the full tag entity including BaseEntity fields. */
export type TagEntity = BaseEntity<TagEntityData>;

/**
 * Zod schema for the data stored for each association link between
 * a Tag and another framework entity via the RepositoryService.
 */
export const TagAssociationEntityDataSchema = z.object({
    /** The ID of the Tag entity being associated. */
    tagId: z.string().min(1),
    /** The ID of the entity being tagged (e.g., originatingThreadId). */
    entityId: z.string().min(1),
    /** A string identifying the type of the entity being tagged (e.g., "originatingChatThread"). */
    entityType: z.string().min(1),
    /** Timestamp when the association was created (managed by BaseEntity). */
    // attachedAt: z.date(), // Usually createdAt from BaseEntity is sufficient
});

/** Inferred TypeScript type for the tag association data part. */
export type TagAssociationEntityData = z.infer<
    typeof TagAssociationEntityDataSchema
>;

/** Type alias for the full tag association entity including BaseEntity fields. */
export type TagAssociationEntity = BaseEntity<TagAssociationEntityData>;

// --- Error Types ---

/** Error indicating a tag with the same name already exists. */
export class TagExistsError extends Data.TaggedError("TagExistsError")<{
    readonly name: string;
    readonly message?: string;
}> { }

/** Error indicating a specified tag ID or name was not found. */
export class TagNotFoundError extends Data.TaggedError("TagNotFoundError")<{
    readonly criteria: { tagId?: string; name?: string };
    readonly message?: string;
    readonly cause?: RepoEntityNotFoundError;
}> { }

/** Error indicating an attempt to delete a tag that is still in use (has associations). */
export class TagInUseError extends Data.TaggedError("TagInUseError")<{
    readonly tagId: string;
    readonly message?: string;
}> { }

/** Error indicating a specified tag-entity association was not found for removal. */
export class AssociationNotFoundError extends Data.TaggedError(
    "AssociationNotFoundError"
)<{
    readonly tagId: string;
    readonly entityId: string;
    readonly entityType: string;
    readonly message?: string;
    readonly cause?: RepoEntityNotFoundError;
}> { }

/** Error occurring during the creation of a tag-entity association (e.g., already exists, repo error). */
export class EntityAssociationError extends Data.TaggedError(
    "EntityAssociationError"
)<{
    readonly tagId: string;
    readonly entityId: string;
    readonly entityType: string;
    readonly message: string;
    readonly cause?: RepoError | unknown;
}> { }

/** General error for repository issues or other unexpected failures in TagService. */
export class GenericTagError extends Data.TaggedError("GenericTagError")<{
    readonly message: string;
    readonly cause?: RepoError | unknown;
}> { }

/** Union type for all errors potentially raised by TagService. */
export type TagServiceError =
    | TagExistsError
    | TagNotFoundError
    | TagInUseError
    | AssociationNotFoundError
    | EntityAssociationError
    | GenericTagError;

// --- Service Interface ---

/**
 * Defines the contract for the TagService.
 * Manages tag definitions and their associations with framework entities.
 */
export interface ITagService {
    // --- Tag Management ---

    /**
     * Creates a new unique tag definition.
     * Tag names are typically treated case-insensitively.
     *
     * @param params Parameters including the tag name.
     * @returns Effect yielding the created `Tag` (including its ID), or failing with
     *          `TagExistsError` or `GenericTagError`.
     */
    readonly createTag: (params: {
        readonly name: string;
        // readonly description?: string;
    }) => Effect.Effect<Tag, TagExistsError | GenericTagError>;

    /**
     * Retrieves a tag definition by its unique ID or name.
     * Name lookup is typically case-insensitive.
     *
     * @param params Criteria to find the tag (either tagId or name).
     * @returns Effect yielding the found `Tag`, or failing with
     *          `TagNotFoundError` or `GenericTagError`.
     */
    readonly getTag: (params: {
        readonly tagId?: string;
        readonly name?: string; // Use only one, tagId takes precedence
    }) => Effect.Effect<Tag, TagNotFoundError | GenericTagError>;

    /**
     * Lists all defined tags.
     *
     * @returns Effect yielding a readonly array of all `Tag` definitions, or failing with `GenericTagError`.
     */
    readonly listTags: () => Effect.Effect<ReadonlyArray<Tag>, GenericTagError>;

    /**
     * Deletes a tag definition *only if* it is not currently associated
     * with any entities.
     *
     * @param params Parameters including the tagId to delete.
     * @returns Effect completing successfully (`void`), or failing with
     *          `TagNotFoundError`, `TagInUseError`, or `GenericTagError`.
     */
    readonly deleteTag: (params: {
        readonly tagId: string;
    }) => Effect.Effect<void, TagNotFoundError | TagInUseError | GenericTagError>;

    // --- Association Management ---

    /**
     * Creates an association between an existing tag and a specific entity.
     * This operation is typically idempotent; attempting to create an existing
     * association succeeds without error.
     *
     * @param params Parameters including tagId, entityId, and entityType.
     * @returns Effect completing successfully (`void`), or failing with
     *          `TagNotFoundError` (if tag doesn't exist),
     *          `EntityAssociationError` (if association creation fails in repo),
     *          or `GenericTagError`.
     */
    readonly associateTag: (params: {
        readonly tagId: string;
        readonly entityId: string;
        /** Type identifier, e.g., "originatingChatThread". */
        readonly entityType: string;
    }) => Effect.Effect<
        void,
        TagNotFoundError | EntityAssociationError | GenericTagError
    >;

    /**
     * Removes an association between a tag and a specific entity.
     *
     * @param params Parameters identifying the association to remove.
     * @returns Effect completing successfully (`void`), or failing with
     *          `AssociationNotFoundError` (if the link doesn't exist)
     *          or `GenericTagError`.
     */
    readonly dissociateTag: (params: {
        readonly tagId: string;
        readonly entityId: string;
        readonly entityType: string;
    }) => Effect.Effect<void, AssociationNotFoundError | GenericTagError>;

    /**
     * Retrieves all tags associated with a specific entity.
     *
     * @param params Parameters identifying the entity.
     * @returns Effect yielding a readonly array of `Tag` definitions associated
     *          with the entity, or failing with `GenericTagError`. Handles missing
     *          tag definitions gracefully (logs and skips).
     */
    readonly getTagsForEntity: (params: {
        readonly entityId: string;
        readonly entityType: string;
    }) => Effect.Effect<ReadonlyArray<Tag>, GenericTagError>;

    /**
     * Retrieves all entity IDs of a specific type associated with a given tag.
     *
     * @param params Parameters identifying the tag and entity type.
     * @returns Effect yielding a readonly array of objects containing the `entityId`,
     *          or failing with `TagNotFoundError` or `GenericTagError`.
     */
    readonly getEntitiesForTag: (params: {
        readonly tagId: string;
        readonly entityType: string;
    }) => Effect.Effect<ReadonlyArray<{ entityId: string }>, TagNotFoundError | GenericTagError>;
}

// --- Service Tag ---

/**
 * Effect Tag for the TagService. Manages tag definitions and associations.
 */
export class TagService extends Context.Tag("TagService")<
    TagService,
    ITagService
>() { }
