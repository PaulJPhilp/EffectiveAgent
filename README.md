# Effective Agent

## Overview

Effective Agent is a TypeScript library for building robust, scalable, concurrent and maintainable AI agents and agent-based systems. It is designed to reduce the complexity of developing robust agents by providing a modular, effect-based architecture. The library leverages the Effect system for composable async operations and strong type safety, and encourages best practices in code organization, immutability, and service separation.

### Design Philosophy
- **Effect-based architecture:** All services and workflows use Effect v3 for composable, type-safe async logic.
- **Shared services architecture:** Common agent capabilities and utilities are factored into dedicated services.
- **Immutability & type safety:** Data structures are immutable by default, with clear type contracts and validation.
- **Agent-centric:** Designed for building multi-capability, multi-modal AI agents with minimal boilerplate.

### Features
- Unified agent runtime and mailbox system
- Modular AI model and provider management
- Tool registry and execution system
- Pipeline orchestration and input/output handling
- Persona, skill, and intelligence capability layers
- Comprehensive error handling and configuration

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
- **Attachment:** Handles file and data attachment operations for agents.
- **Auth:** Manages authentication and authorization contexts for secure agent execution.
- **Configuration:** Loads, validates, and provides configuration data to all services.
- **Executive:** Orchestrates Effect-based operations with policy enforcement, retries, and timeouts.
- **File:** Provides file storage and retrieval abstractions.
- **Logging:** Centralized logging for service and agent events.
- **Repository:** Generic CRUD storage for entities, supporting multiple backends.
- **Tag:** Tagging and metadata management for entities and agent records.
- **Websocket:** Real-time communication and protocol support for agent interactions.
- **Audit:** Tracks and logs execution lifecycle events, policy checks, and authentication validations.

### ai
AI-focused services for model, tool, and provider management:
- **Model:** Loads and manages AI model metadata and capabilities.
- **Policy:** Defines and enforces rules for agent/model usage, including rate limits and permissions.
- **Prompt:** Manages prompt templates and prompt configuration for AI models.
- **Provider:** Handles AI provider configuration, client instantiation, and capability validation.
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
2. Set up environment variables using `.env.example` as a template.
3. Run tests:
   ```sh
   bun test
   ```
4. Explore the `examples/` directory for usage patterns.
