# PRD: Core Tag Service

**Version:** 1.0
**Date:** 2024-07-28
**Status:** Draft

## 1. Introduction

The Core Tag Service provides the capability to create and manage descriptive tags (keywords, labels) and associate them with various entities within the EffectiveAgent framework (e.g., `FileEntity`, `ChatMessageEntity`, `SkillEntity`). This allows for flexible categorization, organization, and retrieval of related information.

## 2. Goals and Motivation

*   **Organization:** Allow users and agents to categorize diverse entities using consistent labels.
*   **Discoverability:** Enable finding related entities by querying for specific tags (e.g., find all files and messages related to "project-alpha").
*   **Contextual Grouping:** Group disparate entities under common themes or statuses (e.g., "urgent", "review-needed", "customer-feedback").
*   **Flexibility:** Provide a simple, freeform tagging mechanism adaptable to various use cases.
*   **Decoupling:** Manage tags and their associations centrally, avoiding the need for individual entity services to manage their own tagging logic.

## 3. User Stories / Use Cases

*   **User/Agent:** As a user/agent, I want to create a new tag named "project-roadmap".
*   **User/Agent:** As a user/agent, I want to apply the existing tag "urgent" to a specific chat message (`ChatMessageEntity`).
*   **User/Agent:** As a user/agent, I want to apply the tags "analysis" and "customer-x" to a specific file (`FileEntity`).
*   **User/Agent:** As a user/agent, I want to see all tags currently applied to a specific file (`FileEntity`).
*   **User/Agent:** As a user/agent, I want to find all entities (files, messages, etc.) that have been tagged with "project-roadmap".
*   **User/Agent:** As a user/agent, I want to remove the "urgent" tag from a chat message.
*   **System/UI:** As a UI component, I want to fetch and suggest existing tags based on a user typing a prefix (e.g., "proj").

## 4. Functional Requirements

The service **must** provide capabilities to:

*   **FR-TAG-01:** Create a new tag with a unique name. Name comparison should likely be case-insensitive to prevent duplicates like "Urgent" and "urgent".
*   **FR-TAG-02:** Retrieve a tag by its unique ID.
*   **FR-TAG-03:** Retrieve a tag by its unique name (case-insensitive lookup).
*   **FR-TAG-04:** Find tags, optionally filtering by a name prefix (case-insensitive).
*   **FR-TAG-05:** Create an association (link) between an existing tag (by ID) and a specific entity (by ID and type). The service must prevent duplicate links (tagging the same entity with the same tag twice).
*   **FR-TAG-06:** Remove an association (link) between a specific tag (by ID) and a specific entity (by ID and type).
*   **FR-TAG-07:** Retrieve all tags associated with a specific entity (by ID and type).
*   **FR-TAG-08:** Retrieve identifying information (ID and type) of all entities associated with a specific tag (by ID).

The service **must** store:

*   **FR-TAG-10:** `TagEntity`: Represents a tag, including a unique ID, the tag name (unique, case-insensitive), and timestamps.
*   **FR-TAG-11:** `EntityTagLinkEntity`: Represents the many-to-many relationship, including a unique link ID, `tagId`, `entityId`, `entityType`, and timestamps.

## 5. Non-Functional Requirements

*   **NFR-TAG-01 (Performance):** Tag creation (with uniqueness check), link creation/deletion, and querying by entity or tag should be efficient, relying on database indexing (on tag names, tag IDs, entity IDs/types in the link table).
*   **NFR-TAG-02 (Consistency):** Tag names should be treated consistently regarding case (e.g., stored as lowercase, queried case-insensitively). Link creation/deletion should be atomic.
*   **NFR-TAG-03 (Scalability):** Should scale with the number of tags and links, primarily limited by database performance.

## 6. Future Considerations

*   **Tag Deletion:** How should deleting a `TagEntity` be handled? Should it cascade-delete associated `EntityTagLinkEntity` records? (Requires careful consideration).
*   **Tag Renaming:** Allow renaming tags while updating links or preventing conflicts.
*   **Tag Metadata:** Add optional descriptions, colors, or other metadata to `TagEntity`.
*   **Hierarchical Tags:** Support parent-child relationships between tags.
*   **Permissions:** Control who can create tags or apply them to specific entities.

## 7. Out of Scope (Version 1.0)

*   Deleting or renaming `TagEntity` records.
*   Hierarchical tags or tag metadata beyond the name.
*   Permission enforcement within this service.
*   Faceted search across multiple tags.
