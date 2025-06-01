# Effective Agent

## Overview

Effective Agent is a TypeScript application framework for building robust, scalable, concurrent, and maintainable AI agents and agent-based systems. It is designed to reduce the complexity of developing sophisticated agents by providing a modular, Effect-TS-based architecture. The framework leverages the Effect system for composable asynchronous operations, strong type safety, and powerful dependency management.

At the heart of the application is the **`AgentRuntimeService`**, which serves as the central orchestration layer. It provides a unified interface for:
- **Agent Management:** Creating, terminating, and managing agent lifecycles with type-safe state handling
- **Service Access:** Providing configured AI services (ModelService, ProviderService, PolicyService) to applications
- **Message Processing:** Handling agent activities through prioritized mailboxes with streaming capabilities
- **Runtime Orchestration:** Coordinating service initialization while maintaining clean separation of concerns

### Architecture Principles

**Service Self-Configuration:** Each domain service is responsible for loading its own configuration via `ConfigurationService`, eliminating circular dependencies and ensuring clean initialization.

**Effect.Service Pattern:** All services use the `Effect.Service` pattern for dependency injection, providing automatic layer management and type-safe service access.

**Functional Design:** Built on Effect-TS for composable, type-safe asynchronous operations with comprehensive error handling and recovery patterns.

**Agent-Centric Runtime:** Designed specifically for managing multi-capability AI agents with stateful execution and prioritized message processing.

### Key Features

- **Unified Service Interface:** Access all AI services (models, providers, policies) through a single AgentRuntimeService
- **Self-Configuring Services:** Services load their own configurations, reducing coupling and improving maintainability
- **Type-Safe Agent Management:** Create and manage agents with full TypeScript type safety
- **Advanced Error Recovery:** Built-in circuit breakers, retries, and fallback strategies
- **Performance Monitoring:** Comprehensive metrics and health checking for all services
- **Configuration Validation:** Schema-based validation for all configuration files

---

## Service Architecture

```
services/
├── ai/
│   ├── model/          # AI model definitions and capabilities
│   ├── policy/         # Usage policies and rate limiting
│   ├── prompt/         # Prompt templates and management
│   ├── provider/       # AI provider configurations and clients
│   ├── tool-registry/  # Central tool registry
│   └── tools/          # Tool execution and validation
├── core/
│   ├── attachment/     # File and data attachment handling
│   ├── audit/          # Execution tracking and compliance
│   ├── auth/           # Authentication and authorization
│   ├── configuration/  # Configuration loading and validation
│   ├── executive/      # Policy-enforced operation orchestration
│   ├── file/           # File system operations
│   ├── logging/        # Centralized logging
│   ├── repository/     # Generic CRUD storage
│   ├── tag/            # Entity tagging and metadata
│   └── websocket/      # Real-time communication
├── pipeline/
│   ├── bridge/         # Inter-runtime message passing
│   ├── chat/           # Conversational context management
│   ├── input/          # Input validation and transformation
│   ├── pipeline/       # Core workflow orchestration
│   └── producers/      # Multi-modal output generation
│       ├── chat/       # AI chat completions
│       ├── embedding/  # Vector embeddings
│       ├── image/      # Image generation
│       ├── object/     # Structured object generation
│       ├── text/       # Text generation
│       └── transcription/ # Audio transcription
└── capabilities/
    ├── intelligence/   # Intelligence profiles
    ├── persona/        # Behavioral configuration
    └── skill/          # Modular agent skills

agent-runtime/          # Central orchestration service
```

---

## Core Services

### AgentRuntimeService
The central orchestration layer providing:
- **Agent Lifecycle Management:** Create, terminate, and monitor agent execution
- **Service Access:** Unified interface to ModelService, ProviderService, PolicyService
- **Message Handling:** Prioritized mailbox processing with activity streaming
- **State Management:** Type-safe agent state with concurrent updates

```typescript
// Get configured services through AgentRuntimeService
const runtime = yield* AgentRuntimeService;
const modelService = yield* runtime.getModelService();
const policyService = yield* runtime.getPolicyService();

// Create and manage agents
const agent = yield* runtime.create("agent-1", initialState);
yield* agent.send(activity);
```

### AI Services

**ModelService:** Self-configures from `models.json` via environment variable `MODELS_CONFIG_PATH`
- Validates model availability and capabilities
- Provides model metadata and provider mappings
- Supports capability-based model selection

**ProviderService:** Self-configures from `providers.json` via environment variable `PROVIDERS_CONFIG_PATH`
- Manages AI provider clients and configurations
- Handles API key management and authentication
- Provides provider capability validation

**PolicyService:** Self-configures from `policies.json` via environment variable `POLICY_CONFIG_PATH`
- Enforces usage policies and rate limits
- Records policy outcomes for auditing
- Supports rule-based access control

### Core Infrastructure

**ConfigurationService:** Central configuration management
- Loads and validates all configuration files
- Provides schema-based validation
- Supports environment-specific configurations

**FileSystem:** Cross-platform file operations
- Abstracts Node.js and Bun file systems
- Provides Effect-based file operations
- Supports both sync and async operations

---

## Getting Started

1. **Install dependencies:**
   ```sh
   bun install
   ```

2. **Set up master configuration:**
   ```sh
   cp config/master-config.example.json config/master-config.json
   # Edit master-config.json for your environment
   ```

3. **Configure services:**
   ```sh
   cp config/models.example.json config/models.json
   cp config/providers.example.json config/providers.json
   cp config/policies.example.json config/policies.json
   # Edit each configuration file as needed
   ```

4. **Set environment variables:**
   ```sh
   cp .env.example .env
   # Add your API keys to .env
   
   # Set configuration paths (optional - defaults provided)
   export MASTER_CONFIG_PATH=./config/master-config.json
   export MODELS_CONFIG_PATH=./config/models.json
   export PROVIDERS_CONFIG_PATH=./config/providers.json
   export POLICY_CONFIG_PATH=./config/policies.json
   ```

5. **Run tests:**
   ```sh
   bun test
   ```

6. **Start the application:**
   ```sh
   bun src/main.ts
   ```

### Example Usage

```typescript
import { AgentRuntimeService } from "@/agent-runtime";
import { Effect } from "effect";

// Basic agent creation and management
const program = Effect.gen(function* () {
  // Get the runtime service
  const runtime = yield* AgentRuntimeService;
  
  // Access configured AI services
  const modelService = yield* runtime.getModelService();
  const defaultModel = yield* modelService.getDefaultModelId();
  
  // Create an agent
  const agent = yield* runtime.create("my-agent", { 
    status: "ready",
    model: defaultModel 
  });
  
  // Send activities to the agent
  yield* agent.send({
    type: "user-message",
    content: "Hello, agent!"
  });
  
  // Monitor agent state
  const currentState = yield* agent.getState();
  console.log("Agent state:", currentState);
});

// Run with proper service dependencies
Effect.runMain(program.pipe(
  Effect.provide(AgentRuntimeService.Default)
));
```

## Documentation

- [Agent Runtime Architecture](./src/agent-runtime/docs/ARCHITECTURE.md)
- [Agent Runtime API](./src/agent-runtime/docs/API.md)
- [Service Development Guide](./docs/SERVICE_DEVELOPMENT.md)
- [Configuration Reference](./docs/CONFIGURATION.md)
