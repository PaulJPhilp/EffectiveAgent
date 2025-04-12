# Architecture: Tool Service (`core/tool`)

**Version:** 1.0
**Date:** 2024-07-31
**Status:** Draft

## 1. Overview

The Tool Service (`core/tool`) provides the core functionality for managing, registering, discovering, and executing Tools within EffectiveAgent. It enables agents to interact with external systems or execute custom logic reliably and safely. The architecture relies on Effect-TS primitives, Effect Schema for validation, and a layered registry system for extensibility.

## 2. Core Data Structures (`types.ts`, `schema.ts`)

*   **`ToolDefinitionSchema` / `ToolDefinition`:** Defines tool metadata (`name: SimpleToolName`, `description: string`). The `description` must be detailed enough for LLM selection, including parameter descriptions.
*   **`ToolImplementation`:** Tagged union (`_tag`) defining execution strategy:
    *   `EffectImplementation`: Contains `inputSchema: Schema`, `outputSchema: Schema`, `execute: (input: Input) => Effect<Output, ToolExecutionError>`. The `execute` function receives validated input and its Effect must yield a value matching `outputSchema` or fail with `ToolExecutionError`. It may require services like `HttpClient`, `OAuthServiceTag` etc., which must be provided by the `ToolExecutorService` during dispatch.
    *   `HttpImplementation`: Contains `inputSchema: Schema`, `outputSchema: Schema`, `url: string`, `method: string`, etc. Defines how to map input to request and response to output.
    *   *(Extensible)*
*   **`EffectiveTool`:** Interface `{ definition: ToolDefinition, implementation: ToolImplementation }`. Canonical representation.
*   **`EffectiveToolbox`:** `HashMap<SimpleToolName, EffectiveTool>`. Tools within a namespace.
*   **`EffectiveWorkspace`:** `Map<NamespaceName, EffectiveToolbox>`. Project-specific collection of toolboxes.
*   **`ToolRegistryData`:** `Data.TaggedClass` containing the final merged `tools: HashMap<FullToolName, EffectiveTool>`. Keyed by fully qualified name (`tool`, `ns/tool`, `org/ns/tool`). Provided via `ToolRegistryDataTag`.

## 3. Service Interfaces & Tags (`types.ts`)

*   **`InternalToolboxTag: Tag<EffectiveToolbox>`:** Provides the standard library tools map.
*   **`ProjectWorkspaceTag: Tag<EffectiveWorkspace>`:** Provides the user's project workspace map.
*   **`ToolRegistryDataTag: Tag<ToolRegistryData>`:** Provides the final merged registry map.
*   **`ToolExecutorServiceTag: Tag<ToolExecutorService>`:** Provides the execution service.
*   **`ToolExecutorService` Interface:** Defines the primary method:
    *   `run<Output = unknown>(toolName: FullToolName, rawInput: unknown): Effect<Output, ToolNotFoundError | ToolInputValidationError | ToolOutputValidationError | ToolExecutionError>`

## 4. Errors (`errors.ts`)

Defines specific `Data.TaggedError` classes for tool operations:
*   `ToolNotFoundError`: Tool lookup failed.
*   `ToolInputValidationError`: Input failed validation against `inputSchema`. Wraps `ParseError`.
*   `ToolOutputValidationError`: Output failed validation against `outputSchema`. Wraps `ParseError`.
*   `ToolExecutionError`: Error occurred during the tool's `implementation` execution (e.g., Effect failure, HTTP error, permission denied). Wraps the underlying cause (`unknown`).

## 5. Registration & Merging (`registry.ts`, `layers.ts`)

*   **`InternalToolboxLayer`:** (Framework) `Layer.succeed(InternalToolboxTag, buildInternalToolbox())`. `buildInternalToolbox` programmatically creates `EffectiveTool` instances for stdlib tools (linking metadata, schemas, implementation Effects) and returns the `EffectiveToolbox` HashMap.
*   **`ProjectWorkspaceLayer`:** (Framework Utility) `Layer.effect(ProjectWorkspaceTag, Effect.contextWith(...))` expecting the user's `EffectiveWorkspace` data to be provided via `Layer.succeed(ProjectWorkspaceTag, MyProjectWorkspaceData)` during final composition.
*   **`FinalToolRegistryLayer`:** (Framework)
    *   **Dependencies:** `InternalToolboxTag`, `ProjectWorkspaceTag`, (optional `OrgWorkspaceTag`).
    *   **Logic:** Uses `Effect.gen` to access the source maps/workspaces. Iterates through them, constructs `FullToolName` based on source (stdlib = simple name, project = `ns/simpleName`, org = `org/ns/simpleName`). Merges into a final `HashMap<FullToolName, EffectiveTool>`, applying precedence (Project > Org > Internal). Logs warnings for overrides.
    *   **Provides:** `ToolRegistryDataTag` with the merged map.
*   **User Builder (`builder.ts`):** Provides `createEffectiveWorkspace().toolbox().addTool().build()` which returns the `EffectiveWorkspace` data structure (`Map<NamespaceName, EffectiveToolbox>`). Hides HashMap/Layer details from the user for this step.

## 6. Execution Service (`live.ts`, `layers.ts`)

*   **`ToolExecutorServiceLiveImplementation: Effect<ToolExecutorService, ToolRegistryData | HttpClient | ...>`:** An `Effect` that builds the service object. It requires the `ToolRegistryDataTag` and any *common* dependencies needed by implementation handlers (like `HttpClient`).
*   **`ToolExecutorServiceLiveLayer`:** Provides the `ToolExecutorServiceTag`. Internally, it provides the necessary dependencies (like `ToolRegistryData`) to the `ToolExecutorServiceLiveImplementation` effect using `Effect.provideService`.
*   **`run` Method Implementation:**
    1.  **Lookup:** `HashMap.get(registryData.tools, fullToolName)`. Handle `Option.None` -> `ToolNotFoundError`.
    2.  **Permission Check:** `FiberRef.get(CurrentIntelligenceRef)` -> get `allowedTools` -> check `fullToolName` (resolve toolkits if necessary). Fail `ToolExecutionError` (Permission Denied).
    3.  **Input Validation:** `Schema.decodeUnknown(tool.implementation.inputSchema)(rawInput)`. Map `ParseError` -> `ToolInputValidationError`.
    4.  **Dispatch:** `switch (tool.implementation._tag)`:
        *   `EffectImplementation`: Get `execute` function. Run it using `Effect.provideService` to inject *specific* dependencies needed only by Effect implementations (e.g., `OAuthServiceTag`, if not needed by HTTP impls). Map errors -> `ToolExecutionError`.
        *   `HttpImplementation`: Get `url`, `method`, etc. Use injected `HttpClient`. Build request from validated input. Execute request. Handle HTTP/network errors -> `ToolExecutionError`. Parse response body.
        *   *(Other implementations)*
    5.  **Output Validation:** `Schema.decodeUnknown(tool.implementation.outputSchema)(rawOutput)`. Map `ParseError` -> `ToolOutputValidationError`.
    6.  **Return:** Validated output.

## 7. Key Internal Patterns

*   **Composition over Inheritance:** Using helper functions and interfaces (`CapabilityService` pattern for `make`/`update` in other capabilities, though less relevant for Tool execution itself).
*   **Tagged Unions:** For `ToolImplementation` to allow different execution strategies.
*   **Effect Schema:** For all input/output validation.
*   **Layer Composition:** For managing dependencies and merging registries.
*   **FiberRef:** For passing execution-specific context (permissions) implicitly.
*   **Explicit Error Types:** Using `Data.TaggedError` for clear failure modes.

