# Capabilities Services Overview

**Version:** 1.0
**Date:** 2024-07-27

This document provides a high-level overview of the services located within the `src/services/capabilities/` directory. These services define and manage the specific *abilities* or *actions* that an EffectiveAgent can perform, ranging from simple tool executions to complex, AI-driven skills and orchestrated workflows (MCPs).

## Guiding Principles

*   **Abstraction:** Define capabilities independently of the agent's core execution logic.
*   **Declarative Definition:** Encourage defining capabilities (especially Skills and Tools) via configuration files.
*   **Reusability:** Allow capabilities to be reused across different agents and workflows.
*   **Composability:** Enable complex capabilities (Skills, MCPs) to potentially leverage simpler ones (Tools).

## Capabilities Service Categories

### 1. `skill`

*   **Purpose:** Provides the primary abstraction (`SkillApi`) for invoking configured AI-driven capabilities. This is the main interface developers use to leverage LLM functionality within the framework.
*   **Key Responsibility:**
    *   Orchestrates the execution of a named "Skill" based on its definition (loaded via `SkillConfig` from `skills.json`).
    *   A Skill definition links an intent to specific configurations: an `IntelligenceProfile` name (determining model characteristics and memory), an optional `Persona` name (determining communication style), prompt templates/system prompts, default parameters, and potentially required tools.
    *   The `SkillApi.invokeSkill` method handles: loading configurations, preparing prompts (using `PromptApi`), selecting and configuring the underlying AI model (via `@effect/ai`'s `AiModel` factory pattern and `Completions` service), potentially managing tool calls related to the skill, and returning the final result.
*   **Dependencies:** `SkillConfig`, `IntelligenceConfig`, `PersonaConfig`, `Completions` (via `@effect/ai` layers), `LoggingApi`, `PromptApi` (likely), Memory Services (likely), `ToolApi` (potentially).

### 2. `tool`

*   **Purpose:** Manages the definition and execution of specific, often deterministic, external actions or computations that an agent can perform. Tools typically interact with external APIs or perform calculations.
*   **Key Responsibility:**
    *   Provides a `ToolApi` for registering and executing tools.
    *   Tools are defined with a name, description, an input schema (Zod), and an `execute` function (returning an `Effect`).
    *   Definitions can be loaded via `ToolConfig` from `tools.json` or registered programmatically.
    *   The `ToolApi.executeTool` method validates input against the schema and runs the tool's `execute` Effect.
    *   Provides a standard library of common tools (e.g., web search, calculator, scheduling - located in `implementations/standard-library/`).
*   **Dependencies:** `ToolConfig` (optional, depends on `ConfigLoaderApi`), `LoggingApi`. Specific tool implementations have their own dependencies (e.g., `HttpClient` for API calls).

### 3. `mcp` (Master Control Program / Complex Capability)

*   **Purpose:** Manages the definition and execution of complex, potentially long-running, multi-step capabilities that orchestrate other skills and tools to achieve a higher-level goal. Can be thought of as very advanced, stateful "super-skills" or internal sub-agents.
*   **Key Responsibility:**
    *   Provides an `MCPApi` (or similar) for invoking named MCPs.
    *   MCP definitions (loaded via `MCPConfig`?) specify their logic, potentially as state machines, LangGraph graphs, or complex Effect workflows.
    *   An MCP execution involves calling `SkillApi`, `ToolApi`, and potentially interacting with memory or threads.
    *   Provides a standard library of useful MCPs (e.g., complex research and report generation).
*   **Dependencies:** `MCPConfig` (optional, depends on `ConfigLoaderApi`), `SkillApi`, `ToolApi`, `LoggingApi`, potentially `ThreadApi`, Memory Services.

**Interaction Summary:**

The agent's main execution logic (within `ThreadApi` or potentially a root MCP) decides which capability is needed. If it's a direct AI interaction with specific configuration, it calls `SkillApi.invokeSkill`. If it's a specific external action, it calls `ToolApi.executeTool`. If it's a complex, pre-defined workflow, it might call `MCPApi.invokeMCP`. Skills and MCPs can, in turn, call the `ToolApi` to perform necessary actions during their execution. The `SkillApi` is the primary gateway to configured LLM interactions based on combined Skill, Intelligence, and Persona definitions.
