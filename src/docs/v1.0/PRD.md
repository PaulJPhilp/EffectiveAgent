# EffectiveAgent - Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2024-07-27
**Author:** T3 Chat (Assisted by Paul)

## 1. Introduction

This document outlines the functional and non-functional requirements for the EffectiveAgent framework. EffectiveAgent provides **AI developers and engineers** with the necessary tools, abstractions, and structure to efficiently build, test, and deploy sophisticated, interactive AI agents based on Effect-TS. It aims to significantly reduce the complexity, development time, and cost associated with integrating AI models, external tools, memory systems, custom logic, and interactive UI components, enabling developers to focus on creating unique agent capabilities and user experiences. This PRD translates the market needs identified in the MRD into specific requirements for the framework itself.

## 2. Goals

*   **Developer Productivity:** Drastically reduce the time and effort required to build complex, stateful AI agents compared to integrating components manually from scratch.
*   **Modularity & Composability:** Provide distinct, well-defined services (Core, AI, Capabilities, Execution, Memory) that can be composed and extended using Effect-TS Layers.
*   **Robustness & Reliability:** Leverage Effect-TS for superior error handling (typed errors), concurrency management (Fibers), and resource safety.
*   **Extensibility:** Allow developers to easily integrate custom tools, AI models/providers, memory systems, and potentially custom "mini-app" logic/configurations.
*   **Testability:** Facilitate unit and integration testing through clear interfaces, dependency injection (Layers), and testable implementations (e.g., in-memory repository, test platform services).
*   **Interactivity Support:** Provide backend mechanisms (structured message formats, artifact management, contextual thread configuration) to support rich, interactive frontend experiences.
*   **Technology Alignment:** Utilize the defined modern tech stack (Bun, Effect-TS, Temporal, Drizzle, LangGraph, Vercel AI SDK) effectively.

## 3. Target Audience (Framework Users)

*   **AI Developers & Engineers:** Software developers building custom AI applications, assistants, workflow automation tools, or specialized agents. Assumed to have familiarity with TypeScript and ideally some exposure to functional programming concepts or Effect-TS.

## 4. Functional Requirements

This section details the required capabilities of the framework's core service categories.

**4.1. Core Services (`core/*`)**

*   **FR-CORE-01 (Logging):** Provide a `LoggingApi` service facade over Effect's logger for consistent application logging with support for levels and structured data. Provide a `LoggingLevelLayer` for configuration.
*   **FR-CORE-02 (ConfigLoader):** Provide a `ConfigLoaderApi` service capable of reading a specified file (JSON initially), parsing it, and validating it against a provided Zod schema. Must handle file read, parse, and validation errors distinctly. Requires `FileSystem`, `Path`, and `ConfigLoaderOptions` (basePath).
*   **FR-CORE-03 (ConfigLoaderOptions):** Provide a `ConfigLoaderOptionsLiveLayer` that supplies the `basePath` configuration, reading from `CONFIG_BASE_PATH` env var with a default.
*   **FR-CORE-04 (Repository):** Define a generic `RepositoryApi<TEntity extends BaseEntity>` interface for CRUD and query operations. Define `BaseEntity` structure (using `number` timestamps initially). Define standard repository errors (`RepositoryError`, `EntityNotFoundError`).
*   **FR-CORE-05 (InMemoryRepository):** Provide a `InMemoryRepositoryLiveLayer` factory function that returns a Layer implementing `RepositoryApi<TEntity>` using an in-memory store (`Ref<Map>`) for any given entity type and Tag. Must correctly handle timestamps via `Clock`.
*   **FR-CORE-06 (Storage):** Provide a `FileStorageApi` service (in `core/storage/file`) for persisting and retrieving raw file data (streams/buffers) identified by a unique `fileId`. Initial implementation can use the local filesystem (via `BunFileSystem`). Must handle storage/retrieval errors.
*   **FR-CORE-07 (Attachment):** Provide an `AttachmentApi` service for managing links (creating, listing, deleting) between domain entities (e.g., `threadId`) and stored files (`fileId`). Must handle linking errors. Likely uses `RepositoryApi` internally.
*   **FR-CORE-08 (Tagging):** Provide a `TagApi` service for associating arbitrary string tags with framework entities (e.g., threads, agents). Must support adding, removing, and querying entities by tags. Likely uses `RepositoryApi` internally.

**4.2. AI Services (`ai/*`)**

*   **FR-AI-01 (ProviderConfig):** Provide a `ProviderConfiguration` service that loads and provides access to configurations for multiple LLM providers (from `provider.json` via `ConfigLoader`), including base URLs, API key env var names, and default provider selection. Must implement `resolveModelId` logic.
*   **FR-AI-02 (ProviderApi):** Provide a `ProviderApi` service facade for interacting with LLM providers (initially via Vercel AI SDK wrappers).
    *   Must implement `generateChatCompletion` (non-streaming) and `streamChatCompletion` (streaming).
    *   Must accept `ChatCompletionParams` including messages, modelId, and standard options (temp, maxTokens, tools).
    *   Must retrieve API keys securely via Effect `Config`.
    *   Must map provider/SDK errors to standardized `ProviderError` types.
    *   Must define and yield/return standardized `ChatCompletionChunk` / `ChatMessage` types, handling tool calls appropriately.
*   **FR-AI-03 (Prompt):** Provide a `PromptApi` service for managing and rendering prompt templates (using LiquidJS). Must support loading templates (potentially via `ConfigLoader`) and rendering them with context variables.
*   **FR-AI-04 (Model):** Provide a `ModelApi` service for retrieving metadata about configured models (context window, capabilities, provider). Likely loads data via its own configuration service (`ModelConfiguration`) using `ConfigLoader`.

**4.3. Capabilities Services (`capabilities/*`)**

*   **FR-CAP-01 (ToolTypes):** Define core `ToolDefinition` (name, description, input schema (Zod), output schema?, execute Effect) and `ToolCall` types. Define standard tool errors.
*   **FR-CAP-02 (ToolService):** Provide a `ToolApi` service for registering and executing tools defined by `ToolDefinition`. Must handle input validation against the schema before execution. Must return structured results or errors.
*   **FR-CAP-03 (Standard Tools):** Implement a set of basic standard tools (e.g., calculator, date/time info via Temporal, potentially web search) following the `ToolDefinition` structure.
*   **FR-CAP-04 (MCP):** Define interfaces/Tags (`MCPApi`?) and potentially provide a service for discovering and executing registered MCPs (complex, multi-step tools/orchestrators).
*   **FR-CAP-05 (Skill):** Define interfaces/Tags (`SkillApi`?) and potentially provide a service for managing Skills (abstractions combining prompts, models, tools). *(Lower priority initially)*.

**4.4. Execution Services (`execution/*`)**

*   **FR-EXEC-01 (ThreadConfig):** Define `ThreadConfigurationEntityDataSchema` including fields for `systemPrompt`, `modelId`, `executionParams`, parent/origin IDs, status (`active`, `locked`, `dead`), and a placeholder for `interactionTarget` (for mini-apps).
*   **FR-EXEC-02 (ThreadApi):** Provide a `ThreadApi` service for managing the lifecycle and execution of conversation threads.
    *   Must implement `createThread`, `branchThread`, `processMessage`, `killThread`, `getStatus`.
    *   `createThread` initializes config and starts the processing loop Fiber.
    *   `processMessage` queues a message for the thread's Fiber.
    *   The internal processing loop must: retrieve config/history, call `ProviderApi`, handle tool calls (via `ToolApi`), save messages (via `ChatMemoryApi`), handle errors.
    *   Must manage thread Fibers.
    *   Must support branching *for artifacts* (loading specific mini-app configs) later.
    *   Must provide thread configuration/context via `getThreadConfiguration`.
*   **FR-EXEC-03 (Agent):** Provide an `AgentApi` service and/or configuration service (`AgentConfiguration`) for defining different agent types, their default configurations (initial prompts, allowed tools/MCPs), and potentially managing their overall lifecycle or entry points. Needs to store/retrieve mini-app configurations later.
*   **FR-EXEC-04 (Supervisor):** *(Optional)* Define a `SupervisorApi` if complex, cross-thread supervision or recovery logic is needed beyond basic Fiber management within `ThreadApi`.

**4.5. Memory Services (`memory/*`)**

*   **FR-MEM-01 (ChatMessage):** Define the extensible `ChatMessage` structure (initially text-focused, extensible for components/tool calls) in global `types.ts`.
*   **FR-MEM-02 (ChatMemory):** Provide a `ChatMemoryApi` service for storing and retrieving sequences of `ChatMessage` objects associated with a `threadId`. Must handle retrieving history correctly, potentially across branches later. Initial implementation can use `InMemoryRepository`.
*   **FR-MEM-03 (Artifact):** Provide an `ArtifactApi` service for managing temporary, runtime-generated artifacts associated with a thread (`createArtifact`, `getArtifact`, `updateArtifact`, `listArtifactsForThread`). Storage can be in-memory or temporary initially.
*   **FR-MEM-04 (LongTerm):** Define an interface (`LongTermMemoryApi`?) for interacting with long-term/vector memory stores. *(Implementation deferred)*.

**5. Non-Functional Requirements**

*   **NFR-01 (Performance):** Services should be implemented efficiently, leveraging Effect's concurrency. Performance bottlenecks related to external APIs (LLMs, DBs) are expected.
*   **NFR-02 (Scalability):** The architecture should support scaling individual services. Use of stateless services where possible. Thread management should handle numerous concurrent fibers.
*   **NFR-03 (Reliability):** Leverage Effect's typed errors and supervision for robust error handling and recovery where appropriate.
*   **NFR-04 (Maintainability):** Adhere to the defined project structure, naming conventions, and Effect-TS patterns. Include JSDoc comments.
*   **NFR-05 (Testability):** Services must be testable via unit and integration tests, facilitated by Effect Layers and dependency injection.

**6. Technology Stack**

Reference `TECHNOLOGY_STACK.md` for the defined stack (Bun, Effect-TS, Temporal, Drizzle, Postgres/SQLite, LangGraph, Vercel AI SDK, Vitest, etc.).

