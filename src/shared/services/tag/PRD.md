Okay, Paul. Let's tackle the `TagService`. You're right, compared to the others, this should be relatively straightforward.

**Step 1: Product Requirements Document (PRD)**

---

## Product Requirements Document: Tag Service

**Version:** 1.0
**Date:** 2024-07-26
**Author:** T3 Chat (Assisted by Paul)

**1. Overview**

This document outlines the requirements for the `TagService`, a component of the `EffectiveAgent` framework. This service is responsible for managing the lifecycle of tags (simple string labels) and their associations with specific framework entities, primarily the `originatingThreadId` of chat threads. It allows users and agents to create, retrieve, delete tags, and manage the links between tags and entities.

**2. Goals**

*   **Tag Management:** Provide APIs to create, list, and potentially delete globally defined tags.
*   **Association Management:** Provide APIs to associate existing tags with specific entities (identified by an entity ID, e.g., `originatingThreadId`) and to remove those associations.
*   **Querying:** Provide APIs to find all tags associated with a specific entity and to find all entities associated with a specific tag.
*   **Abstract Persistence:** Hide the underlying `RepositoryService` implementation used to store tag definitions and associations.
*   **Clear API:** Offer a simple, Effect-native API for tag and association management.
*   **Integration:** Integrate with `LoggingService` and `RepositoryService`.
*   **Consistency:** Follow framework patterns.

**3. Non-Goals**

*   **Complex Tag Hierarchies:** Does not support nested tags or complex relationships between tags themselves.
*   **Tagging Arbitrary Data:** Primarily focused on tagging specific entity types defined by the framework (initially `originatingThreadId`), not arbitrary user data within memory services.
*   **UI for Tag Management:** Backend service only.

**4. User Stories**

*   **As a User/Agent/Supervisor, I want to:**
    *   Create a new tag (e.g., "project-alpha", "urgent", "research").
    *   See a list of all available tags.
    *   Associate the "project-alpha" tag with a specific chat thread lineage (via its `originatingThreadId`).
    *   Associate the "urgent" tag with the same lineage.
    *   Retrieve all tags associated with that specific lineage.
    *   Find all chat thread lineages tagged with "urgent".
    *   Remove the "urgent" tag association from that lineage.
    *   (Potentially) Delete the "research" tag entirely if it's no longer needed and not associated with anything.
*   **As a Framework Maintainer, I want to:**
    *   Define the database schema for storing tags (`TagEntity`) and associations (`TagAssociationEntity`).
    *   Ensure tag names are unique (case-insensitive?).

**5. Functional Requirements**

*   **5.1. `ITagService` Interface & `TagService` Tag:** Define using `Effect.Tag`.
*   **5.2. Core Data Structures:**
    *   `TagEntityDataSchema`: `{ name: z.string().min(1), /* description?: z.string() */ }`. `name` should be unique (case-insensitive recommended).
    *   `TagAssociationEntityDataSchema`: `{ tagId: z.string(), entityId: z.string(), entityType: z.string() /* e.g., "originatingChatThread" */ }`. The combination of `tagId`, `entityId`, `entityType` should be unique.
*   **5.3. Tag Operations:**
    *   `createTag(params: { name: string }): Effect<TagEntity, TagExistsError | GenericTagError>`: Creates a new tag. Fails if a tag with the same name (case-insensitive) already exists. Uses `RepositoryService<TagEntityData>`.
    *   `getTag(params: { tagId?: string, name?: string }): Effect<TagEntity, TagNotFoundError | GenericTagError>`: Finds a tag by ID or name. Fails if not found.
    *   `listTags(): Effect<ReadonlyArray<TagEntity>, GenericTagError>`: Returns all defined tags.
    *   `deleteTag(params: { tagId: string }): Effect<void, TagNotFoundError | TagInUseError | GenericTagError>`: Deletes a tag definition *only if* it has no current associations. Checks `TagAssociationEntityData` before deleting `TagEntityData`.
*   **5.4. Association Operations:**
    *   `associateTag(params: { tagId: string, entityId: string, entityType: string }): Effect<void, TagNotFoundError | EntityAssociationError | GenericTagError>`: Creates an association link. Verifies the tag exists first. Uses `RepositoryService<TagAssociationEntityData>`. Fails if the association already exists.
    *   `dissociateTag(params: { tagId: string, entityId: string, entityType: string }): Effect<void, AssociationNotFoundError | GenericTagError>`: Removes an association link. Fails if the association doesn't exist.
    *   `getTagsForEntity(params: { entityId: string, entityType: string }): Effect<ReadonlyArray<TagEntity>, GenericTagError>`: Finds all `TagAssociationEntityData` for the entity, then fetches the corresponding `TagEntity` data for each associated `tagId`.
    *   `getEntitiesForTag(params: { tagId: string, entityType: string }): Effect<ReadonlyArray<{ entityId: string }>, TagNotFoundError | GenericTagError>`: Verifies the tag exists. Finds all `TagAssociationEntityData` for the `tagId` and `entityType`, returning the list of associated `entityId`s.
*   **5.5. Interaction with `RepositoryService`:** Uses `RepositoryService` for CRUD operations on `TagEntityData` and `TagAssociationEntityData`. Requires the repository to handle these two distinct entity types.
*   **5.6. Error Handling:**
    *   `TagExistsError`: `createTag` called with an existing tag name.
    *   `TagNotFoundError`: Operation references a non-existent `tagId` or `name`.
    *   `TagInUseError`: `deleteTag` called for a tag that still has associations.
    *   `AssociationNotFoundError`: `dissociateTag` called for a non-existent link.
    *   `EntityAssociationError`: Error during association creation (e.g., link already exists, underlying repo error). Maps from `RepoError`.
    *   `GenericTagError`: Underlying `RepositoryError` or other unexpected issues.
*   **5.7. Logging:** Integrate with `LoggingService`.

**6. Non-Functional Requirements** (Performance depends on `RepositoryService` indexing on tag names, entity IDs, tag IDs; Reliability; Scalability; Testability).

**7. API Design (Conceptual - Effect-TS)** (Interface `ITagService`, Tag `TagService`, methods as described in 5.3, 5.4).

**8. Error Handling Summary** (Specific errors for tag lifecycle and association management).

**9. Configuration Summary** (Minimal, relies on `RepositoryService` config).

---

This defines a straightforward service for managing tags and their relationships, primarily focused on tagging chat thread lineages initially.

**Next Step:**

Shall we write the **`architecture.txt` for the `TagService`**?