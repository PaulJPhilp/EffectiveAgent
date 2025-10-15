# EffectiveAgent Architecture

This document provides a comprehensive visual architecture of the EffectiveAgent framework using Mermaid diagrams.

## System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        CLIENT[Client Application]
        CLI[EA CLI]
    end

    subgraph "Agent Runtime Layer"
        ARS[AgentRuntimeService<br/>Central Orchestration]
        LGAGENT[LangGraph Agent Runtime]
        STATE[Agent State Management<br/>Effect.Ref]
    end

    subgraph "AI Services Layer"
        MS[ModelService<br/>Model Definitions]
        PS[ProviderService<br/>AI Provider Clients]
        POLS[PolicyService<br/>Usage Policies]
        TRS[ToolRegistryService<br/>Tool Registry]
    end

    subgraph "Producer Services"
        CHAT[ChatService<br/>Chat Completions]
        EMB[EmbeddingService<br/>Vector Embeddings]
        IMG[ImageService<br/>Image Generation]
        OBJ[ObjectService<br/>Structured Output]
        TXT[TextService<br/>Text Generation]
        TRANS[TranscriptionService<br/>Audio Transcription]
    end

    subgraph "Execution Services"
        ORCH[OrchestratorService<br/>Policy Orchestration]
        RES[ResilienceService<br/>Circuit Breakers & Retries]
    end

    subgraph "Core Services"
        CONFIG[ConfigurationService<br/>Config Loading & Validation]
        HEALTH[HealthService<br/>Service Health]
        PERF[PerformanceService<br/>Metrics & Monitoring]
        WS[WebSocketService<br/>Real-time Communication]
    end

    subgraph "Infrastructure Layer"
        FS[FileSystem<br/>@effect/platform]
        BOOTSTRAP[Bootstrap<br/>Master Config Loader]
    end

    subgraph "Configuration Files"
        MASTER[master-config.json]
        MODELS[models.json]
        PROVIDERS[providers.json]
        POLICIES[policies.json]
    end

    %% Client connections
    CLIENT --> ARS
    CLI --> ARS

    %% Agent Runtime connections
    ARS --> MS
    ARS --> PS
    ARS --> POLS
    ARS --> TRS
    ARS --> STATE
    ARS --> LGAGENT

    %% Producer service connections
    ARS -.-> CHAT
    CHAT --> MS
    CHAT --> PS
    EMB --> MS
    EMB --> PS
    IMG --> MS
    IMG --> PS
    OBJ --> MS
    OBJ --> PS
    TXT --> MS
    TXT --> PS
    TRANS --> MS
    TRANS --> PS

    %% Execution service connections
    ORCH --> POLS
    ORCH --> RES
    RES --> HEALTH
    RES --> PERF

    %% Core service connections
    MS --> CONFIG
    PS --> CONFIG
    POLS --> CONFIG
    TRS --> CONFIG
    CONFIG --> FS
    CONFIG --> BOOTSTRAP

    %% Configuration loading
    BOOTSTRAP --> MASTER
    CONFIG --> MODELS
    CONFIG --> PROVIDERS
    CONFIG --> POLICIES

    %% Styling
    classDef runtime fill:#e1f5ff,stroke:#01579b,stroke-width:3px
    classDef ai fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef producer fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef core fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef config fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef client fill:#e0f2f1,stroke:#004d40,stroke-width:2px

    class ARS,LGAGENT,STATE runtime
    class MS,PS,POLS,TRS ai
    class CHAT,EMB,IMG,OBJ,TXT,TRANS producer
    class CONFIG,HEALTH,PERF,WS,FS,BOOTSTRAP core
    class MASTER,MODELS,PROVIDERS,POLICIES config
    class CLIENT,CLI client
```

## Service Self-Configuration Pattern

```mermaid
sequenceDiagram
    participant App as Application
    participant ARS as AgentRuntimeService
    participant MS as ModelService
    participant Config as ConfigurationService
    participant FS as FileSystem
    participant Bootstrap as bootstrap()

    Note over App,Bootstrap: Service Initialization Flow

    App->>ARS: Initialize AgentRuntimeService
    activate ARS

    ARS->>MS: Request ModelService
    activate MS

    MS->>Bootstrap: Call bootstrap()
    activate Bootstrap
    Bootstrap->>FS: Load MASTER_CONFIG_PATH
    FS-->>Bootstrap: master-config.json
    Bootstrap-->>MS: Master config object
    deactivate Bootstrap

    MS->>Config: Load config (modelsConfigPath)
    activate Config
    Config->>FS: Read models.json
    FS-->>Config: models.json content
    Config->>Config: Schema validation
    Config-->>MS: Validated model config
    deactivate Config

    MS->>MS: Initialize model registry
    MS-->>ARS: ModelService ready
    deactivate MS

    Note over ARS: Same pattern for<br/>ProviderService, PolicyService

    ARS-->>App: AgentRuntimeService ready
    deactivate ARS
```

## Effect.Service Dependency Injection

```mermaid
graph TB
    subgraph "Effect.Service Pattern"
        SVC_DEF[Service Definition<br/>Effect.Service Class]
        SVC_IMPL[Service Implementation<br/>Effect.gen]
        SVC_LAYER[Service Layer<br/>Default Layer]
    end

    subgraph "Service Dependencies"
        DEP1[ModelService.Default]
        DEP2[ProviderService.Default]
        DEP3[ConfigurationService.Default]
        DEP4[FileSystem.layer]
    end

    subgraph "Application Layer Composition"
        APP_LAYER[Application Layer<br/>Layer.mergeAll]
    end

    subgraph "Runtime Execution"
        PROGRAM[Effect Program<br/>Effect.gen]
        PROVIDE[Effect.provide]
        RUN[Effect.runPromise]
    end

    SVC_DEF --> SVC_IMPL
    SVC_IMPL --> SVC_LAYER

    DEP1 --> APP_LAYER
    DEP2 --> APP_LAYER
    DEP3 --> APP_LAYER
    DEP4 --> APP_LAYER
    SVC_LAYER --> APP_LAYER

    PROGRAM --> PROVIDE
    APP_LAYER --> PROVIDE
    PROVIDE --> RUN

    classDef service fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef layer fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef runtime fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px

    class SVC_DEF,SVC_IMPL,SVC_LAYER,DEP1,DEP2,DEP3,DEP4 service
    class APP_LAYER layer
    class PROGRAM,PROVIDE,RUN runtime
```

## Agent Runtime Lifecycle

```mermaid
stateDiagram-v2
    [*] --> IDLE: create()

    IDLE --> PROCESSING: send(activity)
    PROCESSING --> IDLE: Processing Complete
    PROCESSING --> ERROR: Processing Failed

    ERROR --> IDLE: Recovery Successful
    ERROR --> TERMINATED: Unrecoverable Error

    IDLE --> TERMINATED: terminate()
    PROCESSING --> TERMINATED: terminate()
    ERROR --> TERMINATED: terminate()

    TERMINATED --> [*]

    note right of IDLE
        Agent state stored in Effect.Ref
        Ready to process activities
    end note

    note right of PROCESSING
        Activity being processed
        State updates via Effect.Ref
    end note

    note right of ERROR
        Resilience strategies active
        Circuit breakers, retries
    end note

    note right of TERMINATED
        Resources cleaned up
        Agent removed from registry
    end note
```

## Chat Completion Flow

```mermaid
sequenceDiagram
    participant Client
    participant ARS as AgentRuntimeService
    participant Chat as ChatService
    participant Model as ModelService
    participant Provider as ProviderService
    participant AI as AI Provider API

    Client->>ARS: generate chat completion
    ARS->>Chat: getChatService()
    activate Chat

    Chat->>Chat: Validate input

    Chat->>Model: getProviderName(modelId)
    activate Model
    Model-->>Chat: providerName
    deactivate Model

    Chat->>Provider: getProviderClient(providerName)
    activate Provider
    Provider-->>Chat: providerClient
    deactivate Provider

    Chat->>Chat: Create EffectiveInput
    Chat->>Chat: Prepare messages

    Chat->>AI: providerClient.chat(input, options)
    activate AI
    AI-->>Chat: AI response
    deactivate AI

    Chat->>Chat: Update internal state<br/>(Effect.Ref)
    Chat->>Chat: Track metrics

    Chat-->>Client: ChatCompletionResult
    deactivate Chat
```

## Resilience & Error Handling

```mermaid
graph TB
    subgraph "Request Flow with Resilience"
        REQ[Incoming Request]
        POL_CHECK{Policy Check}
        CB{Circuit Breaker<br/>Open?}
        EXEC[Execute Operation]
        RETRY{Retry?}
        FB{Fallback<br/>Available?}
        SUCCESS[Success Response]
        ERROR[Error Response]
    end

    subgraph "Resilience Service Components"
        CB_METRICS[Circuit Breaker Metrics]
        RETRY_POL[Retry Policy]
        FB_STRAT[Fallback Strategy]
        ERR_CLASS[Error Classification]
    end

    subgraph "Monitoring"
        HEALTH[Health Checks]
        PERF[Performance Metrics]
        LOGS[Structured Logging]
    end

    REQ --> POL_CHECK
    POL_CHECK -->|Allowed| CB
    POL_CHECK -->|Denied| ERROR

    CB -->|Closed| EXEC
    CB -->|Open| FB

    EXEC -->|Success| SUCCESS
    EXEC -->|Failure| ERR_CLASS

    ERR_CLASS --> RETRY
    RETRY -->|Yes| EXEC
    RETRY -->|No| FB

    FB -->|Has Fallback| SUCCESS
    FB -->|No Fallback| ERROR

    CB_METRICS --> CB
    RETRY_POL --> RETRY
    FB_STRAT --> FB

    EXEC --> PERF
    EXEC --> LOGS
    CB --> HEALTH
    RETRY --> HEALTH

    classDef success fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    classDef error fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    classDef decision fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef resilience fill:#e1bee7,stroke:#6a1b9a,stroke-width:2px
    classDef monitoring fill:#b3e5fc,stroke:#01579b,stroke-width:2px

    class SUCCESS success
    class ERROR error
    class POL_CHECK,CB,RETRY,FB decision
    class CB_METRICS,RETRY_POL,FB_STRAT,ERR_CLASS resilience
    class HEALTH,PERF,LOGS monitoring
```

## Configuration Architecture

```mermaid
graph TB
    subgraph "Environment"
        ENV[Environment Variables]
        ENV_MASTER[MASTER_CONFIG_PATH]
        ENV_API[API Keys]
    end

    subgraph "Master Configuration"
        MASTER[master-config.json]
        RUNTIME[Runtime Settings]
        LOGGING[Logging Config]
        PATHS[Service Config Paths]
    end

    subgraph "Service Configurations"
        MODELS[models.json<br/>AI Models & Capabilities]
        PROVIDERS[providers.json<br/>Provider Clients]
        POLICIES[policies.json<br/>Usage Policies]
    end

    subgraph "Bootstrap Process"
        BOOT[bootstrap()]
        LOAD[Load Master Config]
        VALIDATE[Schema Validation]
    end

    subgraph "Service Self-Configuration"
        MS_CONFIG[ModelService<br/>loads models.json]
        PS_CONFIG[ProviderService<br/>loads providers.json]
        POL_CONFIG[PolicyService<br/>loads policies.json]
    end

    ENV_MASTER --> BOOT
    ENV_API --> PS_CONFIG

    BOOT --> LOAD
    LOAD --> MASTER
    MASTER --> RUNTIME
    MASTER --> LOGGING
    MASTER --> PATHS

    PATHS --> VALIDATE
    VALIDATE --> MS_CONFIG
    VALIDATE --> PS_CONFIG
    VALIDATE --> POL_CONFIG

    MODELS --> MS_CONFIG
    PROVIDERS --> PS_CONFIG
    POLICIES --> POL_CONFIG

    classDef env fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef config fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef service fill:#e1f5ff,stroke:#01579b,stroke-width:2px

    class ENV,ENV_MASTER,ENV_API env
    class MASTER,RUNTIME,LOGGING,PATHS,MODELS,PROVIDERS,POLICIES config
    class BOOT,LOAD,VALIDATE process
    class MS_CONFIG,PS_CONFIG,POL_CONFIG service
```

## LangGraph Agent Integration

```mermaid
graph TB
    subgraph "LangGraph Agent"
        LG_GRAPH[Compiled LangGraph]
        LG_STATE[LangGraph State]
        LG_NODES[Graph Nodes]
        LG_EDGES[Graph Edges]
    end

    subgraph "Agent Runtime Integration"
        CREATE[createLangGraphAgent]
        AGENT_ID[Generate Agent ID]
        STATE_REF[Create State Ref<br/>Effect.Ref]
        STATS[LangGraph Stats<br/>invocations, timing]
    end

    subgraph "Agent Runtime Service"
        ARS[AgentRuntimeService]
        REGISTRY[Agent Registry<br/>Map of Agents]
        RUNTIME_IF[Runtime Interface<br/>send, getState, subscribe]
    end

    subgraph "AI Services"
        MODEL[ModelService]
        PROVIDER[ProviderService]
        TOOLS[ToolRegistryService]
    end

    LG_GRAPH --> CREATE
    LG_STATE --> CREATE

    CREATE --> AGENT_ID
    CREATE --> STATE_REF
    CREATE --> STATS

    STATE_REF --> REGISTRY
    AGENT_ID --> REGISTRY
    STATS --> STATE_REF

    REGISTRY --> ARS
    RUNTIME_IF --> ARS

    LG_NODES --> MODEL
    LG_NODES --> PROVIDER
    LG_NODES --> TOOLS

    classDef langgraph fill:#e8eaf6,stroke:#283593,stroke-width:2px
    classDef runtime fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef service fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class LG_GRAPH,LG_STATE,LG_NODES,LG_EDGES langgraph
    class CREATE,AGENT_ID,STATE_REF,STATS,ARS,REGISTRY,RUNTIME_IF runtime
    class MODEL,PROVIDER,TOOLS service
```

## Producer Services Architecture

```mermaid
graph TB
    subgraph "Producer Services"
        CHAT[ChatService]
        EMB[EmbeddingService]
        IMG[ImageService]
        OBJ[ObjectService]
        TXT[TextService]
        TRANS[TranscriptionService]
    end

    subgraph "Shared Dependencies"
        MODEL[ModelService<br/>Model Selection]
        PROVIDER[ProviderService<br/>Provider Clients]
        CONFIG[ConfigurationService<br/>Config Loading]
    end

    subgraph "Common Pattern"
        INPUT[Input Validation]
        STATE[Internal State<br/>Effect.Ref]
        METRICS[Metrics Tracking]
        EXEC[Execute via Provider]
        RESULT[Result Formatting]
    end

    subgraph "AI Provider APIs"
        ANTHROPIC[Anthropic API]
        OPENAI[OpenAI API]
        GROQ[Groq API]
        GOOGLE[Google API]
        OTHERS[Other Providers]
    end

    CHAT --> INPUT
    EMB --> INPUT
    IMG --> INPUT
    OBJ --> INPUT
    TXT --> INPUT
    TRANS --> INPUT

    INPUT --> MODEL
    INPUT --> PROVIDER
    INPUT --> CONFIG

    MODEL --> EXEC
    PROVIDER --> EXEC

    EXEC --> ANTHROPIC
    EXEC --> OPENAI
    EXEC --> GROQ
    EXEC --> GOOGLE
    EXEC --> OTHERS

    EXEC --> STATE
    EXEC --> METRICS
    EXEC --> RESULT

    classDef producer fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef shared fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef pattern fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef api fill:#e0f2f1,stroke:#004d40,stroke-width:2px

    class CHAT,EMB,IMG,OBJ,TXT,TRANS producer
    class MODEL,PROVIDER,CONFIG shared
    class INPUT,STATE,METRICS,EXEC,RESULT pattern
    class ANTHROPIC,OPENAI,GROQ,GOOGLE,OTHERS api
```

## Key Architectural Principles

### 1. Service Self-Configuration
Each service loads its own configuration via `ConfigurationService` and `bootstrap()`, eliminating circular dependencies.

### 2. Effect.Service Pattern
All services use the `Effect.Service` class pattern for dependency injection with automatic layer management.

### 3. Functional Design
Built on Effect-TS for composable, type-safe asynchronous operations with comprehensive error handling.

### 4. Agent-Centric Runtime
Designed for managing multi-capability AI agents with stateful execution and type-safe state management via `Effect.Ref`.

### 5. Resilience by Design
Built-in circuit breakers, retries, and fallback strategies for robust error handling and recovery.

### 6. Configuration-Driven
Schema-validated configuration files for models, providers, and policies with environment-specific support.

## Technology Stack

- **Runtime:** Bun & Node.js
- **Language:** TypeScript 5.8+
- **Effect System:** Effect-TS 3.16+
- **AI SDK:** Vercel AI SDK
- **Testing:** Vitest
- **Linting:** Biome
- **Platform:** @effect/platform (cross-platform abstractions)
