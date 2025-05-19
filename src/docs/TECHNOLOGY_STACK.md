# Architecture: EffectiveAgent Framework

**Version:** 1.2
**Date:** 2024-07-30 *(Updated)*
**Status:** Draft

## 1. Overview

EffectiveAgent is a backend framework built with Effect-TS designed to accelerate the development of sophisticated, interactive AI agents ("digital collaborators"). It provides a structured approach, core services, and declarative primitives to manage complexity, reduce boilerplate, and enable developers to focus on agent capabilities. The architecture emphasizes type safety, composability, testability, and explicit dependency management through Effect's Layer system.

## 2. Core Architectural Principles

*   **Effect-TS Native:** Leverage Effect-TS for concurrency, error handling, resource management, and dependency injection (Layers/Context).
*   **Modularity:** Services are organized into logical categories (`core`, `ai`, `capabilities`, etc.) and designed for loose coupling.
*   **Declarative Primitives:** Core AI concepts (`Skill`, `Intelligence`, `Personality`) are defined declaratively in configuration files, separating definition from execution.
*   **Service-Oriented:** Functionality is exposed through well-defined service interfaces (`XxxApi` Tags).
*   **Implementation Hiding:** Service interfaces (`types.ts`) define the contract (`R = never` where possible), while implementations (`live.ts`) handle internal dependencies (like `FileSystem`, `RepositoryApi`). Layers encapsulate dependency wiring.
*   **Explicit Dependencies:** Layers clearly state their requirements (`RIn`) and provisions (`ROut`). Composition (`Layer.provide`, `Layer.merge`, `Layer.build`) wires the dependency graph.
*   **Typed Errors:** Use `Data.TaggedError` for specific, typed errors, enabling robust error handling via `Effect.catchTag`, etc.
*   **Testability:** Prioritize testing live service implementations where feasible, using techniques like `Layer.build` or helpers with type assertions for reliable context provision in tests.

## 3. High-Level Structure

The framework is organized around three main components:
- Core Services: Foundational services for data management and system operations
- AI Services: LLM integration and prompt management
- Agent Services: Graph-based workflow execution and agent orchestration

## 4. Core Primitives (Declarative Configuration)

These represent the primary way developers configure agent behavior:

*   **`Skill`:** The main primitive for invoking AI capabilities. Defined in `skills.json`, specifies intent, associated `Prompt`, `Personality`, `Intelligence`, constraints, etc. Loaded by `SkillConfig` service. Executed via `SkillApi`.
*   **`Intelligence`:** Defines cognitive processing requirements (e.g., model preferences, RAG needs, memory access). Defined in `intelligences.json`, loaded by `IntelligenceConfig` service. Used by `SkillApi` to select models/tools.
*   **`Personality`:** Defines communication style, tone, output format constraints. Defined in `personas.json`, loaded by `PersonaConfig` service. Primarily influences system prompts used by `SkillApi`.
*   **`Prompt`:** Named, reusable template definitions (using LiquidJS). Defined in `prompts.json`, loaded by `PromptConfig` service (providing `PromptConfigData` HashMap). Used by `PromptApi` for rendering.

## 5. Core Services (Implemented/Refactored)

*   **`core/loader` (`EntityLoaderApi`):**
    *   Provides `loadEntity` (parses+validates) and `loadRawEntity` (parses only).
    *   Depends on `FileSystem` (internally, via `EntityLoaderApiLiveLayer`).
    *   Used by config services (`PromptConfig`, `SkillConfig`, etc.).
*   **`core/logging` (`LoggingApi`):**
    *   Facade for Effect's logging system.
*   **`core/repository` (`RepositoryApi<TEntity>`):**
    *   Generic CRUD interface.
    *   In-memory implementation provided (`implementations/in-memory`).
*   **`core/file` (`FileApi`):**
    *   API for storing/retrieving file blobs/metadata (DB-backed).
    *   Handles Base64 conversion.
    *   Depends on `RepositoryApi<FileEntity>`.
*   **`core/attachment` (`AttachmentApi`):**
    *   API for managing links between entities.
    *   Depends on `RepositoryApi<AttachmentLinkEntity>`.
*   **`core/tag` (`TagApi`):**
    *   API for managing tags and links between tags and entities.
    *   Depends on `RepositoryApi<TagEntity>` and `RepositoryApi<EntityTagLinkEntity>`.
*   **`ai/prompt` (`PromptConfigData`, `PromptApi`):**
    *   `PromptConfigLiveLayer`: Loads `prompts.json` via `EntityLoaderApi`, provides `HashMap` via `PromptConfig` Tag.
    *   `PromptApiLiveLayer`: Uses `PromptConfigData` and `LiquidJS` to render templates.

## 6. Key Technology Choices & Patterns

### Primary Stack (Runtime)

- **Runtime:** Bun (Node.js compatible)
- **Language:** TypeScript (v5.x, strict)
- **Core Framework:** Effect (v3.14.6) — concurrency, async, error handling, DI
- **Schema/Validation:** @effect/schema — config and entity validation
- **Templating:** LiquidJS — prompt templating
- **Persistence:** PostgreSQL (production), SQLite/In-Memory (dev/test)
- **ORM:** Drizzle ORM — type-safe database access
- **AI/LLM/Providers:** @effect/ai, @effect/ai-openai, @ai-sdk/*, @langchain/langgraph, Vercel AI SDK, ai — LLM, provider, and agent workflow
- **Agent Workflow:** LangGraph, LangGraph SDK — graph-based workflow execution
- **Platform Services:** @effect/platform-bun, @effect/platform-node — filesystem, platform abstractions
- **Other:** rxjs, xstate, pdf-parse — streaming, state machines, PDF parsing

### Development Stack (Additional)

- **Testing:** Vitest (test runner), @effect/vitest, @effect/test — effect-based and standard testing
- **Formatting/Linting:** Biome — code formatting and linting
- **Types:** @types/node, @types/bun, @types/pg, @types/pdf-parse, @types/uuid — type definitions
- **Polyfills:** @js-temporal/polyfill — temporal API support
- **Dev Tools:** chalk — CLI coloring

**Patterns & Conventions:**
- Error handling: Data.TaggedError, custom error classes
- Dependency injection: Effect Layers (Layer.provide, Layer.merge, Layer.build)
- Strict type safety: no `enum`/`namespace`, top-level types/interfaces

## 7. Current Status & Next Steps

*   **Phase 1 (Core Services):** Complete
    - Logging, Loader, Repository (generic + in-mem)
    - File, Attachment implemented and tested
    - Tag implemented and tested
*   **Phase 2 (AI/Capability Primitives Config):**
    *   `ai/prompt`: Config loading and API implemented and tested
    *   `ai/memory`: Support long-term memory
    *   `ai/tools`: Add MCP support
    *   `capabilities/intelligence`: Config service implemented and tested
    *   `capabilities/persona`: Config service implemented and tested
    *   `capabilities/skill`: Config service implemented and tested
*   **Phase 3 (Agent Integration):**
    1. Implement `SkillApi` with `@effect/ai` integration
    2. Add LangGraph workflow execution
    3. Implement agent orchestration layer
    4. Add human-in-the-loop capabilities

## 8. Open Issues / Design Considerations

*   Consider abstracting `core/file` under a generic `core/storage` API if other backends (S3) are needed
*   Refine error handling and mapping between service layers
*   Evaluate long-term memory strategies and technologies.
*   Finalize testing strategy for services requiring platform context
*   Design patterns for agent state persistence and recovery
*   Integration patterns for multi-agent orchestration
