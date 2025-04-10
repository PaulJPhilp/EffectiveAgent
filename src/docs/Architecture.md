# Architecture: EffectiveAgent Framework

**Version:** 1.2 *(Updated 2024-07-30)*
**Status:** Draft

## 1. Overview

EffectiveAgent is a backend framework built with Effect-TS designed to accelerate the development of sophisticated, adaptive, and interactive AI agents ("digital collaborators" or "autonomous agents"). It provides a structured approach, core services, and composable abstractions to manage complexity, reduce boilerplate, and enable developers to focus on agent capabilities and behavior.

The architecture centers around **Character Actors** representing roles, which orchestrate task execution by launching **Workflow Executors** (Agent Instances). These executors run defined **Behaviors** (likely graphs, e.g., using LangGraph) and leverage foundational **Capabilities** (`Persona`, `Skill`, `Intelligence`). Capabilities are defined via schemas and managed by type-safe **Capability Services**. Communication often relies on asynchronous message passing, enabling reactive and potentially adaptive systems. The framework emphasizes type safety, composability, testability, explicit dependency management (Layers), and robust error handling native to Effect-TS.

## 2. Core Architectural Principles

*   **Effect-TS Native:** Leverage Effect-TS for concurrency (Fibers, structured concurrency), error handling (Tagged Errors, Cause), resource management (Scope), state management (Ref), asynchronous operations, and dependency injection (Layers/Context).
*   **Actor Model for Orchestration:** Utilize the Actor model pattern (implemented with Effect primitives like Fiber, Queue, Ref) for `Character Actors` to manage role-specific state, handle user interactions, orchestrate workflows, and potentially adapt over time.
*   **Graph-Based Workflows:** Employ graph execution frameworks (like LangGraph integrated with Effect) to define and run complex, stateful `Behaviors` within transient Workflow Executors (Agent Instances).
*   **Composable Capabilities:** Define core agent abilities (`Persona`, `Skill`, `Intelligence`) via declarative schemas. Manage their validation (`make`) and modification (`update`) through dedicated, type-safe `Capability Services`.
*   **Message-Driven Communication:** Facilitate communication (e.g., status updates, results, feedback) between Workflow Executors and their orchestrating Character Actors via asynchronous messages (potentially using Effect Queues or a dedicated messaging service).
*   **Service-Oriented Core:** Expose foundational functionalities (persistence, static data loading, dynamic capability management, agent launching) through well-defined service interfaces (`XxxApi`, `XxxService`, `XxxData` Tags).
*   **Explicit Dependencies & Configuration:** Use Layers for dependency injection. Utilize `effect/Config` for loading static configuration files (personas, skills, etc.), validated via Capability Services.
*   **Typed Errors:** Employ `Data.TaggedError` for specific, typed errors across different domains (capability validation, agent execution, service interactions).
*   **Testability:** Prioritize testing live service implementations where feasible, using techniques like `Layer.build` or test helpers for context provision. Test actor logic and graph execution independently.

## 3. High-Level Structure (Conceptual)



## 3. High-Level Structure


## 4. Core Primitives

*   **`Capability` (`Persona`, `Skill`, `Intelligence`):**
    *   Represent foundational agent abilities (communication style, specific actions, reasoning configuration).
    *   Defined via Effect Schemas (`schema.ts`).
    *   Validated and updated via corresponding `Capability Services` (`PersonaService`, `SkillService`, `IntelligenceService`) using `make`/`update` methods.
*   **`Character`:**
    *   Represents a high-level agent role or archetype (e.g., "JuniorDeveloper").
    *   Defined via an Effect Schema (`CharacterDefinitionSchema`), primarily composing capabilities by referencing their names (`personaName`, `skillNames`, etc.).
    *   Managed dynamically by stateful **Character Actors**.
    *   Validation (`Character.make`) includes checking the existence of referenced capabilities.
*   **`Behavior`:**
    *   Defines the workflow or process for accomplishing a specific high-level task (e.g., "implementNewFeature", "reviewCode").
    *   Likely defined using a graph-based structure (e.g., LangGraph state graph definition).
    *   Executed by Workflow Executors (Agent Instances).

## 5. Core Services & Layers (Refined View)

*   **Capability Services (`PersonaService`, `SkillService`, `IntelligenceService`):**
    *   Provide `make` (validate definition) and `update` (validate modification) operations for their respective capability types.
    *   Implement the generic `CapabilityService` interface pattern.
    *   Provided via `Layer`s (e.g., `PersonaServiceLiveLayer`). Accessed via `Tags` (e.g., `PersonaServiceTag`).
*   **Static Data Layers (`PersonaData`, `SkillData`, `IntelligenceData`, `CharacterData`):**
    *   Load static definitions from configuration files (e.g., `personas.json`) using `effect/Config`.
    *   Use the corresponding `CapabilityService.make` function for validation during loading.
    *   Provide the validated data (typically as a `HashMap`) via `Context.Tag`s (e.g., `PersonaDataTag`).
*   **Dynamic API Services (`PersonaApi`, `SkillApi`, `IntelligenceApi`, `CharacterApi`):**
    *   Provide CRUD-like operations for managing *dynamic* capabilities or characters (if needed).
    *   Depend on `RepositoryApi` for persistence and the corresponding `CapabilityService` for validation before saving.
    *   Accessed via `Tags` (e.g., `PersonaApiTag`).
*   **Runtime Services:**
    *   **`AgentApi`:** Responsible for launching, managing, and potentially resuming Workflow Executors (Agent Instances/Graph Runners) based on requests from Character Actors.
    *   **Messaging Service (Implicit/Explicit):** Facilitates message passing between Workflow Executors and Character Actors (could be direct `Queue` interactions managed by the AgentApi/CharacterActor or a dedicated `MessageBus` service).
*   **Core Foundational Services:**
    *   `RepositoryApi<T>`: Generic persistence interface.
    *   `LoggingApi`: Facade for logging.
    *   Platform Services (`FileSystem`, `Clock`, `HttpClient` via `BunContext`).

## 6. Key Technology Choices & Patterns

*   **Runtime:** Bun
*   **Language:** TypeScript (v5.x, strict)
*   **Core Framework:** Effect-TS (v3.14+)
*   **Schema/Validation:** `Schema` module from `effect`.
*   **Static Configuration:** `effect/Config` module.
*   **Actor Implementation:** Effect primitives (`Fiber`, `Queue`, `Ref`, `Scope`) for `Character Actors`.
*   **Workflow Execution:** LangGraph (integrated with Effect) for defining and running `Behaviors`.
*   **AI Interaction:** `@effect/ai` (potentially supplemented with Vercel AI SDK wrappers).
*   **Persistence:** In-Memory / PostgreSQL (Neon) via Drizzle ORM (deferred).
*   **Service Definition:** `CapabilityService` pattern (`make`/`update`), standard `XxxApi` services, `Layer`s for DI.
*   **Testing:** Vitest, Effect test helpers, testing actors and graphs.

## 7. Current Status & Next Steps (Revised)

*   **Phase 1 (Core Services):** Foundational services (Logging, Repo, File, etc.) mostly complete. `EntityLoaderApi` to be replaced/refactored using `effect/Config`.
*   **Phase 2 (Capability Definitions):** Define schemas, types, errors, and `CapabilityService` implementations for `Persona`, `Intelligence`, `Skill`. Implement static data loading layers using `effect/Config`.
*   **Phase 3 (Character & Behavior):** Define schemas for `Character` and `Behavior`. Implement `CharacterActor` logic (state machine). Implement `AgentApi` service. Integrate LangGraph for basic behavior execution.
*   **Phase 4 (Integration & Refinement):** Build end-to-end examples, refine APIs, implement dynamic capability/character management (`XxxApi` services), enhance error handling and observability.

## 8. Open Issues / Design Considerations

*   Finalize Actor state persistence strategy (`CharacterActor` state).
*   Define specific message schemas for Agent -> Character communication.
*   Refine error handling propagation between Graphs, Agents, and Character Actors.
*   Detailed design for `AgentApi` (launching, resuming, managing executors).
*   Integration details for LangGraph within Effect's runtime.
*   Design for dynamic capability/character management APIs.
