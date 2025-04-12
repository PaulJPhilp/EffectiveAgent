# PRD: EffectiveAgent Tool System

**Version:** 1.0
**Date:** 2024-07-31
**Status:** Draft

## 1. Introduction

Modern AI agents require the ability to interact with external systems, perform calculations, access data sources, and execute functions beyond the capabilities of the core Large Language Model (LLM). These external functions are referred to as "Tools." Providing agents with tools unlocks significantly more powerful and useful behaviors. However, managing a growing library of tools, ensuring they are used correctly and reliably by agents, and providing a good developer experience for defining and integrating them presents significant challenges.

This document outlines the requirements for the EffectiveAgent Tool System, designed to provide a robust, type-safe, extensible, and developer-friendly way to manage and execute tools within the EffectiveAgent framework.

## 2. Goals

*   **Enable Tool Usage:** Allow agents built with EffectiveAgent to reliably discover and execute custom functions and interact with external systems/APIs via Tools.
*   **Developer Experience:** Provide a clear and intuitive process for developers to define, implement, register, and organize custom tools.
*   **Type Safety & Reliability:** Ensure tool inputs and outputs are validated at runtime against defined schemas, preventing errors and increasing agent robustness. Leverage Effect-TS for reliable execution and error handling.
*   **Extensibility:** Allow developers to easily add project-specific tools or integrate tools implemented using various mechanisms (native Effect code, external HTTP APIs, third-party libraries like Agentic or StackOne).
*   **Organization & Scalability:** Provide mechanisms (namespaces, toolboxes, workspaces) to manage potentially large numbers of tools from different sources (standard library, organization, project) without naming conflicts.
*   **LLM Integration:** Facilitate the process of making tools understandable and usable by LLMs (primarily through clear descriptions, with potential for future schema generation).

## 3. Target Audience

*   **AI Engineers & Developers:** Using the EffectiveAgent framework to build agents that require interaction with external systems or custom logic execution.
*   **Platform Teams:** Potentially defining organization-wide standard tools for use across multiple agent projects.

## 4. User Requirements & Use Cases

Developers using the EffectiveAgent Tool System need to be able to:

*   **Define a New Tool:**
    *   Specify a unique name for the tool (potentially namespaced).
    *   Write a clear, detailed natural language description explaining the tool's purpose, expected inputs, and outputs (primarily for LLM consumption).
    *   Define precise input and output schemas using Effect Schema for runtime validation.
    *   Implement the tool's core execution logic as an Effect function, handling potential errors.
    *   *(Future):* Define tools that wrap external HTTP/GraphQL APIs or other interaction protocols.
*   **Organize Tools:**
    *   Group related project-specific tools into logical, namespaced collections ("Toolboxes").
    *   Assemble all project toolboxes into a single project "Workspace".
*   **Register Tools:**
    *   Easily make their custom tools (defined individually and organized in toolboxes/workspaces) available to the agent runtime environment.
    *   Leverage standard library tools provided by EffectiveAgent without extra configuration.
    *   (Optional) Leverage organization-wide tools provided separately.
    *   Have project-specific tools override standard library or organization tools with the same fully qualified name.
*   **Execute Tools (via Agent):**
    *   Have agent workflows (e.g., defined in Behaviors/Graphs) reliably call registered tools by their fully qualified name.
    *   Trust that tool inputs provided by the agent/LLM will be validated against the tool's input schema before execution.
    *   Trust that tool outputs will be validated against the tool's output schema before being used by the agent.
    *   Receive clear, typed errors if a tool is not found, input/output validation fails, or the tool's execution logic fails.
*   **Control Tool Access:**
    *   (Via the `Intelligence` capability) Define which specific tools or toolkits are permitted for use within a given agent context (Character/Behavior).

**Example Use Case:** A developer wants to add a custom `scientificCalculator` tool to their project's "science" toolbox and a `fetchCompanyData` tool (wrapping an internal API) to their "internalApi" toolbox. They define these tools (metadata, schemas, implementation Effects). They use framework builders to declare the "science" and "internalApi" toolboxes and assemble them into their project's `EffectiveWorkspace`. They configure the main agent runtime with this workspace. Their agent's behavior graph can then reliably call `"science/calculator"` and `"internalApi/fetchCompanyData"`, with the framework handling validation and execution.

## 5. Functional Requirements (Features)

The EffectiveAgent Tool System will provide:

*   **Primitives:**
    *   `EffectiveTool`: A data structure encapsulating tool metadata (`ToolDefinition`: name, description) and implementation details (`ToolImplementation`: tag, schemas, logic).
    *   `EffectiveToolbox`: A data structure (`HashMap`) representing a namespaced collection of `EffectiveTool`s.
    *   `EffectiveWorkspace`: A data structure (`Map`) representing a collection of namespaced `EffectiveToolbox`es for a project.
*   **Builders:**
    *   `createEffectiveToolbox(namespace)`: Builder to create an `EffectiveToolbox`.
    *   `createEffectiveWorkspace()`: Builder to create an `EffectiveWorkspace`.
*   **Registration Mechanism:**
    *   A system for providing standard library tools (`InternalToolboxLayer`).
    *   A clear pattern for users to provide their `EffectiveWorkspace` data structure during application setup (`ProjectWorkspaceTag`, `Layer.succeed`).
    *   A merging mechanism (`FinalToolRegistryLayer`) that combines tool sources (stdlib, project, org) into a final, flattened `ToolRegistryData` map (`HashMap<FullToolName, EffectiveTool>`) with defined precedence.
*   **Execution Service:**
    *   `ToolExecutorService`: An injectable Effect service (`ToolExecutorServiceTag`).
    *   `run(fullToolName, rawInput)` method:
        *   Looks up the tool by its fully qualified name in the merged registry.
        *   Performs permission checks based on the current execution context (e.g., `Intelligence` profile via `FiberRef`).
        *   Validates `rawInput` against the tool's registered Effect `inputSchema`.
        *   Dispatches execution based on the tool's `implementation._tag` (initially supporting `EffectImplementation`, extensible to `HttpImplementation`, etc.).
        *   Validates the result against the tool's registered Effect `outputSchema`.
        *   Returns the validated result or a specific, typed `ToolError` (`ToolNotFoundError`, `ToolInputValidationError`, `ToolOutputValidationError`, `ToolExecutionError`).
*   **(Vision) Tool Description Enhancer:** A conceptual agent/tool to analyze and improve tool descriptions for better LLM usability.

## 6. Out of Scope (Initial Version)

*   Providing an exhaustive library of pre-built tool implementations for every possible external service (focus is on the framework and extensibility).
*   A graphical UI for defining or managing tools.
*   Complex runtime discovery or negotiation of tools between independent agents (focus is on tools available within a single EffectiveAgent application instance).
*   Automatic generation of JSON Schema from Effect Schema for LLM function calling (defer to LLM interaction layer like `SkillApi`).

