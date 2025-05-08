Okay, Paul. You're absolutely right. The previous PRD focused on the "Buddy" side of the connection. We need a corresponding PRD outlining the requirements and changes on the **EffectiveAgent framework side** to support this mock WebSocket communication pattern for local demos and testing, explicitly replacing the assumption of direct function calls from the UI.

Here is the draft PRD for the EffectiveAgent framework adjustments:

---

**Product Requirements Document: EA Framework - Mock WebSocket Integration for Local Demos**

**Version:** 0.1 (Draft)
**Date:** 5/4/2025
**Author:** Paul / T3 Chat

**1. Introduction**

This document outlines the requirements for the EffectiveAgent (EA) framework to support local, in-process communication with external interfaces (like the "Buddy" ChatApp) using a **mock WebSocket implementation**.

The goal is to establish a standardized communication pattern based on WebSockets, even during local development and demo phases, by leveraging mocking libraries (e.g., `mock-socket`). This replaces any previous assumption or implementation relying on direct function calls between the external interface and internal EA services like `AgentRuntimeService`.

This ensures the framework's communication architecture aligns with the target (Phase 4) from earlier stages, facilitating smoother transitions and providing a realistic interaction model for testing.

**2. Goals**

*   Formally define and require the implementation of the `WebSocketService` as the primary interface for external real-time communication within the EA framework.
*   Define the requirements for a **Mock WebSocket Server** component (running in the same process) responsible for bridging communication between the `WebSocketService` (used by clients like Buddy) and the internal `AgentRuntimeService`.
*   Ensure the EA framework's core components (`AgentRuntimeService`, `AgentRuntimeInstance`) can operate correctly when interactions are initiated via this mock WebSocket bridge.
*   Provide clear guidelines for setting up the local demo/testing environment using the mock WebSocket approach.

**3. Non-Goals (Out of Scope)**

*   Implementation of a *real* network-based WebSocket server backend.
*   Significant changes to the core API of `AgentRuntimeService` or the internal logic of `AgentRuntimeInstance` (beyond ensuring compatibility with message-driven interaction).
*   Advanced WebSocket features (binary data, complex authentication, subprotocols).
*   Client-server state synchronization logic (Phase 6).

**4. Functional Requirements**

*   **`WebSocketService` Implementation:**
    *   The EA framework must include a standard implementation of the `WebSocketService` (as defined previously: `connect`, `disconnect`, `send`, `receive() Stream`).
    *   This service must use the standard browser `WebSocket` API internally.
    *   A corresponding Layer (e.g., `WebSocketServiceLayer`) must be provided.
*   **Mock WebSocket Server Logic:**
    *   A component responsible for acting as the mock server must be implemented (e.g., `MockWebSocketServer` class or setup function).
    *   This component must run within the same Effect context/Layer environment as the `AgentRuntimeService`.
    *   It must integrate with a mock WebSocket library (e.g., `mock-socket`) to intercept connections to a specific mock URL (e.g., `ws://local-mock-ea-bridge`).
    *   **Message Routing (Client -> EA):**
        *   On receiving a message via a mock socket connection (from `WebSocketService`), it must deserialize the message (expecting a serialized `AgentActivity`).
        *   It must identify the target `AgentRuntimeId`.
        *   It must use the injected `AgentRuntimeService` to call `agentRuntimeService.send(targetId, activity)`.
        *   It must handle potential errors during this process (deserialization, `send` errors) appropriately (e.g., logging, potentially sending an error message back via the mock socket).
    *   **Message Routing (EA -> Client):**
        *   The mock server logic needs a strategy to get relevant output/event `AgentActivity`s from `AgentRuntime` instances. This likely involves:
            *   Subscribing via `agentRuntimeService.subscribe(targetId)` when a client connects or targets a specific runtime.
            *   Filtering the stream for relevant activities (e.g., `AGENT_RUN_COMPLETED`, `CHAT_AGENT_RESPONSE`, `ERROR`).
            *   Serializing these activities.
            *   Sending the serialized data back over the corresponding mock socket connection to the `WebSocketService`.
        *   Subscription management (starting/stopping subscriptions) is required.
*   **Serialization:**
    *   A standard serialization format (JSON recommended) for `AgentActivity` objects transmitted over the mock WebSocket must be used consistently by both the `WebSocketService` client-side logic (in Buddy) and the Mock WebSocket Server logic.
*   **Demo/Test Environment Setup:**
    *   Clear instructions or helper functions must be provided for setting up the demo/test environment.
    *   This setup must include:
        *   Providing all necessary EA Layers (`AgentRuntimeService`, `AgentStore`, required EA services/pipelines, `WebSocketServiceLayer`).
        *   Initializing and running the Mock WebSocket Server logic.
        *   Configuring the `mock-socket` library to intercept the designated mock URL.

**5. Technical Design Notes**

*   **Mock Server Context:** The Mock WebSocket Server logic needs access to the `AgentRuntimeService`. This should be achieved by running its initialization Effect within the main application's composed Layer.
*   **Target ID Strategy:** Define how the mock server determines the target `AgentRuntimeId` for incoming messages (e.g., included in the message payload/metadata, or a single hardcoded ID for simple demos).
*   **Subscription Strategy:** Decide if the mock server creates one subscription per client connection or one per targeted `AgentRuntimeId`. Consider efficiency and cleanup.
*   **Error Propagation:** Define how errors encountered by the mock server (e.g., `AgentRuntimeNotFoundError` when sending) are communicated back to the client via the mock socket.

**6. Acceptance Criteria**

*   The framework provides a functional `WebSocketService` implementation and Layer.
*   The framework provides runnable Mock WebSocket Server logic (or a clear setup function).
*   When configured correctly with `mock-socket`:
    *   `WebSocketService.connect` successfully establishes a mock connection.
    *   Messages sent via `WebSocketService.send` (containing serialized `AgentActivity`) are received by the mock server logic.
    *   The mock server logic correctly calls `AgentRuntimeService.send`.
    *   The mock server logic can subscribe to `AgentRuntimeService` and receive `AgentActivity` events.
    *   Relevant `AgentActivity` events are serialized and sent back through the mock socket.
    *   The `WebSocketService.receive()` stream emits the messages sent by the mock server.
*   The setup works end-to-end within a single browser process.

---

This PRD focuses on the framework-side requirements to enable the mock WebSocket communication pattern, ensuring the EA runtime is ready to interact via this standardized (though initially mocked) interface.