# Architecture: Core Attachment Service

**Version:** 1.0
**Date:** 2024-07-28
**Status:** Draft

## 1. Overview

The Core Attachment Service provides the capability to manage explicit, directional relationships (links) between different entities within the system. It acts as a central join table or registry, allowing services to associate entities without creating direct dependencies between the entity services themselves. For example, it allows linking a `FileEntity` stored by the `File` service to a `ChatMessageEntity` managed by a hypothetical `Chat` service.

## 2. Core Components

*   **`AttachmentApi` (Service Interface):** Defines the contract for interacting with the attachment service (create, delete, find links). Located in `types.ts`.
*   **`AttachmentLinkEntity` (Data Model):** Represents a single link record stored in the persistence layer. Defined via `AttachmentLinkEntitySchema` in `schema.ts`.
*   **`AttachmentApiLive` (Implementation):** The primary implementation of `AttachmentApi`. It orchestrates link creation and querying by interacting with an underlying repository. Located in `live.ts`.
*   **`RepositoryApi<AttachmentLinkEntity>` (Dependency):** The core dependency for persisting and retrieving `AttachmentLinkEntity` records. This will typically be provided by an `InMemoryRepository` (for testing) or a `DrizzleRepository` (for production). The specific Tag for this dependency (e.g., `AttachmentLinkRepository`) will be defined and used within `live.ts`.

## 3. Data Model

The core data entity is `AttachmentLinkEntity`, defined by `AttachmentLinkEntitySchema` in `schema.ts`. It extends `BaseEntitySchema` and includes the following key fields in its `data` payload:

*   `entityA_id` (string/EntityId): The unique ID of the first entity in the relationship (source/origin).
*   `entityA_type` (string): A discriminator string identifying the *type* of the first entity (e.g., "ChatMessage", "SkillExecution").
*   `entityB_id` (string/EntityId): The unique ID of the second entity in the relationship (target/destination).
*   `entityB_type` (string): A discriminator string identifying the *type* of the second entity (e.g., "File", "AnalysisReport").
*   `linkType` (string, optional): An optional field to categorize the relationship (e.g., "GENERATED", "MENTIONS").

*(Standard `id`, `createdAt`, `updatedAt` are inherited from `BaseEntitySchema`)*

Using separate `_id` and `_type` fields allows querying for all links involving a specific entity (e.g., find all links where `entityA_id` = 'X' OR `entityB_id` = 'X') or links between specific types.

## 4. API Design (`AttachmentApi`)

Located in `types.ts`. Key methods include:

*   `createLink(entityA_id, entityA_type, entityB_id, entityB_type, linkType?): Effect<AttachmentLinkEntity, ...>`
*   `deleteLink(linkId): Effect<void, ...>`
*   `findLinksFrom(entityA_id, entityA_type): Effect<ReadonlyArray<AttachmentLinkEntity>, ...>`
*   `findLinksTo(entityB_id, entityB_type): Effect<ReadonlyArray<AttachmentLinkEntity>, ...>`
*   `getLinkById(linkId): Effect<Option<AttachmentLinkEntity>, ...>`

*(Error types and precise dependency requirements (R type) are defined in `types.ts`)*

## 5. Implementation (`live.ts`)

*   The `make` effect will require `RepositoryApi<AttachmentLinkEntity>` via a specific Tag (e.g., `AttachmentLinkRepository`).
*   `createLink` will construct an `AttachmentLinkEntityData` object and call `repo.create()`.
*   `deleteLink` will call `repo.delete()`.
*   `findLinksFrom`/`findLinksTo` will use `repo.findMany()` with appropriate filters on the `entityA_*` or `entityB_*` fields.
*   `getLinkById` will use `repo.findById()`.
*   Error mapping will translate `RepositoryError` / `EntityNotFoundError` from the repository into specific `AttachmentError` types defined in `errors.ts`.

## 6. Dependencies

*   **Primary:** `RepositoryApi<AttachmentLinkEntity>` (provided via a specific Tag like `AttachmentLinkRepository`).
*   **Implicit:** `Clock.Clock` (if timestamp generation within the repository requires it, though currently deferred).

## 7. Error Handling

*   Defines specific errors like `AttachmentLinkNotFoundError`, `AttachmentDbError` in `errors.ts`.
*   Maps underlying `RepositoryError`s to these specific types.

## 8. Testing Strategy

*   Use Vitest and standard Effect testing patterns.
*   Provide an `InMemoryRepositoryLiveLayer` for the `AttachmentLinkRepository` Tag during tests.
*   Test creation, deletion, and various find scenarios.
