Excellent. This is the pivotal moment where design becomes specification. Creating a clear, comprehensive, and unambiguous Product Requirements Document (PRD) is the single most important step to ensure the AI coding agent can build our vision accurately and efficiently.

Here is the PRD for `ea-cli` v1.0. It is written to be parsed and understood by a large language model.

---

## Product Requirements Document: `ea-cli` v1.0

### 1. Overview

**Product Name:** `ea-cli`

**Product Description:** `ea-cli` is the official command-line interface for the Effective Agents (EA) framework. It is a professional-grade tool designed to manage the entire lifecycle of an AI agent project, from initialization and resource management to execution and operational monitoring.

**Target Audience:** Software engineers building applications on the Effective Agents framework.

**Problem Statement:** Developers using the EA framework need a robust, intuitive, and efficient tool to create, manage, test, and run their agent projects. The CLI should streamline workflows, enforce best practices, and provide a superior developer experience (DX).

### 2. Goals & Objectives

*   To provide a single, comprehensive tool for all common project tasks.
*   To drastically reduce boilerplate and setup time through intelligent scaffolding.
*   To ensure project configurations are always valid and manageable.
*   To offer clear, real-time feedback during agent execution.
*   To establish a clean, maintainable boundary between the CLI tool and the core EA framework.

### 3. Scope

#### 3.1. In Scope for v1.0

*   **Project Scaffolding:** `init`
*   **Resource Management (CRUD):** `add`, `list`, `delete` for all core resources.
*   **Agent Execution:** `run`, `serve`
*   **Configuration Validation:** `config:validate`
*   **Log Management:** `log:view`, `log:clear`
*   **Help System:** Auto-generated, context-aware help for all commands.

#### 3.2. Out of Scope for v1.0

*   `ea-cli upgrade` (Framework version management)
*   `ea-cli build` (Production build/bundling)
*   `ea-cli doctor` (Environment health checks)
*   Interactive prompts for `add:*` commands (v1 will create placeholder stubs).

### 4. Core Concepts & Terminology

*   **Workspace:** The root project directory, created by `ea-cli init`. It contains the `ea-config` directory and an `agents` directory.
*   **Agent Package:** A self-contained, independently testable package located inside the `agents/` directory. Each agent has its own `package.json` and source files.
*   **`ea-config`:** A directory at the workspace root containing all project-level configuration as separate JSON files (`master-config.json`, `models.json`, etc.).
*   **Resource:** A configurable entity within the framework. v1.0 includes the following resources:
    *   **Agent:** A file-based resource (an Agent Package).
    *   **Model:** A configuration-based resource defined in `models.json`.
    *   **Provider:** A configuration-based resource defined in `providers.json`.
    *   **Rule:** A configuration-based resource defined in `policy.json`.
    *   **Toolkit:** A configuration-based resource defined in `tool-registry.json`.

### 5. Functional Requirements

#### 5.1. Technology Stack
*   **Language:** TypeScript
*   **CLI Framework:** `@effect/cli`
*   **Core Logic:** `Effect`
*   **Formatting:** `Prettier` (print width: 80)

#### 5.2. Command Specification

**`ea-cli init <project-name>`**
*   **Description:** Creates a new EA workspace directory.
*   **Behavior:**
    1.  Prompts the user to select a package manager (npm, pnpm, bun).
    2.  Creates a new directory with the given `<project-name>`.
    3.  Creates a root `package.json` configured for workspaces.
    4.  Creates an `agents/` subdirectory.
    5.  Creates an `ea-config/` subdirectory populated with default, schema-valid configuration files.
*   **Success Output:** A confirmation message and "Next steps" instructions.
*   **Error Conditions:** Fails if the target directory already exists.

**`ea-cli add:agent <agent-name>`**
*   **Description:** Scaffolds a new, self-contained agent package.
*   **Behavior:**
    1.  Creates a new directory at `agents/<agent-name>`.
    2.  Generates a complete, working agent package structure inside, including `package.json`, `tsconfig.json`, `vitest.config.ts`, and placeholder source files in `src/`.
*   **Success Output:** A confirmation message and "Next steps" for the new agent.
*   **Error Conditions:** Fails if the agent package directory already exists.

**`ea-cli list:<resource>`** (e.g., `list:model`, `list:agent`)
*   **Description:** Lists all available resources of a given type.
*   **Behavior:**
    *   For config-based resources (`model`, `provider`, `rule`, `toolkit`): Reads the relevant `ea-config` JSON file and prints the IDs/names of all entries.
    *   For `agent`: Reads the `agents/` directory and lists all subdirectories.
*   **Success Output:** A formatted list of resource names.

**`ea-cli delete:<resource> <name>`** (e.g., `delete:model gpt-4o`)
*   **Description:** Deletes a resource.
*   **Behavior:**
    1.  Prompts the user for confirmation before deleting.
    2.  For config-based resources: Removes the corresponding entry from the JSON file.
    3.  For `agent`: Recursively deletes the `agents/<name>` directory.
*   **Success Output:** A confirmation message.
*   **Error Conditions:** Fails if the resource does not exist.

**`ea-cli add:<resource> <name>`** (e.g., `add:toolkit search-tools`)
*   **Description:** Adds a new configuration-based resource.
*   **Behavior:** Adds a minimal, valid placeholder entry for the resource to the appropriate `ea-config` JSON file.
*   **Success Output:** A confirmation message.
*   **Error Conditions:** Fails if a resource with that name/ID already exists.

**`ea-cli run <agent-name> --input <string>`**
*   **Description:** Executes an agent with a single input and streams the output.
*   **Behavior:**
    1.  Validates that the agent package and `ea-config` directory exist.
    2.  Invokes the `runAgent` function from the `@effective-agents/core` framework.
    3.  Consumes the event stream returned by `runAgent` and renders it to the console in a human-readable format.
*   **Success Output:** A real-time, formatted stream of the agent's execution steps and final answer.
*   **Error Conditions:** Must cleanly display framework-level errors (e.g., invalid API key, model not found).

**`ea-cli serve <agent-name> --port <number>`**
*   **Description:** Serves an agent as a persistent WebSocket actor.
*   **Behavior:**
    1.  Validates that the agent package and `ea-config` directory exist.
    2.  Invokes the `serveAgent` function from the `@effective-agents/core` framework.
    3.  Consumes the server status event stream and renders operational logs (e.g., "Server starting...", "Server ready at ws://...").
*   **Success Output:** A persistent server process with clear status messages.
*   **Error Conditions:** Must cleanly display framework-level errors (e.g., port in use).

**`ea-cli config:validate`**
*   **Description:** Validates all `ea-config` files against their schemas.
*   **Behavior:**
    1.  Invokes the `validateProjectConfig` function from the `@effective-agents/core` framework.
    2.  Renders the success or failure result.
*   **Success Output:** `✅ Configuration files are valid.`
*   **Error Conditions:** A formatted list of all validation errors found.

**`ea-cli log:*`** (`view`, `clear`)
*   **Description:** Manages the log file defined in `master-config.json`.
*   **Behavior:**
    *   `view`: Prints the log file contents. Supports `--head N` and `--tail N`.
    *   `clear`: Clears the log file after user confirmation.

**`ea-cli help`**
*   **Description:** Provides help for commands.
*   **Behavior:** This functionality must be provided automatically by `@effect/cli`. The CLI must provide descriptive text for all commands and options to populate the help messages.

### 6. Framework Interaction Contract (API)

The `ea-cli` must interact with the `@effective-agents/core` package by calling the following "black box" functions. The CLI should not have any knowledge of their internal implementation.

```typescript
// In @effective-agents/core

// For `ea-cli run`
export function runAgent(options: {
  projectRoot: string;
  agentName: string;
  input: string;
}): Stream<AgentEvent, FrameworkError>;

// For `ea-cli serve`
export function serveAgent(options: {
  projectRoot: string;
  agentName: string;
  port: number;
}): Stream<ServerEvent, FrameworkError>;

// For `ea-cli config:validate`
export function validateProjectConfig(options: {
  configPath: string;
}): Effect<ValidationResult, FrameworkError>;

// --- Supporting Types ---
// The exact shape of these events will be defined by the framework,
// but the CLI should expect a `type` field to switch on for rendering.
type AgentEvent =
  | { type: "llm_start"; data: any }
  | { type: "tool_call"; data: any }
  | { type: "final_answer"; data: any };

type ServerEvent =
  | { type: "server_starting"; data: any }
  | { type: "server_ready"; data: any };

type ValidationResult =
  | { success: true }
  | { success: false; errors: string[] };

type FrameworkError = {
  code: string; // e.g., "CONFIG_ERROR", "API_AUTH_ERROR"
  message: string;
};
```