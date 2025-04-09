# Architecture: EffectiveAgent Framework

**Version:** 1.1
**Date:** 2024-07-29 *(Updated)*
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
    *   In-memory implementation provided (`implementations/in-memory`). (Clock dependency deferred).
*   **`core/file` (`FileApi`):**
    *   API for storing/retrieving file blobs/metadata (DB-backed).
    *   Handles Base64 conversion.
    *   Depends on `RepositoryApi<FileEntity>`.
*   **`core/attachment` (`AttachmentApi`):**
    *   API for managing links between entities.
    *   Depends on `RepositoryApi<AttachmentLinkEntity>`.
*   **`core/tag` (`TagApi`):**
    *   API for managing tags and links between tags and entities.
    *   Depends on `RepositoryApi<TagEntity>` and `RepositoryApi<EntityTagLinkEntity>`. (Implementation/Testing parked).
*   **`ai/prompt` (`PromptConfigData`, `PromptApi`):**
    *   `PromptConfigLiveLayer`: Loads `prompts.json` via `EntityLoaderApi`, provides `HashMap` via `PromptConfig` Tag.
    *   `PromptApiLiveLayer`: Uses `PromptConfigData` and `LiquidJS` to render templates.

## 6. Key Technology Choices & Patterns

*   **Runtime:** Bun
*   **Language:** TypeScript (v5.x, strict, no `enum`/`namespace`)
*   **Core Framework:** Effect-TS (v3.14+)
*   **Schema/Validation:** `@effect/schema` (for config files, entities)
*   **Templating:** LiquidJS (`ai/prompt`)
*   **Persistence (Prod):** PostgreSQL (Neon) - *(Deferred)*
*   **Persistence (Dev/Test):** SQLite / In-Memory (`core/repository`)
*   **ORM:** Drizzle ORM - *(Deferred)*
*   **AI Interaction:** `@effect/ai` (using provider packages like `@effect/ai-openai`) - *(Integration pending in `SkillApi`)*
*   **Agent Framework:** LangGraph - *(Integration planned but deferred)*
*   **Testing:** Vitest (standard runner), `Effect.runPromise`/`Effect.runPromiseExit`, `Layer.build` or helpers w/ type assertions. Prioritize testing live implementations with appropriate test doubles (e.g., in-memory repo, `TestClock` via `TestContext` - *Clock integration deferred*).
*   **Platform Services:** `@effect/platform-bun` (`BunContext.layer`) preferred for providing `FileSystem`, `Clock`, etc.
*   **Service Definition:** `make` (sync or effectful) + `ReturnType`/`Effect.Success` for type inference + `Layer.effect`/`Layer.succeed`.
*   **Dependency Injection:** `Layer.provide` for direct dependencies, `Layer.merge` for parallel services, `Layer.build` for robust test setup. Service implementations hide internal dependencies (`R=never` on API methods).
*   **Error Handling:** `Data.TaggedError` for all custom errors.

## 7. Current Status & Next Steps

*   **Phase 1 (Core Services):** Complete (Logging, Loader, Repository (generic + in-mem), File, Attachment implemented and tested. Tag implemented, testing parked. Clock integration deferred).
*   **Phase 2 (AI/Capability Primitives Config):**
    *   `ai/prompt`: Config loading and API implemented and tested.
    *   `capabilities/intelligence`: Config service defined (pending testing).
    *   `capabilities/persona`: Config service defined (pending testing).
    *   `capabilities/skill`: Config service defined (pending testing).
*   **Next:**
    1.  Test remaining config services (`IntelligenceConfig`, `PersonaConfig`, `SkillConfig`).
    2.  Implement `SkillApi` (Phase 3), integrating `PromptApi`, config services, and `@effect/ai`.
    3.  Revisit `Clock` integration in `Repository`.
    4.  Revisit `TagApi` testing.

## 8. Open Issues / Design Considerations

*   Revisit `Clock` integration for accurate timestamps in `Repository`.
*   Consider abstracting `core/file` under a generic `core/storage` API if other backends (S3) are needed.
*   Refine error handling and mapping between service layers.
*   Finalize testing strategy for services requiring platform context (confirm `Layer.build` or helper pattern stability).
*   *(Vision)* Potential for visual workflow editor based on framework primitives.
