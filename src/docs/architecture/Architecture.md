# Architecture: EffectiveAgent Framework

**Version:** 1.2
**Date:** 2024-07-30 *(Updated)*
**Status:** Draft

## 1. Overview

EffectiveAgent is a backend framework built with Effect-TS designed to accelerate the development of sophisticated, adaptive, and interactive AI agents ("digital collaborators" or "autonomous agents"). It provides a structured approach, core services, and composable abstractions to manage complexity, reduce boilerplate, and enable developers to focus on agent capabilities and behavior.

The architecture centers around **Character Actors** representing roles, which orchestrate task execution by launching **Workflow Executors** (Agent Instances). These executors run defined **Behaviors** using LangGraph for graph-based workflow execution. They leverage foundational **Capabilities** (`Persona`, `Skill`, `Intelligence`) defined via schemas and managed by type-safe **Capability Services**. Communication relies on asynchronous message passing, enabling reactive and adaptive systems. The framework emphasizes type safety, composability, testability, explicit dependency management (Layers), and robust error handling native to Effect-TS.

## 2. Core Architectural Principles

*   **Effect-TS Native:** Leverage Effect-TS for concurrency (Fibers, structured concurrency), error handling (Tagged Errors, Cause), resource management (Scope), state management (Ref), asynchronous operations, and dependency injection (Layers/Context).
*   **Actor Model for Orchestration:** Utilize the Actor model pattern (implemented with Effect primitives like Fiber, Queue, Ref) for `Character Actors` to manage role-specific state, handle user interactions, orchestrate workflows, and adapt over time.
*   **Graph-Based Workflows:** Use LangGraph integrated with Effect to define and run complex, stateful `Behaviors` within Workflow Executors (Agent Instances). Leverage built-in support for persistence, human-in-the-loop interactions, and multi-agent systems.
*   **Composable Capabilities:** Define core agent abilities (`Persona`, `Skill`, `Intelligence`) via declarative schemas. Manage their validation (`make`) and modification (`update`) through dedicated, type-safe `Capability Services`.
*   **Message-Driven Communication:** Facilitate communication between Workflow Executors and Character Actors via asynchronous messages using Effect Queues or dedicated messaging services.
*   **Service-Oriented Core:** Expose foundational functionalities through well-defined service interfaces (`XxxApi`, `XxxService`, `XxxData` Tags).
*   **Explicit Dependencies & Configuration:** Use Layers for dependency injection. Utilize `effect/Config` for loading static configuration files (personas, skills, etc.), validated via Capability Services.
*   **Typed Errors:** Employ `Data.TaggedError` for specific, typed errors across different domains (capability validation, agent execution, service interactions).
*   **Testability:** Prioritize testing live service implementations using `Layer.build` or test helpers. Test actor logic and graph execution independently.

## 3. High-Level Structure

The framework is organized into three main components:

1. **Core Services Layer**
   - Foundational services (Logging, Repository, File, etc.)
   - Configuration management
   - Data persistence and retrieval

2. **AI Services Layer**
   - LLM integration via @effect/ai
   - Prompt management and templating
   - Model selection and configuration

3. **Agent Services Layer**
   - Graph-based workflow execution (LangGraph)
   - Agent orchestration and state management
   - Multi-agent coordination
   - Human-in-the-loop capabilities

## 4. Core Primitives

*   **`Capability` (`Persona`, `Skill`, `Intelligence`):**
    *   Represent foundational agent abilities (communication style, specific actions, reasoning configuration)
    *   Defined via Effect Schemas (`schema.ts`)
    *   Validated and updated via corresponding `Capability Services`
*   **`Character`:**
    *   Represents a high-level agent role or archetype
    *   Defined via Effect Schema, composing capabilities by reference
    *   Managed by stateful **Character Actors**
*   **`Behavior`:**
    *   Defines workflow or process for specific tasks
    *   Implemented using LangGraph state graphs
    *   Supports persistence, streaming, and human interaction

## 5. Core Services & Layers

*   **Capability Services:**
    *   Provide `make` and `update` operations
    *   Implement generic `CapabilityService` interface
    *   Provided via `Layer`s, accessed via `Tags`
*   **Static Data Layers:**
    *   Load definitions from configuration files
    *   Validate using `CapabilityService.make`
    *   Provide data via `Context.Tag`s
*   **Dynamic API Services:**
    *   CRUD operations for dynamic capabilities
    *   Depend on `RepositoryApi` and `CapabilityService`
*   **Runtime Services:**
    *   **`AgentApi`:** Launches and manages Workflow Executors
    *   **Messaging Service:** Facilitates agent communication
*   **Core Foundation:**
    *   `RepositoryApi<T>`: Generic persistence
    *   `LoggingApi`: Logging facade
    *   Platform services via `BunContext`

## 6. Key Technology Choices

*   **Runtime:** Bun
*   **Language:** TypeScript (v5.x, strict)
*   **Core Framework:** Effect-TS (v3.14+)
*   **Schema/Validation:** `@effect/schema`
*   **Static Configuration:** `effect/Config`
*   **Actor Implementation:** Effect primitives
*   **Workflow Execution:** LangGraph with Effect integration
*   **AI Interaction:** `@effect/ai`
*   **Persistence:** PostgreSQL (Neon) / In-Memory
*   **Service Pattern:** Effect.Service with Layers

## 7. Current Status

*   **Phase 1 (Core Services):** Complete
    - Foundational services implemented and tested
    - Service pattern examples documented
*   **Phase 2 (Capability Definitions):** Complete
    - Schemas and services implemented
    - Static data loading configured
*   **Phase 3 (Agent Integration):** In Progress
    - Implementing SkillApi with @effect/ai
    - Adding LangGraph workflow execution
    - Building agent orchestration layer

## 8. Next Steps

1. Complete LangGraph integration
2. Implement agent orchestration patterns
3. Add human-in-the-loop capabilities
4. Enhance testing and documentation
5. Build example agent workflows
