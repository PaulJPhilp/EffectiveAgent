
## Detailed Design Document: Refinements to `AgentRuntimeService` for LangGraph Integration

**Version:** 1.0
**Date:** June 1, 2025
**Author:** T3 Chat (in collaboration with Paul)
**Status:** Draft

### 1. Introduction

This document details the required refinements and additions to the existing `AgentRuntimeService` interface and its conceptual implementation within the Effective Agent (EA) framework. These changes are necessary to enable robust support for creating, managing, and interacting with LangGraph-based agents, as outlined in the "Effective Agent & LangGraph Integration PRD".

The primary goals of these refinements are:
*   To allow EA to orchestrate LangGraph agents as specialized `AgentRuntime` instances.
*   To provide a clean and powerful bridge for LangGraph agent developers to execute Effect-based logic and access EA services from their `async` LangGraph nodes.

### 2. Current `AgentRuntimeServiceApi` Overview

The existing `AgentRuntimeServiceApi` (as provided) focuses on:
*   Lifecycle management of generic `AgentRuntime` instances (`create`, `terminate`).
*   Communication with these instances (`send`, `getState`, `subscribe`).
*   Providing access to core EA services (`getModelService`, `getProviderService`, `getPolicyService`), which return `Effect`s.

This document proposes additions to this API.

### 3. Proposed Additions to `AgentRuntimeServiceApi`

The following methods will be added to the `AgentRuntimeServiceApi` interface. The `AgentRuntimeService` tag (`Context.Tag<AgentRuntimeServiceApi>`) will refer to this augmented interface.

**3.1 `createLangGraphAgent` Method**

*   **Signature:**
    ```typescript
    createLangGraphAgent: <TState extends LangGraphAgentState>(
      compiledGraph: {
        invoke: (
          state: TState,
          options?: { configurable?: Record<string, any>; [key: string]: any } // LangGraph's standard options
        ) => Promise<TState | AsyncIterable<TState>>; // Supports invoke and stream
      },
      initialState: TState, // Must include agentRuntime: AgentRuntimeService instance
      langGraphRunOptions?: { recursionLimit?: number; [key: string]: any } // Options for the invoke/stream call
    ) => Effect.Effect<
      { agentRuntime: AgentRuntime<TState>; agentRuntimeId: AgentRuntimeId },
      AgentRuntimeError // Assumes AgentRuntimeError extends EffectiveError
    >;
    ```
*   **Description:**
    This method instantiates a new EA `AgentRuntime` specifically designed to host and execute a compiled LangGraph agent.
*   **Parameters:**
    *   `compiledGraph`: The compiled LangGraph object. It must expose an `invoke` method compatible with LangGraph's standard invocation signature, which can return either a final state Promise or an `AsyncIterable` for streaming updates. The `options.configurable` field is standard for passing runtime configuration to LangGraph.
    *   `initialState: TState`: The initial state for the LangGraph agent. `TState` must extend `LangGraphAgentState` (defined in the EA SDK for LangGraph support), ensuring it contains `agentRuntime: AgentRuntimeService`. This `agentRuntime` instance within the state will be the same instance upon which `createLangGraphAgent` is being called, allowing the LangGraph agent to access its "parent" runtime services.
    *   `langGraphRunOptions`: Optional parameters to be passed to the LangGraph `invoke` call (e.g., `recursionLimit`).
*   **Returns:**
    An `Effect` that, upon success, yields an object containing:
    *   `agentRuntime: AgentRuntime<TState>`: A handle to the newly created LangGraph agent instance. `TState` is the specific state type of the LangGraph agent. This handle can be used with existing `AgentRuntimeServiceApi` methods like `terminate`, `send`, `getState`, and `subscribe`.
    *   `agentRuntimeId: AgentRuntimeId`: The unique identifier generated for this agent instance.
*   **Responsibilities of the Implementation:**
    1.  **ID Generation:** Generate a unique `AgentRuntimeId` for the new LangGraph agent instance.
    2.  **`AgentRuntime` Instantiation:** Create a new EA `AgentRuntime` instance associated with the generated `AgentRuntimeId`.
    3.  **State Management:** The internal state (`S`) of this `AgentRuntime<S>` will be `TState`.
    4.  **Activity Processing Loop:**
        *   The core processing logic for this `AgentRuntime` will be tailored for LangGraph. When an `AgentActivity` is received (via `agentRuntime.send(activity)`):
            *   Retrieve the current `TState` of the LangGraph agent.
            *   Prepare the input for the LangGraph `invoke` method. For V1, this involves passing the `AgentActivity.payload` into the `configurable` field of the `invoke` options using a standard key, e.g., `ea_activity_payload`: `compiledGraph.invoke(currentState, { ...langGraphRunOptions, configurable: { ...existingConfigurable, ea_activity_payload: activity.payload } })`.
            *   Invoke `compiledGraph.invoke(...)` with the prepared state and options.
            *   If `invoke` returns a Promise (final state), update the `AgentRuntime`'s internal state with the new `TState`.
            *   If `invoke` returns an `AsyncIterable<TState>` (streaming updates), iterate through the stream. For each yielded `TState`, update the `AgentRuntime`'s internal state. The final state from the stream becomes the new canonical state. (Note: Publishing intermediate states via `agentRuntime.subscribe()` is not a V1 requirement).
        *   All LangGraph `invoke` calls must be executed within an Effect context where the `AgentRuntimeService.Default` layer is provided. This ensures that any calls to `agentRuntime.run(...)` from within LangGraph nodes (via helpers) have the correct context.
    5.  **Error Handling:**
        *   Errors during `compiledGraph.invoke` must be caught.
        *   These errors should be wrapped in an `EffectiveError` (specifically, an `AgentRuntimeError` or a more general `EffectError` if `AgentRuntimeError` is not suitable for all LangGraph execution errors) if not already one, and can be:
            *   Logged by the `AgentRuntime`.
            *   Potentially used to update an `error` field within the `TState`.
            (Note: Optionally emitting these as a special error `AgentActivity` via `agentRuntime.subscribe()` is not a V1 requirement).
    6.  **Lifecycle Management:** Standard `terminate` functionality should gracefully shut down the LangGraph agent's processing loop.

**3.2 `run` Method**

*   **Signature:**
    ```typescript
    run: <Output, LogicError = EffectError, LogicContext = any>( // LogicError defaults to EffectError
      logicToRun: Effect.Effect<Output, LogicError, LogicContext>
    ) => Promise<Output>;
    ```
*   **Description:**
    This method serves as the primary bridge for executing arbitrary, agent-defined logic (which is constructed as an `Effect`) and returning a standard `Promise`. It allows LangGraph nodes (via `async` helper functions) to leverage EA's Effect-based services and runtime without needing to directly manage Effect lifecycles or `Exit` types in the node code.
*   **Parameters:**
    *   `logicToRun: Effect.Effect<Output, LogicError, LogicContext>`: The Effect to be executed. `LogicContext` represents the services/context this Effect depends on.
*   **Returns:**
    A `Promise<Output>` that:
    *   Resolves with the `Output` value if the `logicToRun` Effect succeeds.
    *   Rejects with an `EffectError` if the `logicToRun` Effect fails.
*   **Responsibilities of the Implementation:**
    1.  **Context Provision:** The `logicToRun` Effect must be provided with the necessary context using the mandated approach: `Effect.provide(logicToRun, AgentRuntimeService.Default)`. This ensures that if `logicToRun` itself uses `Effect.gen` and tries to `yield*` services like `AgentRuntimeService` or `ModelService`, those dependencies are correctly resolved from the default service layer.
        ```typescript
        // Conceptual implementation detail
        const effectWithContext = Effect.provide(logicToRun, AgentRuntimeService.Default);
        ```
    2.  **Execution:** Execute `effectWithContext` using `Effect.runPromiseExit`.
    3.  **Result Handling:**
        *   If `Exit.Success`, resolve the returned Promise with the success value.
        *   If `Exit.Failure`:
            *   Extract the `Cause` from the failure.
            *   If the primary error in the `Cause` (e.g., `Cause.failureOption(cause).getOrNull()`) is already an instance of `EffectError`, rethrow that `EffectError`.
            *   Otherwise, create a new `EffectError`, embedding the original `Cause` (or a summary of it) as its `cause` property, and throw this new `EffectError`. This ensures that callers of `run` consistently receive `EffectError` instances on failure.

### 4. Impact on Existing `AgentRuntimeService` Implementation

*   The concrete class implementing `AgentRuntimeServiceApi` will need to be updated to include implementations for `createLangGraphAgent` and `run`.
*   The `create` method (for generic `AgentRuntime`s) will remain, but `createLangGraphAgent` will provide a specialized path for LangGraph.
*   The internal mechanisms for managing `AgentRuntime` instances might need to accommodate the specific needs of the LangGraph-based runtimes (e.g., how their activity processing loop is structured).
*   The `AgentRuntimeService` will need access to an `Effect.Runtime` instance (or be able to create one from its layer) to execute the `Effect.runPromiseExit` call within the `run` method.

### 5. Error Handling Strategy

*   The `run` method will be the primary point where Effect failures are translated into Promise rejections for LangGraph agent developers. It will consistently throw `EffectError`.
*   The `createLangGraphAgent` method's internal LangGraph invocation logic will also catch errors from the graph's execution and should ideally wrap them in `EffectError` before logging or updating state. This ensures that if an error from a LangGraph node (which might have caught an `EffectError` from `run` and rethrown it, or thrown a new error) bubbles up, it's handled consistently by the EA runtime.

### 6. Dependencies

*   This design assumes the existence of an `EffectError` class within the EA framework.
*   It assumes the definition of a base `LangGraphAgentState` interface (to be detailed in the "EA SDK" document).
*   It relies on the standard LangGraph library for the `compiledGraph.invoke` signature.
