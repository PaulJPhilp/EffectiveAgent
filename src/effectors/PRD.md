

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

---