# EffectiveAgent - Market Requirements Document (MRD)

**Version:** 1.2 *(Updated 2024-07-30)*
**Status:** Draft

## 1. Introduction & Overview

The digital landscape demands AI tools that function not merely as assistants but as capable **digital collaborators** and **autonomous agents**. Users and organizations expect AI that understands complex requests, performs sophisticated multi-step tasks reliably, integrates deeply into workflows, adapts based on feedback, and interacts naturally.

While powerful AI models exist, building applications featuring such sophisticated agents presents significant technical hurdles. Integrating AI capabilities, managing state and context across long-running tasks, orchestrating complex workflows (like graph-based execution), handling tool usage, ensuring reliability and adaptability, and creating dynamic user interfaces often requires bespoke, complex engineering efforts for each new agent or role. This high development friction slows innovation and increases costs.

**EffectiveAgent** is a foundational framework designed for **AI developers and engineers**. It aims to drastically reduce the complexity and boilerplate involved in building sophisticated, adaptive, and interactive AI agents by providing robust, pre-built abstractions, services, and patterns based on Effect-TS. It allows developers to focus on defining the unique **Capabilities**, **Behaviors**, and **Character** roles of their agents, rather than repeatedly solving common underlying engineering challenges. Its goal is to be the **"React for Agents"** – bringing structure, composability, and productivity to complex agent development.

## 2. Goals & Objectives

*   **Developer Productivity:** Significantly reduce the development time, complexity, and boilerplate code required to build advanced, adaptive AI agents and collaborators.
*   **Enable Sophistication:** Provide the building blocks (Capabilities, Character orchestration, Behavior execution) necessary for creating agents capable of complex reasoning, multi-step task execution, tool usage, state management, and adaptation.
*   **Promote Reliability & Maintainability:** Leverage Effect-TS to build a robust, type-safe, and composable framework that leads to more reliable, observable, and maintainable agent applications.
*   **Facilitate Adaptation:** Enable agents (via the Character Actor model) to potentially adapt their configuration or behavior over time based on runtime feedback and performance.
*   **Accelerate Agent Development:** Lower the barrier to entry for creating specialized, role-based AI collaborators (Characters) across various domains.

## 3. Target Audience (Users of the EffectiveAgent Framework)

The primary audience for the EffectiveAgent framework itself consists of:

*   **AI Engineers & Developers:** Building custom AI agents, autonomous systems, or AI-powered features within larger applications.
*   **Software Engineers:** Integrating advanced AI capabilities and collaborative agents into their products and workflows.
*   **Startups & Companies:** Developing AI-native applications or adding significant AI collaboration and automation features.

## 4. Market Needs & Problems Solved (Developer Perspective)

Developers building sophisticated AI agents face numerous technical challenges that EffectiveAgent aims to solve:

*   **Complex State Management:** Tracking agent state, conversation history, task progress, performance metrics, and potentially adaptive configuration across multiple turns, asynchronous operations, and long-running processes is difficult and error-prone.
    *   *Need:* Robust, effectful state management abstractions provided by the framework (e.g., Character Actors managing role state, Graph Executors managing task state).
*   **Workflow Orchestration:** Implementing multi-step reasoning, tool usage, conditional logic, and error recovery requires significant orchestration code.
    *   *Need:* Clear separation of concerns with `Behaviors` defining workflows (likely using graph-based tools like LangGraph integrated with Effect) and `Character Actors` orchestrating their execution.
*   **Boilerplate Integration Code:** Connecting to LLMs, managing API keys, handling rate limits, parsing outputs, interacting with vector stores, calling external tools, and managing persistence involves repetitive setup and error handling.
    *   *Need:* Standardized service interfaces (`SkillApi`, `RepositoryApi`, `ProviderService`, etc.) and layers that encapsulate these common integrations.
*   **Defining Agent Roles & Consistency:** Ensuring an agent consistently adheres to a specific role, communication style, and set of capabilities requires careful configuration and management.
    *   *Need:* Declarative `Character` definitions composing validated `Persona`, `Skill`, and `Intelligence` capabilities.
*   **Adaptation & Learning:** Building agents that can improve or adapt based on feedback or performance often requires complex custom logic.
    *   *Need:* An architecture (like Character Actors processing messages) that supports feedback loops and allows for state changes and potential configuration adaptation based on runtime events.
*   **Reliability and Error Handling:** Ensuring agents handle failures gracefully (API errors, tool failures, unexpected outputs, state corruption) requires careful, effectful programming.
    *   *Need:* Leverage Effect-TS's superior error handling, concurrency management, and potentially Actor supervision patterns throughout the framework.
*   **Configuration Management:** Managing prompts, model settings, persona definitions, skill definitions, character roles, and behavior workflows requires a structured, validated approach.
    *   *Need:* Dedicated capability schemas and services (`PersonaService`, `SkillService`, etc.) using standardized loading mechanisms (`effect/Config`) and validation (`make`/`update` functions).

## 5. Product Vision & Key Capabilities (Framework Perspective)

EffectiveAgent provides developers with:

*   **Composable Capabilities:** Define core agent abilities (`Persona`, `Skill`, `Intelligence`) using declarative schemas and validate/update them via type-safe Effect-based services (`make`/`update`).
*   **Character Actors:** Define high-level agent roles (`Character`) that compose capabilities. These act as stateful orchestrators, managing role-specific state, interacting with users, launching behaviors, and potentially adapting over time based on feedback messages.
*   **Behavior Execution:** Define complex, multi-step tasks as `Behaviors` (likely using graph-based tools like LangGraph integrated with Effect). These are executed by transient Agent instances/Workflow Executors.
*   **Effect-TS Core:** Built entirely on Effect-TS, offering strong typing, superior error handling, resource management, structured concurrency, and composability.
*   **Standardized Structure & Services:** A defined project structure, conventions, and core services (logging, persistence, capability services) promote consistency and maintainability.
*   **Message-Driven Architecture:** Communication between executing Agents/Behaviors and their orchestrating Character Actor happens via asynchronous messages, enabling decoupling and reactivity.
*   **API Design for Interactivity:** While the initial focus is backend, the architecture supports user interaction mediated by Character Actors.

## 6. Use Cases (Developer Examples)

*   **Use Case 1: Building a "Junior Developer" Character**
    *   **Problem:** A developer needs an agent that can perform coding tasks but follows specific junior-level protocols (asking for docs, creating PRs).
    *   **EffectiveAgent Solution:**
        1.  Define `Persona`, `Skill` (code-gen, git-tool, doc-gen), and `Intelligence` configurations in JSON/code. Validate using `Persona.make`, `Skill.make`, etc.
        2.  Define a `Character` ("JuniorDeveloper") referencing these validated capabilities. Validate using `Character.make` (which checks references).
        3.  Define `Behavior` graphs (e.g., `implementNewFeature_Junior`) orchestrating skill usage, including steps to request docs and create PRs.
        4.  Implement the `CharacterActor("JuniorDeveloper")` logic (state machine) to handle task requests, launch the correct `Behavior` via the `AgentApi`, process feedback messages, and interact with the user.
    *   **Benefit:** Developer focuses on defining the role's components (capabilities, character config, behavior graph) and the Character Actor's state logic, leveraging the framework for validation, execution, and communication plumbing.

*   **Use Case 2: Creating an Adaptive Code Reviewer Character**
    *   **Problem:** A developer wants an agent that reviews code but learns to ignore certain types of non-critical style issues based on feedback.
    *   **EffectiveAgent Solution:**
        1.  Define `Character("CodeReviewer")` with relevant capabilities.
        2.  Define `Behavior("reviewCode")`.
        3.  The Agent instance executing `reviewCode` sends `Msg.ReviewCommentGenerated { type: "style", severity: "low", ... }` and `Msg.UserFeedback { commentId: "...", action: "ignoreType" }` back to the `CharacterActor("CodeReviewer")`.
        4.  The `CharacterActor`'s state machine tracks feedback. If "ignoreType" feedback for low-severity style issues is frequent, it updates its internal state/configuration (perhaps modifying its `Persona` instructions or `Intelligence` parameters used for review) via `Persona.update` or `Intelligence.update`.
        5.  Future reviews launched by this Character Actor use the adapted configuration.
    *   **Benefit:** The framework's Actor/messaging architecture enables building adaptive agents where runtime feedback influences future behavior via state changes managed by the Character Actor.

## 7. Out of Scope (Framework Version 1.0 Focus)

*   Providing a complete, batteries-included frontend framework or UI component library (though the architecture supports UI interaction via Character Actors).
*   Built-in visual editors for Behaviors or Characters.
*   Specific, pre-built Characters/Behaviors for end-users (it's a framework *for building* them).
*   Managed hosting or deployment solutions.
*   Highly complex Actor supervision strategies (start with basic lifecycle management).
