## Product Requirements Document: Supervisor Agent Service

**Version:** 1.0
**Date:** 2024-07-26
**Author:** T3 Chat (Derived from Paul's context)

**1. Overview**

This document outlines the requirements for the `SupervisorAgentService`, a specialized service within the `EffectiveAgent` framework responsible for high-level task orchestration, routing, and management of "worker" chat threads. It acts as the central coordinator, receiving user requests or tasks, using its internal logic (potentially an LLM-driven decision graph run by a base `AgentService`) to determine the appropriate next steps, and interacting with `ChatThreadService` to delegate tasks to specialized threads. It provides an API distinct from the generic `AgentService`, focused on initiating and monitoring these orchestrated tasks.

**2. Goals**

*   **Task Orchestration:** Manage multi-step tasks that may require invoking different specialized agents or skills via chat threads.
*   **Intelligent Routing:** Analyze incoming requests and current state to determine the best next action (e.g., delegate to a specific worker thread, respond directly, request clarification).
*   **Worker Thread Management:** Leverage `ChatThreadService` to create, branch, submit messages to, subscribe to, and potentially kill worker threads based on the orchestration plan.
*   **Stateful Orchestration:** Maintain state related to ongoing orchestrated tasks (potentially using `LongTermMemoryService`).
*   **Provide Orchestration API:** Offer methods to initiate orchestrated tasks and potentially query their status.
*   **Integration:** Integrate heavily with `ChatThreadService`, `ModelProviderService` (for decision making), `PromptService`, potentially `LongTermMemoryService`, `SkillService`, and likely uses a base `AgentService` internally for its own decision logic.

**3. Non-Goals**

*   **Executing Worker Logic:** Does not execute the detailed logic of the tasks delegated to worker threads; it only manages the delegation and flow.
*   **Low-Level Fiber Management:** Relies on `ChatThreadService` (which uses `FiberManagerService`) for concurrency.
*   **Direct User Interface Interaction.**
*   **Generic Agent Execution:** While it *uses* agent execution principles internally, its primary public interface is for orchestration, not generic `run(input)`.

**4. User Stories**

*   **As an Application Backend / UI Backend, I want to:**
    *   Submit a complex user request (e.g., "Research topic X, write a draft blog post, and generate an image for it") to the `SupervisorAgentService`.
    *   Have the Supervisor break this down, potentially creating/using separate threads for research, writing, and image generation via `ChatThreadService`.
    *   Receive notifications or query the status of the overall orchestration task.
    *   Receive the final combined result (e.g., draft post and image URL) once the orchestration is complete.
*   **As a Framework Maintainer, I want to:**
    *   Provide a dedicated service for implementing complex, multi-step agent workflows.
    *   Allow the Supervisor's internal decision logic to be configured (e.g., using a specific `AgentConfig` for its internal `AgentService` runner).

**5. Functional Requirements**

*   **5.1. `ISupervisorAgentService` Interface & `SupervisorAgentService` Tag:** Define using `Effect.Tag`. This interface will contain orchestration-specific methods.
*   **5.2. Core Data Structures:** May define specific input/output types for its orchestration methods (e.g., `OrchestrationTaskInput`, `OrchestrationStatus`). Relies on schemas from dependent services (`ChatMessage`, `ThreadConfigurationEntityData`, etc.).
*   **5.3. Core Operations (Examples):**
    *   `startOrchestration(params: { taskInput: OrchestrationTaskInput, userId: string }): Effect<{ orchestrationId: string }, OrchestrationError>`: Initiates a new orchestration task. Creates necessary initial state (possibly in `LongTermMemoryService`), potentially starts its internal decision loop (e.g., by calling `run` on its internal `AgentService` instance), and returns a unique ID for the orchestration.
    *   `getOrchestrationStatus(params: { orchestrationId: string }): Effect<OrchestrationStatus, OrchestrationNotFoundError | OrchestrationError>`: Retrieves the current status of an ongoing orchestration task (e.g., "Running", "Waiting for Thread X", "Completed", "Failed").
    *   `provideInputToOrchestration(params: { orchestrationId: string, input: UserInput }): Effect<void, OrchestrationNotFoundError | OrchestrationError>`: Allows providing subsequent inputs to an ongoing orchestration.
    *   *(Internal)* Methods/logic to interact with `ChatThreadService`: create/branch threads with specific configs, process messages, subscribe to outputs, kill threads.
    *   *(Internal)* Methods/logic to interact with `ModelProviderService`/`PromptService` for routing decisions.
    *   *(Internal)* Methods/logic to interact with `LongTermMemoryService` to save/load orchestration state.
*   **5.4. Internal Agent Runner (Optional but Likely):** The `SupervisorAgentServiceLive` implementation likely contains or depends on a specifically configured `IAgentService` instance (`baseAgentRunner`) used to execute its *own* decision-making graph/logic. The `run` method of the Supervisor might not be directly exposed publicly, or it might trigger the start of the internal orchestration loop.
*   **5.5. Error Handling:** Defines orchestration-specific errors (`OrchestrationError`, `RoutingError`, `OrchestrationNotFoundError`). Handles and potentially maps errors from `ChatThreadService`, `ModelProviderService`, `LongTermMemoryService`, etc.

**6. Non-Functional Requirements** (Reliability of orchestration state, Scalability depends on number of concurrent orchestrations and worker threads, Testability requires mocking many services).

**7. API Design (Conceptual - Effect-TS)**

```typescript
interface ISupervisorAgentService {
    // Orchestration-specific methods
    readonly startOrchestration: (params: { /* ... */ }) => Effect.Effect<{ orchestrationId: string }, OrchestrationError>;
    readonly getOrchestrationStatus: (params: { /* ... */ }) => Effect.Effect<OrchestrationStatus, OrchestrationNotFoundError | OrchestrationError>;
    readonly provideInputToOrchestration: (params: { /* ... */ }) => Effect.Effect<void, OrchestrationNotFoundError | OrchestrationError>;

    // Might it still expose run for its internal graph? Or is that hidden?
    // readonly run?: (input: Input) => Effect.Effect<AgentState<...>, AgentExecutionError>;
}
class SupervisorAgentService extends Context.Tag("SupervisorAgentService")<SupervisorAgentService, ISupervisorAgentService>() {}


Okay, Paul. Let's compare and contrast the two PRDs to solidify the distinction and confirm the need for separate service definitions.

**Comparison: `AgentService` vs. `SupervisorAgentService`**
| Feature                 | AgentService (Generic)                                  | SupervisorAgentService                                       | **Contrast**                                                                 |
| :---------------------- | :------------------------------------------------------ | :----------------------------------------------------------- | :--------------------------------------------------------------------------- |
| **Core Purpose**        | **Execute** a single, predefined agent config/graph.    | **Orchestrate** multi-step tasks & **route** work.           | Executor vs. Orchestrator/Router.                                            |
| **Scope of Operation**  | Single, self-contained agent run.                       | Manages workflows spanning multiple steps & worker threads.  | Single run vs. Multi-step, cross-thread workflow.                            |
| **Primary API Focus**   | `run(input)` -> `AgentState`                            | `startOrchestration`, `getOrchestrationStatus`, etc.         | Focused on execution vs. Focused on task management & flow control.          |
| **State Management**    | Manages **ephemeral state** within a single run (`AgentState`). | Manages **persistent state** for ongoing orchestrations (likely via `LongTermMemoryService`). | Run-time state vs. Long-term orchestration state.                            |
| **Key Interactions**    | Consumes `ModelService`, `PromptService`, `SkillService` based on its *own* config. | *Directs* `ChatThreadService` (workers), uses Model/Prompt for *routing*, potentially LTM/Skills. | Consumes basic services vs. Directs thread management & uses services for coordination. |
| **Level of Abstraction**| Abstracts the *how* of executing a defined workflow.    | Abstracts the *complexity* of coordinating multiple agents/threads/steps. | Lower-level execution abstraction vs. Higher-level workflow abstraction.       |
| **Primary Caller**      | Framework user/dev needing to run *one specific agent*. | Application backend needing to manage *complex, multi-part tasks*. | Direct agent execution vs. Complex task initiation.                          |
| **Configuration**       | Behavior defined *entirely* by the `AgentConfig` provided via its Layer. | Has its *own orchestration logic*; may *use* an `AgentConfig` internally for decision-making, but isn't solely defined by it. | Config-driven executor vs. Logic-driven orchestrator (potentially using config). |
| **Relationship**        | Generic building block.                                 | Specialized application *using* `AgentService` principles (likely internally) and other services. | Foundation vs. Application Layer.                                            |
                                          |

**Summary of Differences:**

The generic `AgentService` is a fundamental building block – a runtime capable of executing *any* predefined agent workflow described by an `AgentConfig`. Its focus is narrow: take input, run the configured steps (using models, prompts, skills as needed), manage the state *for that single run*, and return the final state.

The `SupervisorAgentService`, on the other hand, is a higher-level, specialized service focused on *coordination*. It takes complex tasks, breaks them down (likely using an LLM configured via its *own* internal `AgentConfig`), delegates sub-tasks to appropriate "workers" (which are often specialized chat threads managed by `ChatThreadService`, potentially running their own `AgentService` instances), monitors their progress, and combines results. Its API isn't about running *one* graph, but about managing the entire *orchestration*. It needs to maintain state *across* multiple agent runs and thread interactions.

**Conclusion:**

The comparison clearly shows that the `SupervisorAgentService` has fundamentally different responsibilities, a distinct API surface, different state management requirements, and interacts with the framework services in a different pattern (directing vs. consuming) compared to the generic `AgentService`.

Therefore, **yes, defining a separate `ISupervisorAgentService` interface and `SupervisorAgentService` Tag is strongly justified.** The Supervisor is not merely a configuration of the `AgentService`; it's a distinct service layer built *using* the `AgentService` (likely internally) and other core services to fulfill its unique orchestration role.