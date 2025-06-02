
## Product Requirements Document: Effective Agent & LangGraph Integration

**Version:** 1.0
**Date:** June 1, 2025
**Author:** T3 Chat (in collaboration with Paul)
**Status:** Draft

### 1. Introduction

**1.1 Purpose**
This document outlines the requirements for integrating the LangGraph agent framework with the Effective Agent (EA) TypeScript application framework. The goal is to enable developers to build robust, scalable, and maintainable AI agents using LangGraph for agent orchestration, while leveraging EA for its powerful backend services, configuration management, runtime capabilities, and error handling.

**1.2 Problem Statement**
LangGraph provides a flexible way to define stateful, multi-actor agent applications. However, developers using LangGraph often need to integrate with various external services (LLMs, file systems, custom tools, etc.) and require robust mechanisms for configuration, error handling, concurrency, and observability. Building these infrastructural components from scratch for each LangGraph agent is complex and time-consuming. The Effective Agent framework already provides these capabilities.

**1.3 Proposed Solution Overview**
The proposed solution involves extending the core EA `AgentRuntimeService` to natively support the creation, execution, and management of LangGraph-based agents. This integration will provide LangGraph agents with seamless access to EA's services through a well-defined API, abstracting away much of the underlying Effect-TS complexity for common operations while retaining its power for advanced use cases.

### 2. Goals

*   **Seamless Service Integration:** Enable LangGraph agent developers to easily and reliably utilize EA's suite of services (Model, Provider, Policy, FileSystem, ToolRegistry, etc.).
*   **Leverage EA Capabilities:** Allow LangGraph agents to benefit from EA's robust configuration management, advanced error handling (via `EffectError`), structured logging, and runtime orchestration.
*   **Simplified Developer Experience:** Provide a clear and simplified API for LangGraph nodes to perform common actions using EA services, primarily through `async` helper functions built by agent developers on top of a core EA execution method.
*   **Managed Agent Lifecycle:** Enable EA's `AgentRuntimeService` to manage the lifecycle (creation, execution, termination) of LangGraph agents as specialized EA `AgentRuntime` instances.
*   **Maintainable and Scalable Agents:** Facilitate the development of complex LangGraph agents that are easier to maintain, test, and scale due to the underlying EA framework.

### 3. Target Users

*   **Primary User:** TypeScript AI Agent Developers who are using or plan to use LangGraph for building sophisticated, stateful AI agents and require a robust backend service and runtime environment.
*   **Secondary User:** Platform engineers or architects responsible for deploying and managing AI agent systems built with EA and LangGraph.

### 4. User Stories / Use Cases

*   **UC1 (Summarization):** As an Agent Developer, I want my LangGraph node to summarize a piece of text using an EA-managed LLM, so that I don't have to manage LLM client setup, model selection logic, or low-level API calls directly in my node code.
*   **UC2 (File Operation):** As an Agent Developer, I want my LangGraph node to read content from a file managed by EA's FileSystem service, so that I can process attachments or stored data within my agent's workflow.
*   **UC3 (Tool Use):** As an Agent Developer, I want to define a set of tools for my LangGraph agent and have EA's ProviderService manage the interaction with an LLM (providing tool schemas, parsing LLM tool requests, executing the tools, and returning results to the LLM), so my agent can reliably use external capabilities.
*   **UC4 (Configuration):** As an Agent Developer, I want my LangGraph agent to utilize models and providers configured globally within EA (e.g., via `models.json`, `providers.json`), so I don't have to duplicate configuration logic.
*   **UC5 (Error Handling):** As an Agent Developer, when an EA service call fails from my LangGraph node, I want to receive a clear, typed error (e.g., `EffectError`) that I can handle appropriately.
*   **UC6 (Agent Orchestration):** As an Agent Developer, I want to instantiate and run my compiled LangGraph agent using EA's `AgentRuntimeService`, so its execution is managed within the EA ecosystem.

### 5. Proposed Solution (High-Level Design)

The integration will be achieved by enhancing the `AgentRuntimeService` within the Effective Agent framework.

1.  **`AgentRuntimeService` Augmentation:**
    *   A new method, `createLangGraphAgent(...)`, will be added to `AgentRuntimeService`. This method will take a compiled LangGraph, initial state, and an agent ID, and will return an EA `AgentRuntime` handle. This specialized `AgentRuntime` will internally map incoming `AgentActivity` to LangGraph invocations.
    *   A new method, `run<Output>(logicToRun: Effect): Promise<Output>`, will be added to `AgentRuntimeService`. This method will serve as the primary bridge for executing agent-defined logic (which is constructed as an `Effect`) and returning a `Promise`. It will handle the necessary Effect context and error wrapping.

2.  **LangGraph Agent State:**
    *   A base interface, `LangGraphAgentState`, will be defined (likely within an EA SDK module for LangGraph support). This interface will mandate the inclusion of an `agentRuntime: AgentRuntimeService` property in the state of any LangGraph agent designed to integrate with EA.
    *   Agent Developers will define their specific agent's state by extending this base interface.

3.  **Agent Developer Workflow:**
    *   The Agent Developer builds their agent logic using LangGraph (defining nodes, state, and graph structure).
    *   For common actions requiring EA services (e.g., summarization, file access, tool-enabled LLM calls), the Agent Developer will create `async` helper functions within their agent's project (e.g., in a `utils/actions.ts` file).
    *   These `async` helper functions will:
        1.  Internally define the specific action's logic as an `Effect`. This `Effect` will use the service accessors (e.g., `agentRuntime.getModelService()`) available on the `agentRuntime` instance.
        2.  Call `await agentRuntime.run(definedEffect)` to execute the logic and get a `Promise`.
    *   LangGraph nodes (which are typically `async` functions) will then call these simple, Promise-returning `async` helper functions, passing the `agentRuntime` instance from their state.

### 6. Detailed Requirements & Responsibilities

**6.1 `AgentRuntimeService` (EA Framework Component)**

*   **Responsibilities:**
    *   **Implement Existing Functionalities:** Continue to provide all current `AgentRuntimeServiceApi` capabilities (managing generic EA `AgentRuntime` instances, providing service accessors like `getModelService`, `getProviderService`, `getPolicyService`, `getFileSystem`, `getToolRegistryService`). These service accessors return `Effect`s.
    *   **Implement `createLangGraphAgent` Method:**
        *   Accept a unique `AgentRuntimeId`, a compiled LangGraph object (with an `invoke` method), the initial `LangGraphAgentState` (which must include the `agentRuntime` instance), and optional LangGraph run options.
        *   Return an `Effect.Effect<AgentRuntime<TState>, AgentRuntimeError | Error>`, where `AgentRuntime<TState>` is a handle to the newly created and running LangGraph agent.
        *   The created `AgentRuntime` instance for the LangGraph agent must:
            *   Internally manage the LangGraph's state (`TState`).
            *   Process incoming `AgentActivity` by invoking the LangGraph's `invoke` method with the current state and activity payload (details of activity-to-invocation mapping TBD).
            *   Ensure the LangGraph's `invoke` method (and thus its nodes) executes within an Effect context where the `AgentRuntimeService.Default` layer is provided.
            *   Handle errors from LangGraph execution, potentially emitting error activities or updating its state.
    *   **Implement `run` Method:**
        *   Signature: `run<Output, LogicError, LogicContext>(logicToRun: Effect.Effect<Output, LogicError, LogicContext>): Promise<Output>`
        *   Provide the necessary Effect context/layer (typically `AgentRuntimeService.Default`) to the `logicToRun` Effect.
        *   Execute the `logicToRun` Effect using `Effect.runPromiseExit` (or similar).
        *   On successful execution, resolve the Promise with the output value.
        *   On failed execution (i.e., `Exit.Failure`), extract the `Cause`. If the failure is already an `EffectError`, rethrow it. Otherwise, wrap the `Cause` (or its primary error) in an `EffectError` and throw that. This ensures consistent error typing for the caller.
    *   **`ProviderService` Tool Handling:**
        *   The `ProviderService` (when called for LLM generation with tools) must:
            *   Accept tool definitions (e.g., schemas obtained from `ToolRegistryService`).
            *   Format and provide these tool definitions to the LLM.
            *   Parse LLM responses that indicate a tool call.
            *   Securely look up the corresponding `EffectiveTool` from `ToolRegistryService`.
            *   Execute the tool's `Effect` (e.g., `tool.execute(args)`), providing necessary context.
            *   Return the tool's output to the LLM to continue the generation.
            *   Handle errors during tool execution and report them appropriately (e.g., back to the LLM or as a failure of the overall generation Effect).

**6.2 EA SDK (LangGraph Support Module - e.g., `agent-runtime/langgraph-support/`)**

*   **Responsibilities:**
    *   **Define `LangGraphAgentState` Base Interface:**
        ```typescript
        import type { AgentRuntimeService } from "../api"; // Path to the augmented AgentRuntimeService interface

        export interface LangGraphAgentState {
          agentRuntime: AgentRuntimeService;
          [key: string]: any; // Allows for additional agent-specific state properties
        }
        ```
    *   Provide any other minimal, essential types or constants required for the generic integration between EA and LangGraph agents (e.g., standard activity types for triggering LangGraph if needed).

**6.3 Agent Developer (Building a specific LangGraph Agent using EA)**

*   **Responsibilities:**
    *   **Define Agent Logic:** Design and implement the agent's control flow, states, and transitions using LangGraph's `StateGraph` and node functions.
    *   **Define Agent State:** Create a TypeScript interface for their agent's specific state, ensuring it extends the `LangGraphAgentState` provided by the EA SDK (thus including the `agentRuntime: AgentRuntimeService` property).
    *   **Instantiate Agent:** Use the `agentRuntime.createLangGraphAgent(...)` method (provided by an instance of EA's `AgentRuntimeService`) to compile and run their LangGraph agent, providing the initial state which includes the `agentRuntime` instance itself.
    *   **Create `async` Helper Functions:** For common operations involving EA services, create `async` helper functions within their agent's project (e.g., in `utils/actions.ts`). These functions will:
        1.  Accept the `agentRuntime: AgentRuntimeService` instance as a parameter, along with any other necessary inputs.
        2.  Internally, define the required logic as an `Effect`. This `Effect` will typically use `Effect.gen` and `yield*` to compose calls to EA service accessors (e.g., `yield* runtime.getModelService()`, then `yield* modelService.findModelsByCapability(...)`).
        3.  Call `await agentRuntime.run(definedEffect)` to execute the `Effect` and obtain a `Promise`.
        4.  Return the result from the Promise.
    *   **Utilize Helpers in Nodes:** Call these `async` helper functions from their LangGraph node functions (which are typically `async` functions themselves) using `await`.
    *   **Error Handling in Nodes:** Implement `try/catch` blocks in LangGraph nodes to handle potential errors (including `EffectError` instances) thrown by the `async` helper functions (which propagate errors from `agentRuntime.run`).
    *   **Tool Definition:** If the agent uses LLM-mediated tools, define these tools according to EA's `ToolRegistryService` schema (e.g., in `tools.json` or programmatically) so they can be discovered and executed by EA's `ProviderService`.
    *   **Project Structure:** Organize their agent project code clearly (e.g., `nodes/`, `utils/`, `agent.ts`, `agent-state.ts`).

### 7. Success Metrics

*   **Time to Integrate:** Developers can integrate a new LangGraph agent with core EA services (LLM calls, file access) within a predefined short timeframe (e.g., < X hours).
*   **Code Clarity:** The code within LangGraph nodes for performing common EA-backed actions is concise and primarily uses `async/await` with helper functions, rather than direct Effect monad manipulation.
*   **Error Propagation:** Errors originating from EA services are consistently propagated as `EffectError` and can be reliably caught and handled by agent developers.
*   **Developer Feedback:** Positive qualitative feedback from agent developers regarding ease of use, clarity of the integration pattern, and robustness.
*   **Adoption Rate:** Number of new agent projects successfully using this integration pattern.

### 8. Future Considerations (Optional)

*   **Advanced Streaming Support:** More explicit support or helpers for streaming results from EA services or LangGraph back to clients.
*   **Built-in EA SDK Helpers:** Consideration for including a small set of the most common `async` helper functions (like a basic `summarizeText`) directly within the `agent-runtime/langgraph-support/` module if they are universally applicable and stable.
*   **Debugging and Observability:** Enhanced tools or guidelines for debugging LangGraph agents running within the EA runtime, leveraging EA's logging and monitoring.
*   **Project Scaffolding:** A CLI tool or template for quickly setting up a new LangGraph agent project pre-configured to use the EA framework.

