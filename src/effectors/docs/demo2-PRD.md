
**Product Requirements Document: Multi-Step Task Effector Example**

**Version:** 0.1 (Draft)
**Date:** 5/4/2025
**Author:** Paul / T3 Chat

**1. Introduction**

This document outlines the requirements for the **Multi-Step Task Effector**, the second initial example `TaskEffector` implementation. Following the completion of Phase 2 (AgentStore), this Effector serves as another concrete test case to validate the core Effector mechanics (`EffectorInstance`, `EffectorService`) and persistence (`AgentStore`).

This Effector will simulate a task composed of several sequential steps (e.g., 3 steps). It will manage its internal state to track progress through these steps and log the completion of each step as an `AgentRecord` to the `AgentStore`. It will use simulated delays (`Effect.sleep`) for each step and will not perform real work.

**2. Goals**

*   Provide a concrete implementation of `processingLogic` for a sequential task.
*   Demonstrate state management within an `EffectorInstance` to track progress through multiple defined steps.
*   Validate the interaction between an Effector's `processingLogic` and the `AgentStore` service for logging progress milestones.
*   Further verify the `EffectorService`'s ability to manage Effectors performing slightly more complex internal state transitions.
*   Serve as a clear example for developers implementing sequential workflows within an Effector.
*   Help identify refinements needed for `AgentRecord`, core Effector/Service implementation, or state management patterns based on this use case.

**3. Non-Goals (Out of Scope)**

*   Performing actual work during each step.
*   Implementing complex branching, parallelism, or conditional logic between steps.
*   Handling complex error recovery or retries between steps (basic failure logging is acceptable).
*   Direct communication with other Effectors.
*   Integration with any UI components.

**4. Functional Requirements**

*   **Initialization:** The Effector shall be created via `EffectorService.create` with an initial state indicating it is `IDLE` or at `STEP_0`.
*   **Triggering:** The Effector shall accept an `AgentRecord` with `type: "START_MULTI_STEP_TASK"` (or similar command type). The payload might optionally specify configuration (e.g., number of steps, delay per step).
*   **State Transitions & Step Execution:**
    *   Upon receiving `START_MULTI_STEP_TASK` while `IDLE`:
        *   Transition internal state status to `PROCESSING` and `currentStep` to 1. Store configuration if provided.
        *   Log an `AgentRecord` of type `TASK_STARTED` to the `AgentStore`.
        *   Initiate the simulation for Step 1 (e.g., `Effect.sleep`). This should likely be done by sending a follow-up internal command/event record back to itself (e.g., `PROCESS_STEP_1`) to avoid blocking the main processing logic while sleeping. Alternatively, the `processingLogic` itself can return an Effect that includes the sleep and subsequent state update.
    *   Upon simulated completion of Step 1:
        *   Log an `AgentRecord` of type `STEP_COMPLETED` (payload `{ step: 1 }`) to the `AgentStore`.
        *   Update internal state `currentStep` to 2.
        *   Initiate the simulation for Step 2 (e.g., `Effect.sleep` followed by state update or self-message `PROCESS_STEP_2`).
    *   Upon simulated completion of Step 2:
        *   Log an `AgentRecord` of type `STEP_COMPLETED` (payload `{ step: 2 }`) to the `AgentStore`.
        *   Update internal state `currentStep` to 3.
        *   Initiate the simulation for Step 3.
    *   Upon simulated completion of Step 3 (Final Step):
        *   Log an `AgentRecord` of type `STEP_COMPLETED` (payload `{ step: 3 }`) to the `AgentStore`.
        *   Log an `AgentRecord` of type `TASK_COMPLETED` to the `AgentStore`.
        *   Transition internal state status to `IDLE` (or `COMPLETED`) and reset `currentStep`.
    *   **Error Handling (Simple):** If a simulated step fails (e.g., based on random chance or configuration):
        *   Log an `AgentRecord` of type `TASK_FAILED` (payload `{ step: currentStep, error: ... }`) to the `AgentStore`.
        *   Transition internal state status to `ERROR` or `FAILURE`. Stop processing further steps for this task run.
    *   Receiving `START_MULTI_STEP_TASK` while already `PROCESSING` should ideally be ignored or log a warning.
*   **Persistence:** All significant events (`TASK_STARTED`, `STEP_COMPLETED`, `TASK_COMPLETED`, `TASK_FAILED`) must result in corresponding `AgentRecord`s being added to the `AgentStore` via the `AgentStoreApi`.
*   **Termination:** The Effector must be terminable via `EffectorService.terminate`, which should stop its processing loop and clean up resources.

**5. Data Structures**

*   **State (`S`): `MultiStepTaskState`**
    ```typescript
    // Example definition within effector's types or implementation file
    import { EffectorStatus } from "@/effector/types"; // Adjust path

    // Could reuse EffectorStatus or define more specific ones
    type MultiStepStatus = EffectorStatus.IDLE | EffectorStatus.PROCESSING | EffectorStatus.COMPLETED | EffectorStatus.FAILURE | EffectorStatus.ERROR;

    interface MultiStepTaskState {
      status: MultiStepStatus;
      currentStep: number; // e.g., 0 for idle, 1, 2, 3 during processing
      totalSteps: number; // Configured number of steps
      config?: unknown; // Store original task config if needed
      error?: unknown; // Store failure error if applicable
    }
    ```

*   **`AgentRecord` Types & Payloads:**
    *   **Command:**
        *   `type: "START_MULTI_STEP_TASK"`
        *   `payload: { totalSteps?: number; stepDelayMs?: number }` (optional config)
    *   **Events:**
        *   `type: "TASK_STARTED"`
        *   `payload: { config?: unknown }`
        *   `type: "STEP_COMPLETED"`
        *   `payload: { step: number }`
        *   `type: "TASK_COMPLETED"`
        *   `payload: {}`
        *   `type: "TASK_FAILED"`
        *   `payload: { step: number; error: unknown }`
    *(These types should be added to the shared `AgentRecordType` definition)*

**6. Technical Design Notes**

*   The core logic will be implemented as a `ProcessingLogic<MultiStepTaskState, E, R>` function.
*   This function will be passed to `EffectorService.create`.
*   The environment `R` for this `processingLogic` must include `AgentStoreApi`.
*   Simulated step work will use `Effect.sleep`.
*   The transition between steps needs careful implementation. Returning long-running effects (with sleeps) directly from `processingLogic` might block processing of other messages if not handled carefully. A common pattern is for the logic handling step N completion to schedule the work for step N+1 (e.g., by returning an Effect that includes the sleep and the next state update, or by sending a delayed message back to itself).
*   State transitions will be handled by returning the new `MultiStepTaskState` from the `processingLogic` function.
*   Logging to the store will use `yield* AgentStore.addRecord(...)` within the `processingLogic`.

**7. Acceptance Criteria**

*   A `MultiStepTaskEffector` can be successfully created using `EffectorService.create`, providing its specific `processingLogic`.
*   Sending a `START_MULTI_STEP_TASK` record triggers the state to `PROCESSING`, logs `TASK_STARTED` to the `AgentStore`, and initiates step 1 simulation.
*   After simulated delays, `STEP_COMPLETED` records for each step (1, 2, 3) are sequentially logged to the `AgentStore`.
*   The Effector's internal state (`currentStep`) updates accordingly after each step.
*   Upon completion of the final step, a `TASK_COMPLETED` record is logged, and the Effector state returns to `IDLE` (or `COMPLETED`).
*   (Optional) Simulating a failure during a step correctly logs `TASK_FAILED` and halts further step processing.
*   All logged records can be retrieved from the `AgentStore`.
*   The Effector can be successfully terminated using `EffectorService.terminate`.

---