# PRD: Core Attachment Service

**Version:** 1.0
**Date:** 2024-07-28
**Status:** Draft

## 1. Introduction

The Core Attachment Service provides a mechanism to create, manage, and query explicit links or relationships between different core entities within the EffectiveAgent framework (e.g., linking a `FileEntity` to a `ChatMessageEntity`, or a `SkillExecutionRecord` to a `GeneratedArtifact`). It acts as a central registry for these associations.

## 2. Goals and Motivation

*   **Establish Relationships:** Allow agents and the system to formally link related pieces of information or artifacts generated during a workflow or conversation.
*   **Contextual Retrieval:** Enable efficient lookup of associated entities (e.g., "find all files attached to this chat message", "find the chat message this analysis document was generated for").
*   **Decoupling:** Keep relationship management separate from the core entity services themselves, promoting modularity. The `File` service doesn't need to know about `ChatMessage`, and vice-versa; the `Attachment` service manages the link.
*   **Foundation:** Provide a basic building block for more complex contextual understanding and artifact tracking within agent interactions.

## 3. User Stories / Use Cases

*   **Agent:** As an agent generating a file (`FileEntity`) in response to a user request within a chat thread (`ChatMessageEntity`), I want to create an attachment link between the file and the chat message so the user can easily find the relevant file later.
*   **System:** As the system displaying a chat history, when rendering a message that has attached files, I want to query the Attachment service to find the IDs/metadata of linked `FileEntity` objects.
*   **User/Agent:** As a user or agent reviewing a specific file (`FileEntity`), I want to find out which chat message(s) or execution(s) it is linked to for context.
*   **System:** As the system performing cleanup or archival, I might need to find all attachments related to a specific entity before deleting it (though cascading deletes might be handled at the DB level).

## 4. Functional Requirements

The service **must** provide capabilities to:

*   **FR-ATT-01:** Create a directional link between two distinct entities, identified by their unique IDs and types.
*   **FR-ATT-02:** Delete an existing link by its unique link ID.
*   **FR-ATT-03:** Find all links originating *from* a 
