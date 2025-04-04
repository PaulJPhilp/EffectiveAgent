Okay, Paul. Let's start the lifecycle for the `ChatMemoryService`.

**Step 1: Rename and Review PRD**

First, we'll take the PRD we previously developed (labeled v1.1) and officially rename the service to `ChatMemoryService`. I'll also review it quickly to ensure clarity now that we've defined `LongTermMemoryService` separately.

---

## Product Requirements Document: Chat Memory Service (v1.1 - Renamed)

**Version:** 1.1
**Date:** 2024-07-26 (Reviewed: 2024-07-26)
**Author:** T3 Chat (Assisted by Paul)

**1. Overview**

This document outlines the requirements for the **`ChatMemoryService`**, a component of the Effect-based agent framework designed specifically for managing persistent **conversational history**. It provides agents and other services with capabilities to store, retrieve, and manage sequences of messages within the scope of a specific conversation (`conversationId`). The service abstracts the underlying storage mechanism (`RepositoryService` backed by Drizzle/PostgreSQL) and implements configurable history management strategies, starting with periodic summarization using the framework's `SkillService`. It is distinct from `LongTermMemoryService` (for user-scoped KV data) and `FileService`/`AttachmentService`.

**2. Goals**

*   **Abstract Persistence:** Hide the direct use of `RepositoryService` for storing/retrieving individual chat messages associated with a conversation.
*   **Provide Chat Primitives:** Offer clear, Effect-native functions for managing chat history (`getMessages`, `addMessages`, `clearMessages`).
*   **Scoped Memory:** Ensure memory operations are tied to a specific `conversationId`.
*   **Support Chat History:** Provide a robust implementation for managing sequences of chat messages (user, AI, system, tool, summary), stored individually but linked by `conversationId` and ordered by timestamp.
*   **Configurable History Management:** Allow different strategies for managing long conversation histories, configured via the `ConfigurationService`.
*   **Implement Summarization Strategy:** Provide an initial strategy that summarizes conversation chunks every N messages using a configured `SkillService` skill, storing summary metadata separately.
*   **Extensibility:** Allow for future memory management strategies.
*   **Type Safety:** Utilize Effect-TS and Zod for defining message structures and handling errors.
*   **Integration:** Seamlessly integrate with `LoggingService`, `ConfigurationService`, `RepositoryService`, and `SkillService` (for specific strategies).
*   **Consistency:** Follow patterns established by other framework services.
*   **Concurrency Ready:** Designed with Effect-TS to facilitate future transition to concurrent operations.

**3. Non-Goals**

*   **Replacing `RepositoryService`:** This service *uses* the `RepositoryService`.
*   **Managing User Preferences/Knowledge:** Handled by `LongTermMemoryService`.
*   **Managing Files/Attachments:** Handled by `FileService` and `AttachmentService`.
*   **Implementing All Possible Memory Types Initially:** Focus on chat memory with summarization.
*   **Complex Querying:** Focus on retrieving ordered history for a single `conversationId`.
*   **UI for Memory Management.**
*   **Implementing LangGraph Checkpointing Initially:** Deferred.

**4. User Stories**

*   **As an Agent Author, I want to:**
    *   Add a new message (user, AI, etc.) to the current conversation's memory.
    *   Retrieve the relevant message history for the current conversation (potentially including summaries) to provide context to an LLM.
    *   Clear the memory for a specific conversation.
    *   Have the framework automatically manage history length by summarizing older parts based on configuration, without me needing to explicitly trigger it.
*   **As a Framework Maintainer, I want to:**
    *   Provide a default chat memory implementation using `RepositoryService` (Drizzle/Postgres) storing individual messages and summarization metadata.
    *   Configure a summarization strategy (e.g., summarize every 20 messages using the "conversation-summary" skill).
    *   Define the database schema (via Drizzle) for storing individual `ChatMessageEntity` and `SummarizationMetadataEntity` records.
    *   Be able to add alternative memory management strategies in the future.

**5. Functional Requirements**

*   **5.1. `IChatMemoryService` Interface & `ChatMemoryService` Tag:**
    *   Define an `IChatMemoryService` interface using `Effect.Tag`.
    *   Methods: `getMessages`, `addMessages`, `clearMessages`.
*   **5.2. Core Data Structures (Zod Schemas & Types):**
    *   `ChatMessageSchema`: `{ role: z.enum(["user", "assistant", "system", "tool", "summary"]), content: z.string(), timestamp: z.date(), metadata?: z.record(z.unknown()).optional() }`. When `role` is `"summary"`, `metadata` should contain `summaryMetadataId: string`.
    *   `ChatMessageEntityDataSchema` (for `RepositoryService`): `{ conversationId: z.string(), role: z.enum(...), content: z.string(), timestamp: z.date(), metadata?: z.record(z.unknown()).optional() }`.
    *   `SummarizationMetadataEntityDataSchema` (for `RepositoryService`): `{ summarizedMessageIds: z.array(z.string()), conversationId: z.string(), summaryMessageId: z.string().optional(), timestampRange: z.object({ start: z.date(), end: z.date() }), /* createdAt provided by BaseEntity */ }`.
*   **5.3. History Management Strategy:**
    *   Define an interface `MemoryManagementStrategy`.
    *   Define `SummarizationStrategy` implementing the interface.
        *   Requires configuration: `summarizeEveryNMessages: number`, `summarizationSkillId: string`, `deleteSummarizedMessages: boolean`.
        *   Requires `SkillService` and `RepositoryService` (for messages and metadata) dependencies.
        *   Logic resides within the strategy implementation, triggered by `addMessages` via a hook.
    *   The active strategy will be determined by configuration and injected into the `ChatMemoryService` implementation via its Layer.
*   **5.4. Core Memory Operations:**
    *   `getMessages(params: { conversationId: string, limit?: number, before?: Date }): Effect.Effect<ReadonlyArray<ChatMessage>, ConversationNotFoundError | GenericMemoryError>`: Retrieves ordered messages (including summaries) for `conversationId` from `RepositoryService`, applying optional limits/time boundaries.
    *   `addMessages(params: { conversationId: string, messages: ReadonlyArray<ChatMessage> }): Effect.Effect<void, DataValidationError | GenericMemoryError>`:
        *   Persists new messages using `RepositoryService.create` on `ChatMessageEntityData`.
        *   Triggers the configured `MemoryManagementStrategy.postAddMessagesHook`.
        *   The hook (e.g., `SummarizationStrategy`) handles fetching messages, calling `SkillService`, creating `SummarizationMetadataEntityData`, creating the summary `ChatMessageEntityData` (with link), updating the metadata entity, and optionally deleting original messages.
    *   `clearMessages(params: { conversationId: string }): Effect.Effect<void, ConversationNotFoundError | GenericMemoryError>`: Deletes all `ChatMessageEntityData` and associated `SummarizationMetadataEntityData` for the `conversationId` using `RepositoryService`.
*   **5.5. Interaction with `RepositoryService`:**
    *   Relies heavily on `RepositoryService` for CRUD operations on `ChatMessageEntityData` and `SummarizationMetadataEntityData` objects.
    *   Maps `RepositoryService` errors appropriately.
*   **5.6. Interaction with `SkillService`:**
    *   The `SummarizationStrategy` implementation depends on `SkillService` to generate summaries.
    *   Maps `SkillService` errors appropriately.
*   **5.7. Error Handling:**
    *   `ChatMemoryError` (Base type)
    *   `DataValidationError`: Invalid input message data or repo validation failure.
    *   `ConversationNotFoundError`: `getMessages`/`clearMessages` called for non-existent `conversationId`.
    *   `GenericMemoryError`: Underlying `RepoError`, `SkillExecutionError`, or other unexpected issues.
*   **5.8. Logging:** Integrate with `LoggingService`.
*   **5.9. Configuration:**
    *   `memory.chat.strategy.type`: e.g., `"summarize"`, `"none"`.
    *   `memory.chat.strategy.summarizeEveryN`: e.g., `20`.
    *   `memory.chat.strategy.skillId`: e.g., `"conversation-summary"`.
    *   `memory.chat.strategy.deleteSummarizedMessages`: e.g., `true` / `false`.
    *   (Potentially) `memory.repository.chatMessageEntityType`, `memory.repository.summaryMetadataEntityType`.

**6. Non-Functional Requirements** (Performance, Reliability, Scalability, Concurrency, Maintainability, Testability - as previously discussed)

**7. API Design (Conceptual - Effect-TS)** (As previously outlined, using `IChatMemoryService` and `ChatMemoryService` tag)

**8. Error Handling Summary** (As previously outlined, using specific errors like `ConversationNotFoundError`)

**9. Configuration Summary** (As previously outlined)

**10. Implementations (Initial Scope)**

1.  **`ChatMemoryServiceLive`:**
    *   Implements `IChatMemoryService`.
    *   Uses `RepositoryService<ChatMessageEntityData>` and `RepositoryService<SummarizationMetadataEntityData>`.
    *   Accepts an injected `MemoryManagementStrategy`.
    *   Provides a Layer that wires up dependencies based on configuration.

**11. Open Questions / Future Considerations** (As previously discussed: Summarization State Tracking, Transactionality, `getMessages` behavior with summaries, Repository Criteria, Async Strategy Execution)

---

The PRD is now updated and focused on `ChatMemoryService`.

**Next Step:**

Shall we proceed to write the **`architecture.txt` file for the `ChatMemoryService`**?