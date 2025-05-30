# Effective Agent

## Overview

Effective Agent is a TypeScript application framework for building robust, scalable, concurrent, and maintainable AI agents and agent-based systems. It is designed to reduce the complexity of developing sophisticated agents by providing a modular, Effect-TS-based architecture. The framework leverages the Effect system for composable asynchronous operations, strong type safety, and powerful dependency management.

At the heart of the application is the **`AgentRuntime`**, which serves as the central orchestrator. It is responsible for:
- **Application Bootstrapping:** Managing the initial startup sequence.
- **Service Initialization:** Initializing all core services, including `FileSystem`, `ConfigurationService`, `LoggingService`, `ProviderService`, `ModelService`, and `PolicyService`.
- **Dependency Management:** Composing and providing the necessary Effect Layers for all services, ensuring correct dependency injection.
- **Runtime Provision:** Creating and exposing a singleton `Effect.Runtime` instance that includes the context of all initialized services.
- **Execution Context:** Offering methods to execute Effect-based operations within the application's fully configured runtime.

### Design Philosophy
- **Effect-TS Architecture:** All services and workflows utilize Effect-TS for composable, type-safe asynchronous logic and dependency management.
- **Service-Oriented Architecture:** Common agent capabilities and utilities are factored into dedicated, injectable services using the `Effect.Service` pattern.
- **Immutability & Type Safety:** Data structures are immutable by default, with clear type contracts and schema-based validation.
- **Agent-Centric:** Designed for building multi-capability, multi-modal AI agents, managed and orchestrated by the `AgentRuntime`.

### Features
- **Centralized `AgentRuntime`:** Manages application lifecycle, services, and provides a unified Effect runtime.
- **Modular Service Layers:** For AI models, providers, tools, policies, and core functionalities.
- **Configuration Management:** Centralized configuration loading and validation via `ConfigurationService`.
- **Advanced Error Handling:** Comprehensive error recovery patterns including circuit breakers and retries.
- **Performance & Health Monitoring:** Built-in services for metrics, benchmarking, and service health.

---

## Service Tree

```
services/
├── ai
│   ├── model
│   ├── policy
│   ├── prompt
│   ├── provider
│   ├── tool-registry
│   └── tools
├── core
│   ├── attachment
│   ├── audit
│   ├── auth
│   ├── configuration
│   ├── executive
│   ├── file
│   ├── logging
│   ├── repository
│   ├── tag
│   └── websocket
├── pipeline
│   ├── bridge
│   ├── chat
│   ├── input
│   ├── pipeline
│   └── producers
│       ├── chat
│       ├── embedding
│       ├── image
│       ├── object
│       ├── text
│       └── transcription
├── capabilities
│   ├── intelligence
│   ├── persona
│   └── skill

agent-runtime/
```

---

## Layer & Service Overview

### agent-runtime
Provides the core runtime environment for agents, including mailbox management, activity processing, and lifecycle control. It enables asynchronous, prioritized message handling and stateful agent execution, forming the foundation for all agent workflows.

> **Note:** In the future, the agent-runtime will provide the primary interface to Effective Agent services. The agent runtime will be passed to each node in the agent graph through the `AgentState` object.

### core
The foundational layer, offering essential infrastructure services:
- **Configuration (`src/services/core/configuration/`):** Loads, validates, and provides configuration data (from `master-config.json` and other service-specific configs) to all services. Relies on `MasterConfigData` (provided by `AgentRuntime`) and `FileSystem`.
- **FileSystem (`@effect/platform-node` or `@effect/platform-bun`):** Provides an implementation for file system operations, selected at startup via `master-config.json` and made available by `AgentRuntime`.
- **Logging (`src/services/core/logging/`):** Centralized logging for service and agent events, configured via `master-config.json`.
- **ErrorRecovery (`src/services/core/error-recovery/`):** Implements advanced error recovery patterns like circuit breakers, retry mechanisms, and fallback strategies for enhanced application resilience.
- **PerformanceMonitoring (`src/services/core/performance/`):** Collects performance metrics, supports benchmarking, and provides a dashboard for monitoring application performance.
- **ServiceHealthMonitoring (`src/services/core/health/`):** Monitors the health of services, supports advanced health checks, and enables graceful degradation strategies.
- **Attachment:** Handles file and data attachment operations for agents.
- **Auth:** Manages authentication and authorization contexts for secure agent execution.
- **Executive:** Orchestrates Effect-based operations with policy enforcement, retries, and timeouts.
- **Repository:** Generic CRUD storage for entities, supporting multiple backends.
- **Tag:** Tagging and metadata management for entities and agent records.
- **Websocket:** Real-time communication and protocol support for agent interactions.
- **Audit:** Tracks and logs execution lifecycle events, policy checks, and authentication validations.

### ai
AI-focused services for model, tool, and provider management:
- **Provider (`src/services/ai/provider/`):** Handles AI provider configuration (from `providers.json`), client instantiation, and capability validation. Depends on `ConfigurationService` for its config and API keys.
- **Model (`src/services/ai/model/`):** Loads and manages AI model metadata and capabilities (from `models.json`). Depends on `ConfigurationService` and `ProviderService`.
- **Policy (`src/services/ai/policy/`):** Defines and enforces rules for agent/model usage (from `policy.json`), including rate limits and permissions. Depends on `ConfigurationService`.
- **Prompt:** Manages prompt templates and prompt configuration for AI models.
- **Tool Registry:** Central registry for all available agent tools and toolkits.
- **Tools:** Executes registered tools with validation and error handling, integrating with the registry.

### pipeline
Orchestrates agent workflows, input/output, and multi-modal processing:
- **Bridge:** Message passing and state bridging between agent runtimes or external systems.
- **Chat:** Manages chat history and conversational context for agent-driven interactions.
- **Input:** Handles message and part collection, validation, and transformation for agent input.
- **Pipeline:** Core pipeline execution, including retries, timeouts, and orchestration logic.
- **Producers:** Modular services for generating outputs in different modalities:
    - **chat:** Handles AI chat interactions and completions.
    - **embedding:** Generates vector embeddings from text.
    - **image:** Produces images from prompts using AI models.
    - **object:** Generates structured objects using AI and schema validation.
    - **text:** Handles generic AI text generation.
    - **transcription:** Transcribes audio input to text using AI models.

### capabilities
Defines agent capabilities as composable, validated services:
- **Intelligence:** Manages intelligence profiles and configurations for agents.
- **Persona:** Handles persona definitions, tone, and behavioral configuration for agents.
- **Skill:** Registers, validates, and executes agent skills as modular, reusable behaviors.

---

## Getting Started

1. Install dependencies:
   ```sh
   bun install
   ```
2. Set up `config/master-config.json`. You can use `config/master-config.example.json` as a template. This file is crucial as it dictates paths to other configurations and core runtime settings.
3. Ensure environment variables for API keys (e.g., `OPENAI_API_KEY`) are set. Refer to `config/providers.example.json` for relevant `apiKeyEnvVar` names.
   ```sh
   cp .env.example .env
   # Edit .env with your API keys
   ```
4. Run tests:
   ```sh
   bun test
   ```
5. To run the application (example):
  ```sh
  bun src/main.ts
  ```
  *(Ensure `src/main.ts` calls `AgentRuntime.initialize()`)*

6. Explore the `examples/` directory for usage patterns.
