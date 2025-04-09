# Architecture: Core Tag Service

**Version:** 1.0
**Date:** 2024-07-28
**Status:** Draft

## 1. Overview

The Core Tag Service manages the lifecycle of tags and the many-to-many relationships between these tags and other core entities (Files, ChatMessages, etc.). It allows entities to be categorized and queried based on applied tags.

## 2. Core Components

*   **`TagApi` (Service Interface):** Defines the contract for creating tags, managing links, and querying tags/links. Located in `types.ts`.
*   **`TagEntity` (Data Model):** Represents a single tag (ID, name, timestamps). Defined via `TagEntitySchema` in `schema.ts`.
*   **`EntityTagLinkEntity` (Data Model):** Represents the join record linking a `TagEntity` to another entity (link ID, `tagId`, `entityId`, `entityType`, timestamps). Defined via `EntityTagLinkEntitySchema` in `schema.ts`.
*   **`TagApiLive` (Implementation):** The primary implementation of `TagApi`. Orchestrates operations by interacting with two underlying repositories. Located in `live.ts`.
*   **`RepositoryApi<TagEntity>` (Dependency):** Repository for managing `TagEntity` persistence. Identified by the `TagRepository` Tag.
*   **`RepositoryApi<EntityTagLinkEntity>` (Dependency):** Repository for managing `EntityTagLinkEntity` persistence. Identified by the `EntityTagLinkRepository` Tag.

## 3. Data Model

Two core entities are managed:

1.  **`TagEntity`**: (`schema.ts`)
    *   Inherits `id`, `createdAt`, `updatedAt` from `BaseEntitySchema`.
    *   `data`:
        *   `name` (string): The tag name. A unique, case-insensitive constraint should be enforced by the implementation/database.
2.  **`EntityTagLinkEntity`**: (`schema.ts`)
    *   Inherits `id`, `createdAt`, `updatedAt` from `BaseEntitySchema`.
    *   `data`:
        *   `tagId` (EntityId): Foreign key to `TagEntity.id`.
        *   `entityId` (EntityId): ID of the tagged entity.
        *   `entityType` (string): Type discriminator for the tagged entity.
    *   A unique constraint should exist on the combination of (`tagId`, `entityId`, `entityType`) to prevent duplicate links.

## 4. API Design (`TagApi`)

Located in `types.ts`. Key methods include:

*   `createTag(name): Effect<TagEntity, ...>`
*   `getTagById(tagId): Effect<Option<TagEntity>, ...>`
*   `getTagByName(name): Effect<Option<TagEntity>, ...>`
*   `findTags(prefix?): Effect<ReadonlyArray<TagEntity>, ...>`
*   `tagEntity(tagId, entityId, entityType): Effect<EntityTagLinkEntity, ...>`
*   `untagEntity(tagId, entityId, entityType): Effect<void, ...>`
*   `getTagsForEntity(entityId, entityType): Effect<ReadonlyArray<TagEntity>, ...>`
*   `getEntitiesForTag(tagId): Effect<ReadonlyArray<{ entityId, entityType }>, ...>`

*(Error types and precise dependency requirements (`TagApiDependencies`) are defined in `types.ts`)*

## 5. Implementation (`live.ts`)

*   The `make` effect will require both `TagRepository` and `EntityTagLinkRepository`.
*   **`createTag`:**
    *   Normalize the input `name` (e.g., to lowercase).
    *   Query `TagRepository` using `findOne` with a case-insensitive filter for the normalized name.
    *   If found, fail with `DuplicateTagNameError`.
    *   If not found, call `TagRepository.create` with the normalized name.
*   **`getTagByName`:** Normalize input `name`, query `TagRepository` using `findOne` with a case-insensitive filter.
*   **`findTags`:** Normalize `prefix`, query `TagRepository` using `findMany` with a case-insensitive prefix filter.
*   **`tagEntity`:**
    *   *(Optional but recommended)* Verify the `tagId` exists using `TagRepository.findById`. Fail with `TagNotFoundError` if not.
    *   Query `EntityTagLinkRepository` using `findOne` with filter `{ tagId, entityId, entityType }`.
    *   If found, fail with `LinkAlreadyExistsError`.
    *   If not found, call `EntityTagLinkRepository.create` with the link data.
*   **`untagEntity`:**
    *   Query `EntityTagLinkRepository` using `findOne` with filter `{ tagId, entityId, entityType }`.
    *   If not found, fail with `LinkNotFoundError`.
    *   If found, call `EntityTagLinkRepository.delete` using the found link's ID.
*   **`getTagsForEntity`:**
    *   Query `EntityTagLinkRepository` using `findMany` with filter `{ entityId, entityType }`.
    *   Extract the unique `tagId`s from the results.
    *   Query `TagRepository` using `findMany` with a filter for the extracted `tagId`s (e.g., `id IN (...)` if the repository supports it, or multiple `findById` calls).
*   **`getEntitiesForTag`:**
    *   Query `EntityTagLinkRepository` using `findMany` with filter `{ tagId }`.
    *   Map the results to extract `{ entityId, entityType }`.
*   Error 
