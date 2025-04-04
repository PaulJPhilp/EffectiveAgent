1. Product Requirements Document: Thread Service
Version: 1.0 Date: 2024-07-26 Author: T3 Chat (Assisted by Paul)

1. Overview

This document outlines the requirements for the ThreadService, a core component of the Effect-based agent framework. This service is responsible for managing the lifecycle, configuration, and message processing loop of individual conversational threads. Each thread represents a distinct line of interaction, potentially branching from others. The ThreadService orchestrates interactions with memory (ChatMemoryService), model providers (ModelProviderService), file attachments (AttachmentService), and configuration persistence (RepositoryService), ensuring that each thread operates concurrently and according to its specific, immutable configuration. It provides APIs for thread creation, message handling, status monitoring, and lifecycle control (pause, resume, kill), intended to be used by higher-level orchestrators like the Supervisor Agent.

2. Goals

Thread Lifecycle Management: Provide APIs to create, branch, pause, resume, and kill individual conversational threads.
Concurrent Execution: Manage each active thread within its own Effect Fiber, allowing concurrent processing across multiple threads while maintaining sequential execution within a single thread.
Immutable Thread Configuration: Store and manage immutable configuration per thread (threadId), including system prompt, model ID, and execution parameters (temperature, thinking level, output requirements, etc.).
Message Processing Loop: Orchestrate the core loop for handling incoming user messages within a thread: save user message, retrieve history/config, call the appropriate model via ModelProviderService, validate/process the response, save the AI response, and notify listeners.
Integration with Core Services: Seamlessly integrate with ChatMemoryService (history), RepositoryService (thread config), ModelProviderService (LLM calls), AttachmentService (file links), LoggingService, and potentially an event bus (Hub/Queue) for notifications.
Status Reporting: Provide an API to query the runtime status of a thread's processing Fiber (e.g., Running, Paused, Idle, Done, Failed/Killed).
Abstraction: Hide the complexities of Fiber management, service interactions, and persistence from the caller (e.g., the Supervisor).
Type Safety & Error Handling: Utilize Effect-TS and Zod for defining configuration, message structures, and handling errors related to thread operations and the message loop.
3. Non-Goals

Direct User Interface Interaction: This service provides APIs for backend use; it does not directly serve a UI.
Cross-Thread Orchestration Logic: Deciding when to create, branch, pause, or kill threads based on application logic or user commands is the responsibility of the Supervisor Agent or equivalent.
Agent Logic Implementation: Does not contain the specific reasoning or goal-oriented logic of an agent; it orchestrates the execution based on configured models and prompts.
Replacing Core Services: Uses ChatMemoryService, RepositoryService, ModelProviderService, AttachmentService, etc.
Distinguishing Runaway vs. Long-Running Threads: Provides status and kill mechanisms, but interpretation is left to the caller.
Automatic Fiber Restart: Does not automatically restart killed or failed Fibers.
4. User Stories

As a Supervisor Agent / Application Backend, I want to:
Create a new thread with a specific system prompt, model ID, and execution parameters.
Receive a unique threadId for the new thread.
Send a user's message to a specific threadId for processing.
Be notified (e.g., via a subscribed Queue/Hub) when the processing for that message is complete (with the response) or has failed.
Retrieve the current status of a thread's processing Fiber (e.g., Idle, Running, Paused, Killed).
Pause a specific thread to temporarily halt its processing of new messages.
Resume a paused thread.
Forcibly kill the processing Fiber for a specific thread if it appears unresponsive or needs termination.
Create a new thread that branches from an existing thread at its current end state, inheriting its configuration and history lineage.
Attach an existing file (fileId) to a specific threadId.
List the files attached to a specific threadId.
Remove a file attachment from a specific threadId.
As a Framework Maintainer, I want to:
Define the schema for storing thread configuration (ThreadConfigurationEntity).
Ensure each thread's processing runs in an isolated Fiber.
Ensure thread configuration is immutable after creation.
Provide clear error types for thread operations and processing failures.
5. Functional Requirements

5.1. IThreadService Interface & ThreadService Tag: Define using Effect.Tag.
5.2. Core Data Structures:
ThreadConfigurationSchema: Zod schema defining immutable thread settings: systemPrompt: string, modelId: string, originatingThreadId: string, parentThreadId: Option<string>, tags: ReadonlyArray<string> (tags likely managed via TagService but stored/retrieved here based on originatingThreadId), executionParams: { temperature?: number, thinkingLevel?: "low" | "medium" | "high", imageCapabilityNeeded?: boolean, embeddingOutputNeeded?: boolean, structuredOutputSchema?: string /* JSON string representation of Zod/JSON schema */, maxInputTokens?: number, maxOutputTokens?: number, maxTime?: number }, status: "active" | "locked" | "dead".
ThreadConfigurationEntityDataSchema (for RepositoryService): Based on ThreadConfigurationSchema.
ThreadStatus: Enum or type representing runtime Fiber status (e.g., "Idle", "Running", "Paused", "Completed", "Failed", "Killed").
5.3. Thread Lifecycle Operations:
createThread(params: { initialConfig: ThreadConfigInput /* subset of ThreadConfiguration */, initialMessages?: ReadonlyArray<ChatMessage> }): Effect< { threadId: string }, ThreadCreationError | DataValidationError >: Creates a new thread record, initializes its configuration (setting originatingThreadId to the new threadId, parentThreadId to None, status to "active"), saves initial messages via ChatMemoryService, and starts its associated processing Fiber.
branchThread(params: { parentThreadId: string }): Effect< { newThreadId: string }, ThreadNotFoundError | ThreadLockedError | ThreadCreationError >: Creates a new thread that branches from parentThreadId. Copies configuration from the parent, sets parentThreadId and originatingThreadId appropriately. Updates the parent thread's status to "locked" in the repository. Starts a new Fiber for the branched thread. Fails if the parent doesn't exist or is already "dead".
pauseThread(params: { threadId: string }): Effect<void, ThreadNotFoundError | ThreadProcessingError>: Signals the thread's Fiber management logic to stop processing new incoming messages. Updates runtime status to "Paused".
resumeThread(params: { threadId: string }): Effect<void, ThreadNotFoundError | ThreadProcessingError>: Signals the thread's Fiber management logic to resume processing new incoming messages. Updates runtime status from "Paused" to "Idle" or "Running".
killThread(params: { threadId: string }): Effect<void, ThreadNotFoundError | ThreadProcessingError>: Interrupts the processing Fiber associated with the threadId. Updates runtime status to "Killed". Updates persistent status to "dead".
getStatus(params: { threadId: string }): Effect<ThreadStatus, ThreadNotFoundError>: Returns the current runtime status of the thread's Fiber.
5.4. Message Processing:
processMessage(params: { threadId: string, message: ChatMessage /* User message */ }): Effect<void, ThreadNotFoundError | ThreadProcessingError | ThreadPausedError | DataValidationError>: The primary entry point for user interaction. Submits the message to the thread's processing Fiber (e.g., via a Queue). Fails immediately if the thread is Paused or Killed/Dead.
Internal Processing Loop (per Fiber):
Wait for incoming message via internal Queue/Hub.
Save user message via ChatMemoryService.addMessages.
Retrieve thread config via RepositoryService.findById.
Retrieve history via ChatMemoryService.getMessages (handling branching history lookup).
Construct prompt/context for LLM.
Call ModelProviderService.generateCompletion (or similar) using thread config parameters.
Handle response: Validate against structuredOutputSchema if present. Handle potential model errors.
Save AI response via ChatMemoryService.addMessages.
Publish completion result or error via notification mechanism (Hub/Queue).
Loop back to wait for next message.
5.5. Attachment Management:
attachFileToThread(params: { threadId: string, fileId: string }): Effect<void, ThreadNotFoundError | AttachmentError>: Facade method calling AttachmentService.attachFile.
listThreadAttachments(params: { threadId: string }): Effect<ReadonlyArray<AttachmentInfo>, ThreadNotFoundError | GenericAttachmentError>: Facade method calling AttachmentService.listAttachments.
removeAttachmentFromThread(params: { threadId: string, fileId: string }): Effect<void, ThreadNotFoundError | AttachmentError>: Facade method calling AttachmentService.removeAttachment.
5.6. Fiber Management:
Maintain an internal runtime mapping (e.g., Ref<Map<threadId, Fiber.Runtime<never, never>>>) of active Fibers.
Implement logic for starting Fibers (createThread, branchThread), interrupting them (killThread), and potentially managing their lifecycle/supervision.
5.7. Notification Mechanism:
Utilize an Effect Hub or Queue to publish events related to message processing completion (success with response details) or failure (with error details) for specific threadIds. External services (Supervisor, App backend) can subscribe to these.
5.8. Error Handling: Define specific errors (ThreadCreationError, ThreadNotFoundError, ThreadLockedError, ThreadProcessingError, ThreadPausedError, OutputValidationError). Map errors from dependencies appropriately.
5.9. Integration & Configuration: Integrate with all dependent services. Configuration likely minimal, mostly relying on dependency configs.
6. Non-Functional Requirements (Performance depends on LLM/DB, Reliability of Fiber management, Scalability via concurrent Fibers, Maintainability, Testability requires Fiber mocking).

7. API Design (Conceptual - Effect-TS) (Interface IThreadService, Tag ThreadService, methods as described in 5.3, 5.4, 5.5).

8. Error Handling Summary (Specific errors for thread state, processing, validation, plus mapped errors from dependencies).

9. Implementation Staging Plan: (To be provided separately).

10. Open Questions / Future Considerations

Fiber Supervision: How much supervision should ThreadService provide for its Fibers vs. the external Supervisor?
History Retrieval for Branches: Efficiently retrieving and assembling history across parent pointers needs careful implementation.
State Synchronization: How to ensure consistency between persisted thread status ("active", "locked", "dead") and runtime Fiber status ("Running", "Paused", "Killed")?
Resource Management: How to limit the total number of concurrent Fibers?
Tool/Skill Integration: How does tool/skill execution fit into the message processing loop? (Likely involves ModelProviderService returning tool calls, ThreadService orchestrating SkillService execution, saving results, and potentially looping back to the model).