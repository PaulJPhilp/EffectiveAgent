## Product Requirements Document: Agent Service (Generic)

**Version:** 1.0
**Date:** 2024-07-26
**Author:** T3 Chat (Derived from Paul's context)

**1. Overview**

This document outlines the requirements for the generic `AgentService`, a core component of the `EffectiveAgent` framework. This service is responsible for executing predefined agent workflows or logic graphs defined by an `AgentConfig`. It provides a standardized runtime environment for various specialized agents (e.g., persona generation, data normalization, research), managing their execution state, handling errors within the run, and integrating with necessary dependencies like model, prompt, and skill services as dictated by the agent's configuration.

**2. Goals**

*   **Execute Configured Agents:** Provide a standard mechanism (`run` method) to execute any agent defined by a valid `AgentConfig`.
*   **Manage Run State:** Initialize, manage, and return the state (`AgentState`) associated with a single execution run of an agent, including input, output, logs, errors, and internal agent state.
*   **Abstract Execution Engine:** Hide the underlying implementation details of how the agent's graph or workflow is executed (e.g., state machine, direct graph traversal).
*   **Dependency Integration:** Provide necessary dependencies (`ModelService`, `PromptService`, `SkillService`, etc.) to the executing agent logic as needed by its configuration.
*   **Standardized Interface:** Offer a consistent API for initiating agent runs.
*   **Error Handling:** Capture and report errors occurring *during* an agent run within the `AgentState`.

**3. Non-Goals**

*   **Defining Agent Logic:** The specific steps, prompts, models, and logic are defined in the `AgentConfig`, not within the generic service itself.
*   **Cross-Agent Orchestration:** Does not manage interactions *between* different agents or complex multi-step workflows involving multiple agent types (this is a Supervisor task).
*   **Managing Thread Lifecycles:** Does not create, manage, or track conversational threads (this is `ChatThreadService`).
*   **Direct User Interface Interaction.**
*   **Persistent State Management (Beyond a single run):** Manages state *during* a run; long-term persistence is handled by memory services.

**4. User Stories**

*   **As a Framework User / Agent Developer, I want to:**
    *   Define the workflow, prompts, models, and skills for a specific agent task in an `AgentConfig` file.
    *   Create a service layer for my specific agent configuration using a standard factory (`AgentServiceLive(myConfig)`).
    *   Execute my configured agent by calling a `run(input)` method on the service instance.
    *   Receive a final `AgentState` object containing the results, logs, and errors from that specific run.
    *   Have the service provide the necessary dependencies (models, prompts, skills) to my agent's logic during the run.
*   **As a Framework Maintainer, I want to:**
    *   Provide a reliable and consistent runtime for executing diverse agent configurations.
    *   Ensure the runtime correctly injects dependencies based on the agent's needs.
    *   Have a standard way to represent the state and outcome of any agent run.

**5. Functional Requirements**

*   **5.1. `IAgentService` Interface & `AgentService` Tag:** Define using `Effect.Tag`. The interface will likely be generic over Input, Output, and internal State types.
*   **5.2. Core Data Structures:**
    *   `AgentConfig` Schema: Defines the structure of an agent (e.g., graph definition with nodes/edges, required prompts, models, skills).
    *   `AgentState<Input, Output, State>` Schema: Defines the state managed during a single run (input, output, internal state, status, logs, errors).
*   **5.3. Core Operations:**
    *   `run(input: Input): Effect<AgentState<Input, Output, State>, AgentExecutionError>`:
        *   Takes input data.
        *   Initializes `AgentState`.
        *   Executes the agent logic/graph defined in the `AgentConfig` associated with this service instance.
        *   Execution involves potentially calling `ModelService`, `PromptService`, `SkillService` based on graph node definitions.
        *   Updates the `AgentState` throughout the run (e.g., adding logs, errors, intermediate results).
        *   Returns the final `AgentState` upon completion or failure.
        *   Catches internal execution errors and wraps them in `AgentExecutionError`.
    *   (Optional) `buildGraph()`: Potentially a helper to pre-process or validate the graph from the config.
    *   (Optional) `saveLangGraphConfig()`: Potentially a helper for tooling/export.
*   **5.4. Dependency Injection:** The `AgentServiceLive` Layer factory ensures that the necessary service dependencies (`ModelService`, `PromptService`, `SkillService`) are available and passed to the `makeAgentService` factory function. The execution logic within `run` uses these injected services.
*   **5.5. Error Handling:** Defines `AgentExecutionError` for failures during the `run` execution. Internal errors within the agent logic should be captured in the `AgentState.errors` field.

**6. Non-Functional Requirements** (Performance depends on agent complexity, Reliability, Testability requires mocking dependencies).

**7. API Design (Conceptual - Effect-TS)**

```typescript
interface IAgentService<Input, Output, State> {
    readonly run: (input: Input) => Effect.Effect<AgentState<Input, Output, State>, AgentExecutionError>;
    // readonly buildGraph?: () => Effect.Effect<void, AgentExecutionError>;
    // readonly saveLangGraphConfig?: (outputPath?: string) => Effect.Effect<void, AgentExecutionError>;
}
// Tag would likely be generic or handle 'any' types
class AgentService extends Context.Tag("AgentService")<AgentService, IAgentService<any, any, any>>() {}
