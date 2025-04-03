Okay, Paul, I understand now. You're looking for a **sequential build plan** that outlines the order in which specific features *across different services* should be built, based on their dependencies, rather than detailing all stages for one service before moving to the next.

Here's a plan structured that way, focusing on building capabilities incrementally across the necessary services:

---

## EffectiveAgent: Sequential Implementation Plan (v1.3)

This plan outlines the build order for components and features across services, prioritizing dependencies.

**Phase 1: Foundational Services & Core Types**

*   **Goal:** Establish the absolute basics needed by almost everything else.
*   **Steps:**
    1.  **(Core)** Define common base types (`ChatMessage`, `AttachmentInfo`, core error structures like `DataValidationError`).
    2.  **(Logging)** Implement `ILoggingService` interface, Tag, and a basic console logger Layer.
    3.  **(Repository)** Implement generic `IRepositoryService` interface, Tag, errors, and an in-memory implementation Layer.

**Phase 2: Intelligence Provider Integration**

*   **Goal:** Enable interaction with external LLMs.
*   **Steps:**
    1.  **(ModelProvider)** Define `IModelProviderService` interface, Tag, and common errors (`ModelProviderError`). Include `generateCompletion`.
    2.  **(ModelProvider)** Implement concrete adapters (Layers) for key providers (e.g., `OpenAIModelProviderLive`, `AnthropicModelProviderLive`), depending on `ILoggingService`. Handle API keys via Config.
    3.  **(Testing)** Unit tests for provider adapters (mocking API calls).

**Phase 3: Short-Term Memory Service**

*   **Goal:** Enable storing and retrieving conversation history.
*   **Steps:**
    1.  **(ChatMemory)** Define `IChatMemoryService` interface, Tag, errors (`ChatMemoryError`). Include `addMessages`, `getMessages` (basic version, no branching yet).
    2.  **(ChatMemory)** Implement basic in-memory `ChatMemoryServiceLive` Layer, depending on `ILoggingService`.
    3.  **(Testing)** Unit tests for `ChatMemoryService` basic add/get functionality.

**Phase 4: Thread Configuration & Persistence**

*   **Goal:** Define and store the configuration for individual threads.
*   **Steps:**
    1.  **(ThreadService)** Define Zod schemas: `ThreadExecutionParamsSchema`, `ThreadConfigurationEntityDataSchema`.
    2.  **(ThreadService)** Define `IThreadService` interface, `ThreadService` Tag, and initial errors (`ThreadCreationError`, `ThreadNotFoundError`, `GenericThreadError`).
    3.  **(ThreadService)** Implement `ThreadServiceLive` Layer stub, depending on `RepositoryService<ThreadConfig>` and `ILoggingService`.
    4.  **(ThreadService)** Implement `createThread` (Step 1: Persistence Only): Creates and saves `ThreadConfigurationEntityData` via `RepositoryService`. No Fiber start.
    5.  **(ThreadService)** Implement `getThreadConfiguration`: Retrieves config via `RepositoryService`.
    6.  **(Testing)** Unit tests for `ThreadService` config persistence and retrieval (mocking `RepositoryService`).

**Phase 5: Synchronous Thread Processing**

*   **Goal:** Connect Thread configuration, Memory, and Model Providers for a single request-response cycle within the `ThreadService`.
*   **Steps:**
    1.  **(ThreadService)** Add `ChatMemoryService` and `IModelProviderService` dependencies to `ThreadServiceLive`.
    2.  **(ThreadService)** Implement `processMessage` (Step 1: Synchronous Effect):
        *   Validates input.
        *   Saves user message (`ChatMemoryService`).
        *   Gets config (`RepositoryService`).
        *   Gets history (`ChatMemoryService` - basic version).
        *   Calls `IModelProviderService.generateCompletion`.
        *   Saves AI response (`ChatMemoryService`).
        *   Returns AI response directly.
    3.  **(Testing)** Unit tests for the synchronous `processMessage` flow, mocking all dependencies.

**Phase 6: Introducing Concurrency (Fibers)**

*   **Goal:** Make thread processing asynchronous and concurrent using Effect Fibers.
*   **Steps:**
    1.  **(ThreadService)** Define `ThreadRuntimeStatus` type and internal `ThreadRuntimeState` (holding Fiber, Queue, Hub, Status Ref).
    2.  **(ThreadService)** Refactor `ThreadServiceLive` to manage `Ref<Map<string, ThreadRuntimeState>>`.
    3.  **(ThreadService)** Implement internal `threadProcessingLoop` Effect based on the synchronous logic from Phase 5.
    4.  **(ThreadService)** Modify `createThread` (Step 2: Add Fiber): Fork `threadProcessingLoop` into a Fiber (`Effect.forkDaemon`), store runtime state.
    5.  **(ThreadService)** Refactor `processMessage` (Step 2: Use Queue): Look up runtime state, offer message to the thread's `inputQueue`.
    6.  **(Testing)** Unit tests verifying Fiber creation on `createThread` and message queuing in `processMessage`.

**Phase 7: Basic Lifecycle Control & Status**

*   **Goal:** Allow external control (MCP) to kill threads and check their status.
*   **Steps:**
    1.  **(ThreadService)** Implement `getStatus`: Read runtime status from the internal `Ref`.
    2.  **(ThreadService)** Implement `killThread`: Interrupt the Fiber (`Fiber.interrupt`), update persistent status to "dead", remove runtime state.
    3.  **(Testing)** Unit tests for `getStatus` and `killThread` (mocking Fiber interruption, checking state updates).

**Phase 8: Asynchronous Notifications (Hub)**

*   **Goal:** Enable external systems (MCP) to react to thread events asynchronously.
*   **Steps:**
    1.  **(ThreadService)** Define `ThreadOutputEvent` type (Completion, ProcessingError).
    2.  **(ThreadService)** Add internal `Hub<ThreadOutputEvent>` to `ThreadRuntimeState`.
    3.  **(ThreadService)** Modify `threadProcessingLoop`: Publish events (completion, errors) to the `Hub`.
    4.  **(ThreadService)** Implement `subscribeToOutput`: Return `Hub.subscribe` stream.
    5.  **(Testing)** Unit tests for `subscribeToOutput` (mocking Hub) and verifying events are published from the loop.

**Phase 9: Tool Integration**

*   **Goal:** Allow threads to execute external tools based on model requests.
*   **Steps:**
    1.  **(Core)** Define `ToolDefinition` structure (name, schema, execute Effect) and `ToolError`.
    2.  **(ThreadService)** Modify `threadProcessingLoop`: Add logic to detect tool calls from model, look up tool definition, validate input, execute tool Effect, save result message (`ChatMemoryService`), potentially loop back to model. (Requires providing tool definitions to the service).
    3.  **(Example)** Implement 1-2 simple example tools.
    4.  **(Testing)** Unit tests for the tool execution logic within the loop (mocking model responses and tool execution).

**Phase 10: Pause/Resume & Structured Output**

*   **Goal:** Add finer-grained control and output validation.
*   **Steps:**
    1.  **(ThreadService)** Add `status: Ref<...>` to `ThreadRuntimeState`. Implement `pauseThread` / `resumeThread` updating the Ref.
    2.  **(ThreadService)** Modify `processMessage`: Check status Ref, fail with `ThreadPausedError` if paused. Update `getStatus`.
    3.  **(ThreadService)** Define `OutputValidationError`. Implement structured output validation in `threadProcessingLoop` using `structuredOutputSchema` from config. Publish error via Hub on failure.
    4.  **(Testing)** Unit tests for pause/resume logic and structured output validation paths.

**Phase 11: Branching & Advanced History**

*   **Goal:** Implement thread branching and ensure correct history context across branches.
*   **Steps:**
    1.  **(ThreadService)** Implement `branchThread`: Find parent, check status, create/persist new config, update parent status ("locked"), start new Fiber. Define `ThreadLockedError`.
    2.  **(ChatMemoryService)** Refine `getMessages`: Implement logic to traverse `parentThreadId` links (provided by `ThreadService` when calling) to assemble full history context.
    3.  **(Testing)** Unit tests for `branchThread`. Test `ChatMemoryService.getMessages` with branching scenarios. Test `threadProcessingLoop` uses the correct history on branched threads.

**Phase 12: Long-Term Memory Integration**

*   **Goal:** Integrate access to long-term / vector memory.
*   **Steps:**
    *   **Option A (Generic Service):**
        1.  **(LTMService)** Define `ILongTermMemoryService` interface, Tag, errors. Implement adapter(s).
        2.  **(ThreadService)** Add `ILongTermMemoryService` dependency. Modify `threadProcessingLoop` to query LTM for context before calling the main LLM.
    *   **Option B (Via Tools):**
        1.  **(Tools)** Implement specific LTM tools (e.g., `searchVectorStoreTool`) using the Tool structure from Phase 9.
        2.  **(ThreadService)** Ensure Tool integration handles these LTM tools correctly.
    *   **(Testing)** Unit tests for LTM integration (mocking LTM service or tools).

**Phase 13: Attachment Service & Integration**

*   **Goal:** Implement file attachment handling.
*   **Steps:**
    1.  **(AttachmentService)** Define `IAttachmentService` interface, Tag, errors. Implement `AttachmentServiceLive` (in-memory or basic persistence), depending on `ILoggingService` and potentially `RepositoryService`.
    2.  **(ThreadService)** Add `IAttachmentService` dependency. Implement facade methods (`attachFileToThread`, etc.), checking thread existence and mapping errors.
    3.  **(Testing)** Unit tests for `AttachmentService`. Unit tests for `ThreadService` attachment facades.

**Phase 14: Fiber Resource Limits & Final Polish**

*   **Goal:** Add basic resource management and finalize the service.
*   **Steps:**
    1.  **(ThreadService)** Implement concurrency limiting (e.g., `Effect.Semaphore`) for active Fibers within `ThreadServiceLive`.
    2.  **(All Services)** Review error handling, logging, add TSDoc.
    3.  **(Testing)** Add integration tests covering cross-service interactions. Test resource limiting behavior.

---

This sequential plan builds features incrementally based on dependencies, ensuring that required components from other services are available before implementing features in `ThreadService` that rely on them.