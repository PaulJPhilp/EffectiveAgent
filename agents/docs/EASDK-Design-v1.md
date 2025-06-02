Okay, Paul, let's move on to the second document: **"The EA SDK (LangGraph Support Module)"**.

This document will detail the minimal set of types, interfaces, and potentially helper constants or functions that the Effective Agent framework will provide as an "SDK" to facilitate the integration of LangGraph agents. This module would likely reside within your `agent-runtime/` directory, perhaps in a subfolder like `langgraph-support/`.

---

## Detailed Design Document: The EA SDK (LangGraph Support Module)

**Version:** 1.0
**Date:** June 1, 2025
**Author:** T3 Chat (in collaboration with Paul)
**Status:** Draft

### 1. Introduction

This document specifies the components that will constitute the Effective Agent (EA) Software Development Kit (SDK) module designed to support the integration of LangGraph agents. This SDK module aims to provide LangGraph agent developers with the essential, minimal building blocks required to connect their agents to the EA `AgentRuntimeService` and leverage its capabilities.

The primary goal of this SDK module is to define clear contracts and base types for the integration, rather than providing extensive utility functions (as agent-specific helpers are expected to be developed within individual agent projects).

This module will be part of the EA framework, likely located at `agent-runtime/langgraph-support/`.

### 2. Goals

*   Define a base state interface for LangGraph agents integrating with EA, ensuring necessary EA context is available.
*   Provide clear type definitions for any specific data structures exchanged between EA and LangGraph agents (if any beyond standard `AgentActivity`).
*   Offer a centralized location for any constants or minimal utilities that are fundamental to the EA-LangGraph integration pattern.
*   Keep the SDK minimal and focused, avoiding premature abstraction or overly broad utility sets.

### 3. SDK Components

**3.1 `LangGraphAgentState` Base Interface**

*   **Purpose:** To establish a common baseline for the state object of any LangGraph agent that intends to integrate with the EA `AgentRuntimeService`. It ensures that the `AgentRuntimeService` instance is accessible from within the LangGraph agent's state, enabling nodes to call its methods (e.g., `run`, `getModelService`).
*   **Definition:**
    ```typescript
    // File: agent-runtime/langgraph-support/types.ts (or similar)

    import type { AgentRuntimeService } from "../api"; // Assuming api.ts exports the augmented AgentRuntimeService interface

    /**
     * Base interface for the state object of a LangGraph agent integrated with Effective Agent.
     * Agent-specific state interfaces should extend this type.
     */
    export interface LangGraphAgentState {
      /**
       * An instance of the Effective Agent `AgentRuntimeService`.
       * This provides access to EA services and the `run` method for executing Effects.
       */
      readonly agentRuntime: AgentRuntimeService;

      /**
       * Allows for additional, agent-specific state properties.
       */
      [key: string]: any;
    }
    ```
*   **Usage:**
    Agent developers will define their specific LangGraph agent's state interface by extending `LangGraphAgentState`.
    ```typescript
    // Example in an agent's project (e.g., my-agent/agent-state.ts)
    import type { LangGraphAgentState } from 'my-effective-agent-framework/agent-runtime/langgraph-support'; // Path to SDK type
    import type { SomeAgentSpecificType } from './types';

    export interface MySpecificAgentState extends LangGraphAgentState {
      messages: Array<{ role: string; content: string }>;
      currentTask?: string;
      agentSpecificData?: SomeAgentSpecificType;
      // agentRuntime is inherited
    }
    ```
*   **Rationale:**
    *   Ensures type safety and discoverability for the `agentRuntime` property.
    *   Provides a clear contract for the `createLangGraphAgent` method in `AgentRuntimeService` regarding the expected structure of the initial state.

**3.2 Standardized `AgentActivity` Payloads for LangGraph (Optional - TBD)**

*   **Purpose:** If there's a need to standardize how `AgentActivity` payloads are mapped to inputs for LangGraph agents when `agentRuntime.send(activity)` is called on a LangGraph agent instance.
*   **Consideration:**
    Currently, the design for `createLangGraphAgent` suggests that the activity payload might be passed via `options.configurable.input_activity` to the LangGraph `invoke` method.
    If specific activity `type` values (e.g., `"langgraph_input"`, `"user_message_for_langgraph"`) are intended to carry structured payloads specifically for LangGraph, their interfaces could be defined here.
    ```typescript
    // Example (if needed):
    // export interface LangGraphInputActivityPayload {
    //   graphInput: any; // The specific input expected by the LangGraph's entry point
    //   // other metadata
    // }

    // export interface LangGraphInputActivity extends AgentActivity {
    //   type: "langgraph_input";
    //   payload: LangGraphInputActivityPayload;
    // }
    ```
*   **Decision:** For V1, this might be an over-specification. It might be better to leave the interpretation of the generic `AgentActivity.payload` (or how it's mapped to `configurable` options) to the specific implementation of `createLangGraphAgent` and the design of the individual LangGraph agent.
*   **Recommendation:** Defer defining specific activity payload types for LangGraph in the SDK for now, unless a strong need emerges. The generic `AgentActivity` should suffice, with the mapping handled by the `createLangGraphAgent` runtime logic.

**3.3 Constants (Minimal)**

*   **Purpose:** To provide any shared string constants or enum-like values that are critical for the interaction between EA and LangGraph agents, if any.
*   **Examples (Hypothetical - only if strictly necessary):**
    *   `LANGGRAPH_CONFIG_KEY_ACTIVITY_PAYLOAD = "input_activity"`: If the key used in `options.configurable` for passing the activity payload is standardized.
*   **Recommendation:** Avoid adding constants unless they represent a truly fixed part of the contract between the EA runtime and all LangGraph agents. For V1, it's likely no specific constants are needed in this SDK module.

**3.4 Helper Functions (Deliberately Excluded for V1)**

*   **Rationale:** As per the PRD and our discussions, agent-specific `async` helper functions (like `summarizeText`) that wrap Effect-based logic and call `agentRuntime.run()` are the responsibility of the Agent Developer and will reside within their individual agent projects (e.g., in `utils/actions.ts`).
*   **Reasoning:**
    *   Keeps the EA SDK lean and focused on core contracts.
    *   Avoids the EA framework becoming a dumping ground for myriad specific action helpers, which may vary greatly between agents.
    *   Empowers agent developers to create helpers tailored precisely to their agent's needs and preferred abstractions.
*   **Future Consideration:** If a very small set of extremely common, universally applicable, and stable helper *Effect creators* (not the `async` wrappers) emerge, they could be considered for a future version of a more extensive SDK, but this is out of scope for the initial minimal SDK.

### 4. SDK Module Structure (Conceptual)

```
agent-runtime/
├── langgraph-support/
│   ├── index.ts         # Barrel file exporting SDK components
│   └── types.ts         # Contains LangGraphAgentState and any other shared types
└── ... (other agent-runtime files like api.ts, errors.ts)
```

### 5. Dependencies

*   This SDK module will have a dependency on `../api.ts` (or equivalent) for the `AgentRuntimeService` interface type.

### 6. Non-Goals for this SDK Module (V1)

*   Providing a comprehensive library of pre-built actions or `async` helper functions.
*   Abstracting away LangGraph's core APIs.
*   Providing UI components or client-side libraries.

---

Paul, this document aims to define a very minimal but essential SDK module, primarily centered around the `LangGraphAgentState` interface. The philosophy is to provide the core contract and let agent developers build their specific helpers on top.

Does this align with your expectations for "The EA SDK (LangGraph Support Module)"?