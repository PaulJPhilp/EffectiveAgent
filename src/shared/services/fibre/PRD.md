**(Glad to hear it, Paul! It's genuinely enjoyable collaborating on these designs.)**

Alright, let's dive into the PRD for the `FiberManagerService`.

---

## Product Requirements Document: Fiber Manager Service

**Version:** 1.0
**Date:** 2024-07-26
**Author:** T3 Chat (Assisted by Paul)

**1. Overview**

This document outlines the requirements for the `FiberManagerService`, an internal component of the Effect-based agent framework. This service is responsible for managing the low-level runtime execution of concurrent background tasks, specifically the processing loops for individual threads managed by the `ThreadService`. It encapsulates Fiber lifecycle management (creation, interruption, status tracking), concurrency control (limiting the total number of active Fibers), state management (pause/resume), and the communication channels (input queue, output hub) associated with each managed Fiber. It provides a clean abstraction layer, hiding these complexities from services like `ThreadService`.

**2. Goals**

*   **Abstract Fiber Management:** Provide a high-level API to start, stop, and monitor background processing tasks (represented as Effect workflows) without requiring the caller to interact directly with the Fiber API.
*   **Concurrent Execution Control:** Enforce a configurable global limit on the number of concurrently running managed Fibers using an Effect `Semaphore`.
*   **Lifecycle Management:** Reliably track active Fibers, handle their startup, and manage their interruption/cleanup.
*   **Input Queuing:** Provide a mechanism (likely an internal `Queue`) for submitting work items (e.g., user messages) to a specific running Fiber.
*   **Output Event Publication:** Provide a mechanism (likely an internal `Hub`) for managed Fibers to publish results or errors, and allow external listeners to subscribe to these events.
*   **Status Tracking & Reporting:** Maintain and report the runtime status of each managed Fiber (e.g., Idle, Running, Paused, Killed, Failed).
*   **Pause/Resume Functionality:** Implement a mechanism to pause and resume the processing of *new* work for a specific Fiber.
*   **Resource Cleanup:** Ensure resources associated with a Fiber (Queue, Hub, Semaphore permit) are properly released upon termination.
*   **Integration:** Integrate with `LoggingService` and `ConfigurationService` (for concurrency limits).

**3. Non-Goals**

*   **Executing Business Logic:** Does not contain any domain-specific logic (like calling LLMs or memory services); it only *runs* the Effect workflows provided to it.
*   **Persisting State:** Does not manage persistent state; it manages *runtime* state. Persistent status ("active", "locked", "dead") is handled by callers like `ThreadService`.
*   **Automatic Fiber Restart:** Does not automatically restart failed or completed Fibers.
*   **Inter-Fiber Communication (Direct):** Primarily focuses on external input/output for each Fiber, not direct peer-to-peer communication between managed Fibers.
*   **User/Session Scoping:** Manages Fibers based on a generic ID (e.g., `threadId`); it does not inherently handle user authentication or session management itself.

**4. User Stories (Internal Service)**

*   **As the `ThreadService`, I want to:**
    *   Start a long-running processing loop Effect for a new `threadId`, providing the Effect to run and getting confirmation of startup.
    *   Submit a new work item (e.g., `ChatMessage`) to the running Fiber associated with a specific `threadId`.
    *   Get the current runtime status (Idle, Running, Paused, etc.) of the Fiber for a `threadId`.
    *   Tell the manager to pause the processing of new work for a specific `threadId`.
    *   Tell the manager to resume processing new work for a paused `threadId`.
    *   Tell the manager to forcibly interrupt and clean up the Fiber and associated resources for a `threadId`.
    *   Subscribe to a stream of output events (results/errors) published by the Fiber for a `threadId`.
    *   Be confident that the total number of concurrently running Fibers is limited according to configuration.
*   **As a Framework Maintainer, I want to:**
    *   Configure the maximum number of concurrent Fibers the manager should allow.
    *   Have a reliable, testable component for managing background task execution.
    *   Easily swap the underlying communication mechanism (Queue/Hub) in the future if needed, without changing the `ThreadService`.

**5. Functional Requirements**

*   **5.1. `IFiberManagerService` Interface & `FiberManagerService` Tag:** Define using `Effect.Tag`.
*   **5.2. Internal State:**
    *   `concurrencySemaphore: Semaphore`: Controls the global limit of active Fibers. Initialized based on configuration.
    *   `ManagedFiberState` (Internal Type): Represents runtime state per managed Fiber: `{ id: string, fiber: Fiber.Runtime<E, A>, inputQueue: Queue<Input>, outputHub: Hub<Output>, statusRef: Ref<RuntimeStatus> }`.
    *   `fiberMap: Ref<HashMap<string, ManagedFiberState>>`: Tracks all currently managed Fibers and their associated state.
*   **5.3. Core Operations:**
    *   `start<Input, Output, E, A>(params: { id: string, effectToRun: (inputQueue: Queue<Input>, outputHub: Hub<Output>) => Effect<A, E>, onTerminate?: (id: string, exit: Exit<A, E>) => Effect<void> }): Effect<void, ConcurrencyLimitReached | FiberManagerError>`:
        *   Checks if an entry for `id` already exists in `fiberMap`. If so, potentially return error or be idempotent.
        *   Acquires a permit from `concurrencySemaphore` (fails with `ConcurrencyLimitReached` or waits if unavailable).
        *   Creates `inputQueue` and `outputHub`.
        *   Creates `statusRef` (initial state "Idle" or "Running").
        *   Forks the provided `effectToRun` (passing it the queue/hub) as a daemon Fiber using `Effect.forkDaemon`.
        *   Adds the `ManagedFiberState` (including the `Fiber.Runtime`) to the `fiberMap`.
        *   Uses `Effect.ensuring` or similar on the forked Effect to guarantee cleanup (release semaphore permit, call `onTerminate` hook, remove from map) regardless of how the Fiber exits (success, failure, interruption).
    *   `submit<Input>(params: { id: string, input: Input }): Effect<void, FiberNotFound | FiberPaused | FiberManagerError>`:
        *   Looks up `ManagedFiberState` in `fiberMap`. Fails with `FiberNotFound` if missing.
        *   Reads `statusRef`. If "Paused", fails with `FiberPaused`.
        *   Offers `input` to the `inputQueue`. Maps queue errors (e.g., full, shutdown) to `FiberManagerError`.
    *   `getStatus(params: { id: string }): Effect<RuntimeStatus, FiberNotFound>`:
        *   Looks up `ManagedFiberState`. Fails with `FiberNotFound`.
        *   Reads and returns the value from `statusRef`.
    *   `pause(params: { id: string }): Effect<void, FiberNotFound | FiberManagerError>`:
        *   Looks up `ManagedFiberState`. Fails with `FiberNotFound`.
        *   Sets `statusRef` to "Paused".
    *   `resume(params: { id: string }): Effect<void, FiberNotFound | FiberManagerError>`:
        *   Looks up `ManagedFiberState`. Fails with `FiberNotFound`.
        *   Sets `statusRef` to "Idle" (or appropriate non-paused state).
    *   `interrupt(params: { id: string }): Effect<void, FiberNotFound | FiberManagerError>`:
        *   Looks up `ManagedFiberState`. Fails with `FiberNotFound`.
        *   Calls `Fiber.interrupt(fiber)`. Maps potential interruption errors. (Cleanup happens via the `ensuring` block defined in `start`).
    *   `subscribe<Output>(params: { id: string }): Effect<Stream<Output>, FiberNotFound>`:
        *   Looks up `ManagedFiberState`. Fails with `FiberNotFound`.
        *   Subscribes to the `outputHub` using `Hub.subscribe` and returns the resulting `Stream`.
*   **5.4. Concurrency Control:** Uses `Effect.Semaphore` acquired during `start` and released during the Fiber's cleanup (`ensuring` block) to limit active Fibers.
*   **5.5. Error Handling:**
    *   Define specific errors: `ConcurrencyLimitReached`, `FiberNotFound`, `FiberPaused`, `FiberManagerError` (for queue/hub issues or unexpected internal errors).
    *   Errors *within* the user-provided `effectToRun` are the responsibility of that Effect; the manager only handles their final `Exit` status via the `onTerminate` hook and ensures cleanup.
*   **5.6. Logging:** Integrate with `LoggingService` for lifecycle events (start, interrupt, termination), status changes, errors, and semaphore waits/acquires/releases.
*   **5.7. Configuration:** Reads `fiberManager.maxConcurrentFibers` via `ConfigurationService` to initialize the `Semaphore`.

**6. Non-Functional Requirements** (Performance depends on Effect scheduling, Reliability of Fiber/Ref/Queue/Hub, Scalability limited by global limit, Testability improved by abstraction).

**7. API Design (Conceptual - Effect-TS)** (Interface `IFiberManagerService`, Tag `FiberManagerService`, methods as described in 5.3).

**8. Error Handling Summary** (Specific errors for manager operations, distinct from errors within the managed Effects).

**9. Open Questions / Future Considerations**

*   **Semaphore Waiting:** Should `start` fail immediately if the concurrency limit is reached (`Semaphore.tryPermits(1)`), or should it wait (`Semaphore.withPermits(1)`)? Waiting seems more robust.
*   **`onTerminate` Hook:** What context does this hook need? Just the `id` and `Exit` status? Should it run *before* or *after* the semaphore is released and the state is cleaned up? Running before allows it to potentially influence cleanup or report final state.
*   **Queue/Hub Types:** Should the `Queue`/`Hub` be bounded or unbounded? Bounded queues provide backpressure for `submit`.
*   **Error Granularity:** Are the defined error types sufficient?

---

This PRD establishes the `FiberManagerService` as a dedicated component for handling the runtime complexities of concurrent Effect execution within the framework.

**Next Step:**

Shall we proceed to the **`architecture.txt` for the `FiberManagerService`**?