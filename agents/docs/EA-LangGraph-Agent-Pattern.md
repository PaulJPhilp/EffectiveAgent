
## Detailed Design Document: The EA-LangGraph Agent Pattern (Generic)

**Version:** 1.0
**Date:** June 1, 2025
**Author:** T3 Chat (in collaboration with Paul)
**Status:** Draft

### 1. Introduction

This document describes the recommended architectural pattern and development workflow for building LangGraph agents that integrate with the Effective Agent (EA) framework. It outlines how Agent Developers can leverage the EA `AgentRuntimeService` (including its LangGraph-specific extensions) and the EA SDK for LangGraph Support to create robust, service-enabled AI agents.

This pattern aims to provide clarity on structuring an agent project, managing state, interacting with EA services, and handling errors.

### 2. Goals of the Pattern

*   Provide a clear, repeatable structure for developing LangGraph agents that use EA.
*   Promote best practices for state management, service interaction, and error handling.
*   Enable Agent Developers to focus on agent logic (LangGraph orchestration and node implementation) while abstracting common backend complexities.
*   Ensure that LangGraph agents are well-behaved citizens within the EA runtime environment.

### 3. Core Components and Concepts Recap

This pattern relies on the following components detailed in previous design documents:

*   **Augmented `AgentRuntimeService`:** The EA service (interface `AgentRuntimeService`) providing:
    *   `createLangGraphAgent(...)`: To instantiate and run the LangGraph agent as an EA `AgentRuntime`.
    *   `run<Output>(logicToRun: Effect): Promise<Output>`: To execute Effect-based logic from agent code.
    *   Service accessors (e.g., `getModelService()`, `getProviderService()`) returning `Effect`s.
*   **EA SDK for LangGraph Support:** Primarily provides the `LangGraphAgentState` base interface.
*   **Agent Developer's Project:** A standalone project for a specific LangGraph agent, which imports the EA framework as a dependency.

### 4. Recommended Agent Project Structure

A standardized project structure is recommended for clarity and maintainability (as discussed previously, e.g., "Standalone Agent Project V3"):

```
my-specific-agent/
├── agent/                          # Core logic for this LangGraph agent
│   ├── nodes/                      # LangGraph node implementations (async functions)
│   │   └── index.ts
│   ├── utils/                      # Agent-specific helper functions
│   │   ├── actions.ts              # Async helpers (e.g., summarizeText) that use agentRuntime.run()
│   │   ├── effect-definitions.ts   # Functions that define/create Effects (called by actions.ts)
│   │   └── index.ts
│   ├── prompts/                    # Prompt templates
│   ├── schemas/                    # Input/output/tool schemas
│   ├── agent.ts                    # LangGraph StateGraph definition and compilation
│   ├── agent-state.ts              # Agent's specific state interface (extends LangGraphAgentState)
│   ├── constants.ts
│   └── types.ts
│
├── config/                         # (Optional) Agent-specific configs, or reliance on EA global config
├── __tests__/
├── main.ts                         # Entry point to run THIS agent (uses AgentRuntimeService.createLangGraphAgent)
├── package.json                    # Includes EA framework as a dependency
├── tsconfig.json
└── README.md
```

### 5. Agent Development Workflow and Pattern Details

**5.1. Defining Agent State (`agent/agent-state.ts`)**

1.  **Extend `LangGraphAgentState`:** The agent's specific state interface must extend `LangGraphAgentState` from the EA SDK.
    ```typescript
    import type { LangGraphAgentState } from 'my-effective-agent-framework/agent-runtime/langgraph-support';
    import type { AgentRuntimeService } from 'my-effective-agent-framework/agent-runtime'; // For clarity if needed

    export interface MyAgentSpecificState extends LangGraphAgentState {
      // agentRuntime: AgentRuntimeService; // Inherited
      messages: Array<{ role: string; content: string }>;
      // other agent-specific fields
    }
    ```
2.  **Initial State:** When the agent is instantiated via `agentRuntime.createLangGraphAgent(...)` in `main.ts`, the initial state provided must include a valid instance of `AgentRuntimeService` for the `agentRuntime` property.

**5.2. Defining Agent Logic (`agent/agent.ts`)**

1.  **Graph Definition:** Use LangGraph's `StateGraph` to define the agent's nodes and edges.
    ```typescript
    import { StateGraph, END } from "@langchain/langgraph";
    import type { MyAgentSpecificState } from "./agent-state";
    import { someNode, anotherNode } from "./nodes"; // Import node functions

    export function createCompiledGraph() {
      const graph = new StateGraph<MyAgentSpecificState>({
        channels: {
          // Define state channels, including those updated by nodes
          messages: { value: (x, y) => x.concat(y), default: () => [] },
          // ... other channels
        },
      });

      graph.addNode("nodeA", someNode);
      graph.addNode("nodeB", anotherNode);
      graph.setEntryPoint("nodeA");
      graph.addEdge("nodeA", "nodeB");
      graph.addEdge("nodeB", END);

      return graph.compile();
    }
    ```

**5.3. Implementing LangGraph Nodes (`agent/nodes/`)**

1.  **Node Signature:** Nodes are typically `async` functions that take the agent's current state and return a partial state update.
    ```typescript
    import type { MyAgentSpecificState } from "../agent-state";
    import { someActionHelper } from "../utils/actions"; // Agent's async helper

    export async function someNode(state: MyAgentSpecificState): Promise<Partial<MyAgentSpecificState>> {
      const { agentRuntime, someInputData } = state; // Destructure agentRuntime for use

      try {
        const result = await someActionHelper(agentRuntime, someInputData);
        return { outputData: result, error: null };
      } catch (error) {
        // Handle error, potentially an EffectError from EA
        return { error: (error as Error).message };
      }
    }
    ```

**5.4. Interacting with EA Services (The Helper Pattern)**

This is the core of the EA-LangGraph integration for performing actions.

1.  **Define Effect Logic (`agent/utils/effect-definitions.ts`):**
    *   Create functions that encapsulate the low-level logic of interacting with EA services as an `Effect`. These functions depend on `AgentRuntimeService` (or its more specific service interfaces like `ModelServiceApi`) for context.
    ```typescript
    import { Effect } from 'effect';
    import type { AgentRuntimeService } from 'my-effective-agent-framework/agent-runtime';
    import { EffectError } from 'my-effective-agent-framework/agent-runtime';

    export function defineLogicForActionX(
        input: any
    ): Effect.Effect<string, EffectError, AgentRuntimeService> {
        return Effect.gen(function* (runtime: AgentRuntimeService) {
            const modelService = yield* runtime.getModelService();
            // ... compose logic using yield* ...
            return "result from action X";
        });
    }
    ```

2.  **Create `async` Action Helpers (`agent/utils/actions.ts`):**
    *   Create `async` functions that provide a simple Promise-based API for the LangGraph nodes. These helpers take the `agentRuntime` instance and other necessary parameters.
    *   Internally, they call the Effect-defining functions and use `agentRuntime.run(...)` to execute the `Effect`.
    ```typescript
    import type { AgentRuntimeService } from 'my-effective-agent-framework/agent-runtime';
    import { defineLogicForActionX } from './effect-definitions';

    export async function performActionX(
        runtime: AgentRuntimeService,
        input: any
    ): Promise<string> {
        const actionLogicEffect = defineLogicForActionX(input);
        return runtime.run(actionLogicEffect);
    }
    ```

3.  **Call Helpers from Nodes:** LangGraph nodes call these `async` action helpers.
    ```typescript
    // In a node:
    // const result = await performActionX(agentRuntime, someData);
    ```

**5.5. Tool Usage (LLM-Mediated)**

1.  **Define Tools:** Define tools according to EA's `ToolRegistryService` specifications (e.g., in a global `tools.json` or programmatically registered with EA). Each tool's execution logic should be an `Effect`.
2.  **Node Prepares for LLM Call:** A LangGraph node determines which tools are relevant for an upcoming LLM interaction.
3.  **Call EA's `ProviderService` (via an `async` helper):**
    *   The agent developer creates an `async` helper (e.g., `generateWithTools(runtime, prompt, toolNames)`).
    *   This helper internally defines an `Effect` that:
        *   Gets `ToolRegistryService` and `ProviderService` from `runtime`.
        *   Gets tool definitions/schemas from `ToolRegistryService` for the specified `toolNames`.
        *   Calls a method on `ProviderService` (e.g., `providerService.generateTextWithTools(modelId, prompt, toolDefinitions)`). This EA `ProviderService` method is responsible for the entire LLM tool-use loop (sending schemas, parsing LLM requests for tool calls, executing the tool's `Effect` via `runtime.run()`, and returning results to the LLM).
    *   The helper then uses `runtime.run()` to execute this overall `Effect`.
4.  **Node Receives Final LLM Response:** The LangGraph node receives the final textual response from the LLM after all tool interactions have been handled by EA's `ProviderService`.

**5.6. Error Handling**

1.  **`agentRuntime.run()`:** This method (provided by EA) will consistently throw `EffectError` instances (or errors that extend/wrap it) when an `Effect` fails.
2.  **`async` Helper Functions:** These helpers should generally let errors from `agentRuntime.run()` propagate. They can, if necessary, catch specific `EffectError`s to add more context before re-throwing.
3.  **LangGraph Nodes:** Nodes must use `try/catch` blocks when calling the `async` helper functions. They should check for `EffectError` to handle EA-specific failures gracefully and update the agent's state accordingly (e.g., setting an error message).

**5.7. Agent Instantiation and Execution (`main.ts`)**

1.  **Get `AgentRuntimeService`:** Obtain an instance of EA's `AgentRuntimeService`.
2.  **Compile LangGraph:** Get the compiled LangGraph object (e.g., from `agent/agent.ts`).
3.  **Prepare Initial State:** Construct the initial state object for the agent, ensuring the `agentRuntime` property is set to the obtained `AgentRuntimeService` instance.
4.  **Create and Run Agent:** Call `agentRuntime.createLangGraphAgent(...)` with the agent ID, compiled graph, and initial state. This returns an `AgentRuntime` handle.
5.  **Interact (Optional):** Use the `agentRuntime` handle to `send` activities to the LangGraph agent, `getState`, or `subscribe` to its activity stream.

### 6. Benefits of this Pattern

*   **Clear Separation of Concerns:**
    *   EA Framework: Provides runtime, service access, Effect execution bridge (`run`).
    *   Agent Developer (`utils/effect-definitions.ts`): Defines *what* to do as `Effect`s.
    *   Agent Developer (`utils/actions.ts`): Provides simple `async` APIs for nodes.
    *   Agent Developer (`nodes/`): Implements node logic using simple `async` APIs.
*   **Simplified Node Logic:** LangGraph nodes remain clean and focused on `async/await` calls to well-named helper functions.
*   **Testability:**
    *   `Effect`-defining functions can be tested in isolation with a mock `AgentRuntimeService`.
    *   `async` helper functions can be tested by mocking `agentRuntime.run()`.
    *   Nodes can be tested by mocking the `async` helper functions.
*   **Leverages EA Strengths:** Configuration, error consistency (`EffectError`), and service management are handled by EA.

### 7. Non-Goals

*   This pattern does not prescribe the internal logic of LangGraph nodes beyond how they interact with EA services.
*   It does not dictate specific state management techniques within LangGraph beyond the base state requirements.