

**Product Requirements Document: Async Operation Task Effector Example**

**Version:** 0.1 (Draft)
**Date:** 5/4/2025
**Author:** Paul / T3 Chat

**1. Introduction**

This document outlines the requirements for the **Async Operation Task Effector**, one of the initial example `TaskEffector` implementations. Its primary purpose is to serve as a concrete test case after Phase 2 (AgentStore implementation) to validate the core Effector mechanics (`EffectorInstance`, `EffectorService`) and their integration with the persistence layer (`AgentStore`).

This Effector will simulate a typical asynchronous operation, such as fetching data from an API, managing its internal state through the process (`PENDING`, `SUCCESS`, `FAILURE`), and logging key events as `AgentRecord`s to the `AgentStore`. It will **not** perform actual network requests but will use simulated delays (`Effect.sleep`).

**2. Goals**

*   Provide a concrete implementation of a `processingLogic` function for a specific task.
*   Demonstrate state management within an `EffectorInstance` to track the status of an asynchronous operation.
*   Validate the ability of an Effector's `processingLogic` to interact with the `AgentStore` service (via its required environment `R`) to persist `AgentRecord`s.
*   Verify that the `EffectorService` can correctly create, manage the lifecycle (start processing loop, terminate), and facilitate interaction with this type of Effector.
*   Serve as a clear example for developers building their own `TaskEffector`s within the framework.
*   Help identify any potential issues or necessary refinements in the `AgentRecord` structure or the core Effector/Service implementation based on this slightly more complex use case.

**3. Non-Goals (Out of Scope)**

*   Performing actual HTTP requests or other network I/O.
*   Implementing complex error handling or retry logic beyond a simple success/failure simulation.
*   Direct communication with other Effectors (this example is self-contained).
*   Integration with any UI components.
*   Advanced features like cancellation of the async operation mid-flight.

**4. Functional Requirements**

*   **Initialization:** The Effector shall be created via `EffectorService.create` with an initial state indicating it is `IDLE`.
*   **Triggering:** The Effector shall accept an `AgentRecord` with `type: "START_FETCH"` (or similar command type) as input to begin the simulated operation. The payload should contain necessary parameters (e.g., a simulated `url` or `resourceId`).
*   **State Transitions:**
    *   Upon receiving `START_FETCH` while `IDLE`:
        *   Transition internal state status to `PENDING`.
        *   Log an `AgentRecord` of type `FETCH_STARTED` to the `AgentStore`.
        *   Initiate a simulated asynchronous delay (e.g., `Effect.sleep`).
    *   Upon simulated async completion (after delay):
        *   **Success Case:** Transition internal state status to `SUCCESS`, store a simulated result in the state, and log an `AgentRecord` of type `FETCH_SUCCEEDED` (including the result) to the `AgentStore`.
        *   **Failure Case:** Transition internal state status to `FAILURE`, store simulated error information in the state, and log an `AgentRecord` of type `FETCH_FAILED` (including the error) to the `AgentStore`.
    *   Receiving `START_FETCH` while already `PENDING`, `SUCCESS`, or `FAILURE` should ideally be ignored or log a warning (no state change or re-triggering).
*   **Persistence:** All state transitions and significant events (`FETCH_STARTED`, `FETCH_SUCCEEDED`, `FETCH_FAILED`) must result in corresponding `AgentRecord`s being added to the `AgentStore` via the `AgentStoreApi`.
*   **Termination:** The Effector must be terminable via `EffectorService.terminate`, which should stop its processing loop and clean up resources.

**5. Data Structures**

*   **State (`S`): `AsyncOperationState`**
    ```typescript
    // Example definition within effector's types or implementation file
    import { EffectorStatus } from "@/effector/types"; // Adjust path

    type AsyncOperationStatus = EffectorStatus.IDLE | EffectorStatus.PROCESSING | EffectorStatus.SUCCESS | EffectorStatus.FAILURE | EffectorStatus.ERROR; // Use subset/specific statuses

    interface AsyncOperationState {
      status: AsyncOperationStatus;
      inputUrl?: string; // Store the input that triggered the fetch
      result?: unknown; // Store simulated success result
      error?: unknown; // Store simulated failure error
    }
    ```
    *(Note: We might need to refine how `EffectorStatus` from the service level maps to the task-specific status)*

*   **`AgentRecord` Types & Payloads:**
    *   **Command:**
        *   `type: "START_FETCH"`
        *   `payload: { url: string }` (or similar identifier)
    *   **Events:**
        *   `type: "FETCH_STARTED"`
        *   `payload: { url: string }`
        *   `type: "FETCH_SUCCEEDED"`
        *   `payload: { url: string; result: unknown }`
        *   `type: "FETCH_FAILED"`
        *   `payload: { url: string; error: unknown }`
    *(These types should be added to the shared `AgentRecordType` definition)*

**6. Technical Design Notes**

*   The core logic will be implemented as a `ProcessingLogic<AsyncOperationState, E, R>` function.
*   This function will be passed to `EffectorService.create`.
*   The environment `R` for this `processingLogic` must include `AgentStoreApi`.
*   Simulated async work will use `Effect.sleep`.
*   Simulated success/failure can be achieved using `Effect.if` or `Effect.randomWith`.
*   State transitions will be handled by returning the new `AsyncOperationState` from the `processingLogic` function.
*   Logging to the store will use `yield* AgentStore.addRecord(...)` within the `processingLogic`.

**7. Acceptance Criteria**

*   An `AsyncOperationTaskEffector` can be successfully created using `EffectorService.create`, providing its specific `processingLogic`.
*   Sending a `START_FETCH` record to the Effector triggers its state to change to `PROCESSING` (or `PENDING`) and logs a `FETCH_STARTED` record to the `AgentStore`.
*   After a simulated delay, the Effector's state transitions to either `SUCCESS` or `FAILURE`.
*   A corresponding `FETCH_SUCCEEDED` (with simulated data) or `FETCH_FAILED` (with simulated error) record is logged to the `AgentStore`.
*   The logged records can be retrieved from the `AgentStore` using `AgentStore.getRecords` or `AgentStore.getRecordById`.
*   The Effector can be successfully terminated using `EffectorService.terminate`.

---