

**Product Requirements Document: EffectiveAgents Client-Side Architecture**

**Version:** 0.1 (Draft)
**Date:** 5/3/2025
**Author:** Paul (via T3 Chat)

**1. Introduction**

This document outlines the requirements and design for the client-side state management, persistence, and communication architecture within the **EffectiveAgents** framework. The goal is to provide a robust, scalable, and maintainable system for managing potentially complex, asynchronous interactions between users, UI components, and backend agent processes. This architecture leverages Effect-TS and adopts principles from the Actor Model to handle concurrency, state, and side effects reliably.

**2. Goals**

*   Provide a reliable mechanism for managing the state of multiple, concurrent agent-driven processes on the client.
*   Enable persistence of interaction history (`AgentRecord` log) on the client to support offline viewing and state recovery across sessions.
*   Facilitate real-time or near-real-time communication between the client and backend services.
*   Offer a clear and maintainable architectural pattern for developers using the EffectiveAgents framework.
*   Ensure a robust foundation for future synchronization strategies between client and server state.

**3. Scope**

*   **In Scope:**
    *   Definition and implementation pattern for the core `Effector` component (Agent+Actor).
    *   Definition of the `AgentRecord` data structure for logging and communication.
    *   Design and implementation of the client-side `AgentStore` service using Dexie.js for persistence.
    *   Definition of the `AgentStoreApi` interface.
    *   Basic patterns for `Effector`-to-`Effector` communication (intra-client).
    *   Integration of state machines (`StateMachine`/`StateGraph`) within `Effector`s.
    *   Basic WebSocket service wrapper for client-server communication.
    *   Basic UI view (`AgentRecordView`) pattern for displaying persisted state.
    *   A phased implementation plan for these components.
*   **Out of Scope (for this document):**
    *   Detailed backend architecture and API design.
    *   Specific implementations of complex `TaskEffector`s beyond simple examples.
    *   Final, polished UI design.
    *   Advanced synchronization strategies (conflict resolution, server->client merge logic).
    *   Comprehensive error handling policies across the full stack.
    *   Detailed security requirements.
    *   Performance benchmarks and optimization details.

**4. Target Audience**

Developers building applications and features using the EffectiveAgents framework.

**5. Design Overview**

The proposed architecture is based on the following core concepts:

*   **`Effector`:** The fundamental active component. Defined as an **Agent** (task-oriented) that is also an **Actor** (message-driven, stateful, concurrent), implemented using **Effect-TS**. Specific roles include `SupervisorEffector` and `TaskEffector`.
*   **`AgentRecord`:** The unit of communication and the persisted log entry. Captures events, state changes, user inputs, agent outputs, etc., within a specific process context.
*   **`AgentStore`:** An Effect service responsible for client-side persistence of `AgentRecord`s using Dexie.js/IndexedDB. Accessed via the `AgentStoreApi`.
*   **`AgentRecordView`:** The UI component responsible for rendering the state of a process based on `AgentRecord`s from the `AgentStore`.
*   **Actor Model Principles:** Communication primarily occurs via asynchronous message passing (conceptually using `AgentRecord`s). `Effector`s encapsulate state and behavior.
*   **State Management:** Complex `Effector`s (especially `SupervisorEffector`s) utilize explicit `StateMachine`s (e.g., XState or manual Effect) or `StateGraph`s (LangGraph) to manage internal logic and flow.
*   **Communication:**
    *   Intra-Client: Effect `Queue` / `PubSub`.
    *   Client-Server: WebSockets (primary), HTTP (secondary).
    *   Server-Server: gRPC (recommended if applicable).
*   **Persistence:** Dexie.js wrapped in an Effect Layer (`AgentStoreLive`) provides robust client-side storage.

**6. Open Decisions**

The following key decisions need to be finalized during development:

*   **[ ] Final `AgentRecord` Schema:** Precise fields, payload structures for all types, versioning strategy.
*   **[ ] Final `AgentStoreApi` Methods:** Complete list of required CRUD and query operations.
*   **[ ] Detailed Synchronization Strategy:** Specific protocol, triggers, error handling, `syncState` details, backend API needs for sync.
*   **[ ] `SupervisorEffector` Location:** Final decision on primary client vs. server location and implications for data flow.
*   **[ ] Comprehensive Error Handling Strategy:** How errors are typed, propagated, logged, and potentially recovered from across the system.
*   **[ ] State Machine Library Choice & Integration:** Final decision on XState vs. manual Effect state machines and the specific integration pattern.
*   **[ ] Backend API/WebSocket Contract:** Detailed definition of messages and endpoints the client will interact with.

**7. Phased Implementation Plan**

The implementation will proceed in the following phases:

**Phase 1: Build & Test In-Memory `Effector`-to-`Effector` Communication**
*   **Goal:** Create the code for a basic `Effector` and prove that two simple `Effector`s can send messages (`AgentRecord`s) to each other and react to them, all running locally within a single process.
*   **Checklist:**
    *   `[ ]` Define `AgentRecord` Type (v1: essential fields).
    *   `[ ]` Code the Basic `Effector` Pattern (mailbox, state, loop, scope).
    *   `[ ]` Implement `CounterEffector` example.
    *   `[ ]` Implement `ControllerEffector` example.
    *   `[ ]` Write Test/Runner demonstrating successful in-memory communication.
*   **Outcome:** Runnable code demonstrating basic `Effector` pattern and local message passing. Initial `AgentRecord` type defined.

**Phase 2: Introduce Client-Side Persistence (`AgentStore`)**
*   **Goal:** Persist the `AgentRecord` log locally using Dexie/IndexedDB and make it accessible to `Effector`s via an Effect service.
*   **Checklist:**
    *   `[ ]` Refine `AgentRecord` Type (v2: add persistence/sync fields).
    *   `[ ]` Define `AgentStoreApi` Interface (methods, errors).
    *   `[ ]` Implement `AgentStoreLive` Layer (Dexie + Effect wrappers).
    *   `[ ]` Integrate `AgentStore` with example Effectors (require service, write records, potentially load state).
    *   `[ ]` Test Persistence across page reloads.
*   **Outcome:** `Effector`s can persist `AgentRecord`s in IndexedDB via the `AgentStore` service.

**Phase 3: Basic Orchestration (`SupervisorEffector` State Machine)**
*   **Goal:** Implement a `SupervisorEffector` that manages a simple multi-step process using an explicit state machine, coordinating `TaskEffector`s and interacting with the `AgentStore`.
*   **Checklist:**
    *   `[ ]` Choose State Machine Approach (XState/manual Effect).
    *   `[ ]` Design Simple Multi-Step Process workflow.
    *   `[ ]` Implement `SupervisorEffector` State Machine logic.
    *   `[ ]` Define State Machine Actions (send messages, write status records).
    *   `[ ]` Implement Basic `TaskEffector`s (A & B) simulating work.
    *   `[ ]` Integrate and Test the orchestration flow via logs and `AgentStore`.
*   **Outcome:** Working example of state machine-driven orchestration with persistence.

**Phase 4: Client-Server Communication (WebSockets)**
*   **Goal:** Establish a basic WebSocket connection managed by Effect, allowing `AgentRecord`s to be sent to a mock backend and potentially received.
*   **Checklist:**
    *   `[ ]` Implement `WebSocketService` (v1: connect, disconnect, reconnect).
    *   `[ ]` Define Send/Receive Interface (Effect methods/streams, errors).
    *   `[ ]` Create Mock WebSocket Backend server.
    *   `[ ]` Integrate `WebSocketService` into an example `Effector`.
    *   `[ ]` Test Connection & Basic Messaging send/receive flow.
*   **Outcome:** Managed WebSocket connection within Effect, capable of basic message exchange with a mock server.

**Phase 5: UI Integration (`AgentRecordView`)**
*   **Goal:** Display the persisted `AgentRecord` log in a basic React UI.
*   **Checklist:**
    *   `[ ]` Create `AgentRecordView` React component.
    *   `[ ]` Develop UI Logic/Hook to fetch/subscribe to `AgentStore` data.
    *   `[ ]` Render the `AgentRecord` log in the component.
    *   `[ ]` Integrate Trigger mechanism (e.g., button) to initiate actions.
    *   `[ ]` Test Reactivity of the UI to `AgentStore` updates.
*   **Outcome:** Basic UI view displaying the `AgentRecord` log reactively.

**Phase 6: Synchronization Strategy (v1)**
*   **Goal:** Implement a basic client-to-server synchronization mechanism for `AgentRecord`s.
*   **Checklist:**
    *   `[ ]` Define Sync Logic (v1: e.g., push `local_only` records).
    *   `[ ]` Implement Sync `Effector` / Logic using `AgentStore` & `WebSocketService`.
    *   `[ ]` Refine Mock Backend to handle ACKs.
    *   `[ ]` Handle Acknowledgements on the client (update `syncState`).
    *   `[ ]` Test Sync Flow (local -> send -> backend -> ACK -> state update).
*   **Outcome:** Basic mechanism for pushing local records to a server and updating status.

**Phase 7: Advanced Features & Refinement**
*   **Goal:** Address more complex requirements, improve robustness, and add features.
*   **Checklist:** (High-level placeholders)
    *   `[ ]` Implement robust error handling & recovery.
    *   `[ ]` Develop server->client synchronization.
    *   `[ ]` Integrate LangGraph `TaskEffector`s.
    *   `[ ]` Build more complex `SupervisorEffector` state machines.
    *   `[ ]` Implement comprehensive testing suite.
    *   `[ ]` Develop framework documentation.
    *   `[ ]` Address security considerations.
    *   `[ ]` Performance optimization.
*   **Outcome:** Mature, feature-rich, and robust client-side architecture.

**8. Future Considerations**

*   Advanced offline strategies (e.g., optimistic UI updates, conflict resolution).
*   Integration with specific backend frameworks or services.
*   Formal schema definition and validation for `AgentRecord` payloads.
*   Performance tuning for large numbers of `Effector`s or `AgentRecord`s.

---Okay, understood. If centralized management isn't the primary concern right now, we can focus on making the service-based structure functional by integrating the core processing behavior.

Let's refine the design based on the `EffectorService` code you provided, but explicitly add the requirement and mechanism for running the processing loop for each Effector instance managed by the service.

---

**Detailed Design: `Effector` Component and Service**

**Version:** 0.2.1 (Integrating Processing Loop into Service approach)
**Date:** 5/3/2025
**Based on:** PRD v0.1 and provided `EffectorService` code

**1. Core Concept Recap**

Effectors are managed via an `EffectorService`. Each `Effector` instance represents a stateful, message-driven component identified by an `EffectorId`. The service handles creation, termination, state tracking, message delivery (via mailboxes), and event subscription. Crucially, the service (or a mechanism closely tied to it) is also responsible for running the core processing loop for each active Effector.

**2. Central `EffectorService`**

*   **Purpose:** Manages the lifecycle and provides access to all active `Effector` instances. It ensures each active Effector is processing its messages.
*   **Implementation:** Implemented as an Effect Service (`EffectorService` class extending `Effect.Service<EffectorServiceApi>`).
*   **Internal State:** Maintains a `Ref<Map<EffectorId, EffectorInstance>>` holding internal details (state `Ref`, mailbox, subscribers, **processing Fiber**) for each active Effector.
*   **Configuration:** Uses `EffectorServiceConfig` for settings like mailbox size, prioritization, etc. (Defaults provided).
*   **Dependencies:** Currently defined with no external service dependencies (`dependencies: []`). **Note:** Will likely require dependencies (`R`) needed by the various `processingLogic` functions it runs.

**3. `EffectorInstance` (Internal Service Representation)**

*   **`state: Ref<EffectorState<S>>`:** Holds the Effector's ID, current user-defined state (`S`), status (`IDLE`, `PROCESSING`, `TERMINATED`, etc.), and `lastUpdated` timestamp.
*   **`mailbox: PrioritizedMailbox`:** A custom mailbox implementation handling incoming `AgentRecord` messages.
*   **`subscribers: Ref<Set<Queue.Queue<AgentRecord>>>`:** Manages queues for external subscribers.
*   **`processingFiber: Fiber.Runtime<never, E>`:** Holds the running Fiber executing the Effector's specific `processingLogic` loop. (Type `E` represents potential errors from the loop/logic itself).

**4. `Effector<S>` Interface (Public Handle)**

*   This interface (defined in `effector.contract.ts`) is the public API returned when an Effector is created via the service.
*   **`id: EffectorId`:** The unique ID.
*   **`send(record: AgentRecord): Effect<void, Error>`:** Sends a message to this Effector's mailbox via the central service.
*   **`getState(): Effect<EffectorState<S>, Error>`:** Retrieves the current state object (`EffectorState`) for this Effector from the central service.
*   **`subscribe(): Stream<AgentRecord, Error>`:** Creates a subscription stream for messages processed by this Effector, managed via the central service.

**5. `EffectorServiceApi` Interface (Service Contract)**

*   This interface (defined in `effector.contract.ts`) defines the operations provided by the central `EffectorService`.
*   **`create<S, E, R>(id: EffectorId, initialState: S, processingLogic: ProcessingLogic<S, E, R>): Effect<Effector<S>, EffectorError>`:** Creates, registers, **starts the processing loop Fiber**, and returns a new Effector instance handle. Requires the specific `processingLogic` function for this Effector type. Handles ID collisions. **Note:** The service needs access to the environment `R` required by the `processingLogic`.
*   **`terminate(id: EffectorId): Effect<void, EffectorNotFoundError>`:** Marks an Effector as terminated, **interrupts its processing Fiber**, cleans up mailbox/subscribers (TBD details), and removes it from the active instances map.
*   **`send(id: EffectorId, record: AgentRecord): Effect<void, ...>`:** Sends a message to the mailbox of the specified Effector ID. Handles not found/terminated errors.
*   **`getState<S>(id: EffectorId): Effect<EffectorState<S>, EffectorNotFoundError>`:** Retrieves the state object for the specified Effector ID.
*   **`subscribe(id: EffectorId): Stream<AgentRecord, Error>`:** Creates a subscription stream for the specified Effector ID.

**6. Core Logic / Workflow (Processing Loop - *To be implemented within Service*)**

*   **Initiation:** When `EffectorService.create` is called, after creating the `EffectorInstance` resources, it must **fork** the processing loop `Fiber` using the provided `processingLogic` function. This Fiber needs to be stored in the `EffectorInstance`.
*   **Loop Logic:** The logic running inside this Fiber will be similar to the loop defined previously:
    1.  Take the next `AgentRecord` message from the instance's `mailbox`.
    2.  Retrieve the current state `S` from the instance's `state` Ref (specifically, the `state.state` field).
    3.  Execute the specific `processingLogic` function (passed during creation) with the record and current state `S`. This requires providing the necessary environment `R`.
    4.  Update the `state` Ref with the new state `S` returned by the `processingLogic`, also updating `status` and `lastUpdated`.
    5.  Handle errors (`E`) from the `processingLogic`, potentially updating the `status` to `ERROR`.
    6.  Notify subscribers via `notifySubscribers` (if applicable, perhaps after state update).
*   **Termination:** When `EffectorService.terminate` is called, it must retrieve the `processingFiber` from the `EffectorInstance` and explicitly **interrupt** it (`Fiber.interrupt`).

**7. Data Structures**

*   **`EffectorId`:**
    ```typescript
    // src/effector/types.ts (Example path)
    /**
     * Unique identifier for an Effector instance.
     * Ensures type safety by distinguishing Effector IDs from plain strings at compile time.
     * @brand EffectorId
     */
    export type EffectorId = string & { readonly _brand: "EffectorId" };

    /** Creates an EffectorId from a string. */
    export const EffectorId = (value: string): EffectorId =>
      value as EffectorId;
    ```
*   **`EffectorState<S>`:**
    ```typescript
    // src/effector/types.ts (Example path)
    import type { EffectorId } from "./types";

    // Define possible status values
    export const EffectorStatus = {
        IDLE: "IDLE", // Initial state, or waiting for messages
        PROCESSING: "PROCESSING", // Actively processing a message
        TERMINATED: "TERMINATED", // Terminated via API call
        ERROR: "ERROR" // Processing logic failed for a message
    } as const;
    export type EffectorStatus = typeof EffectorStatus[keyof typeof EffectorStatus];

    /** Represents the tracked state of an Effector instance */
    export interface EffectorState<S> {
        readonly id: EffectorId;
        readonly state: S; // The user-defined state
        readonly status: EffectorStatus;
        readonly lastUpdated: number; // Timestamp
    }
    ```
*   **`ProcessingLogic<S, E, R>` Type:** (Needs to be defined, likely in `types.ts`)
    ```typescript
    // src/effector/types.ts (Example path)
    import * as Effect from "effect/Effect";
    import type { AgentRecord } from "@/agent-record/agent-record.types"; // Adjust path

    /**
     * Defines the signature for the user-provided function that contains the
     * specific behavior of an Effector type.
     * @param record The incoming AgentRecord message.
     * @param state The current internal state (S) of the Effector.
     * @returns An Effect yielding the *next* internal state (S), potentially
     *          requiring environment R and failing with error E.
     */
    export type ProcessingLogic<S, E = unknown, R = never> = (
      record: AgentRecord,
      state: S,
    ) => Effect.Effect<S, E, R>;
    ```
*   **`AgentRecord`:** (Placeholder - Needs Refinement)
    ```typescript
    // src/agent-record/agent-record.types.ts (Example path)
    // ... (definition as before) ...
    ```
*   **Effector Errors:**
    ```typescript
    // src/effector/errors.ts
    // ... (definitions for EffectorError, EffectorNotFoundError, EffectorTerminatedError as before) ...
    ```

**8. API / Interface Code**

*   **`Effector<S>` and `EffectorServiceApi`:** Defined in `effector.contract.ts`. The `create` method signature in `EffectorServiceApi` needs to be updated to accept the `processingLogic` parameter and include its `E` and `R` types.
    ```typescript
    // src/effector/effector.contract.ts (Updated create signature)
    import { Effect, Queue, Stream } from "effect";
    import type { AgentRecord, EffectorId, EffectorState, ProcessingLogic } from "./types.js"; // Added ProcessingLogic
    import { EffectorError, EffectorNotFoundError, EffectorTerminatedError } from "./errors.js";

    // ... Effector<S> interface as before ...

    export interface EffectorServiceApi {
        /**
         * Creates a new Effector instance, starts its processing loop, and returns a handle.
         *
         * @template S The type of state for the new Effector
         * @template E The error type of the processing logic
         * @template R The environment required by the processing logic
         * @param id - The unique identifier for the new Effector
         * @param initialState - The initial state for the Effector
         * @param processingLogic - The function defining the Effector's behavior
         * @returns Effect<Effector<S>> containing the new Effector instance handle
         */
        readonly create: <S, E, R>( // Added E, R generics
            id: EffectorId,
            initialState: S,
            processingLogic: ProcessingLogic<S, E, R> // Added processingLogic param
        ) => Effect.Effect<Effector<S>, EffectorError, R>; // Added R requirement

        // ... other methods (terminate, send, getState, subscribe) as before ...
    }
    ```
*   **`EffectorService` Implementation:** Defined in `effector.service.ts`. Needs significant updates to:
    *   Accept `processingLogic` in `create`.
    *   Fork the processing loop `Fiber` in `create` (providing `R`) and store it.
    *   Interrupt the `Fiber` in `terminate`.
    *   Define how the environment `R` is provided to the forked fibers.

**9. Lifecycle Management**

*   Managed by the `EffectorService`:
    *   `create`: Initializes resources, **starts processing Fiber**.
    *   `terminate`: **Interrupts processing Fiber**, updates status, removes instance.

**10. Error Handling**

*   Service API defines specific errors.
*   Errors *within* the `processingLogic` need handling within the loop (e.g., update status to `ERROR`, log).
*   Fiber interruption errors during `terminate` should be handled.

**11. Integration Points**

*   Consumers use `EffectorService`.
*   The service needs a way to access the environment `R` required by the diverse `processingLogic` functions it will execute. This might involve requiring `R` on the `EffectorService` itself or using more advanced techniques.

---