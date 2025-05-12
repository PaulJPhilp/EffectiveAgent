# Component Diagram

This diagram zooms into the "Agent Runtime Application" Container and shows the main internal components and their interactions.

```mermaid
C4Component
  title Component diagram for Agent Runtime Application

  actor "User / Client Application" as User

  system_ext "AI Model Provider" as AIProvider
  system_ext "Configuration Service" as ConfigService
  system_ext "File System / Data Source" as DataSource

  Container_Boundary(c1, "Agent Runtime Application") {
    Component(api, "API Layer", "Node.js/HTTP", "Receives user requests and routes them to the appropriate agent pipeline.")
    Component(engine, "Framework Pipeline Engine", "LangGraph/TypeScript", "Orchestrates the execution of agent graphs/pipelines.")
    Component(definitions, "Agent Pipeline Definitions", "TypeScript", "Contains the specific graph structures and node logic for various agents.")
    Component(ai_service, "AI Service", "TypeScript/Vercel AI SDK", "Manages interactions with external AI Model Providers.")
    Component(capabilities_service, "Capabilities Service", "TypeScript/pdf-parse", "Provides tools and functions for agents (e.g., PDF parsing, data lookup).")
    Component(core_services, "Core Services", "TypeScript", "Shared business logic and foundational services.")
    Component(config_loader, "Configuration Loader", "TypeScript/dotenv", "Loads application configuration.")

    Rel(api, engine, "Routes requests to")
    Rel(engine, definitions, "Loads and executes")
    Rel(engine, core_services, "Uses")
    Rel(engine, ai_service, "Uses for LLM steps")
    Rel(engine, capabilities_service, "Uses for agent tools")

    Rel(ai_service, AIProvider, "Interacts with", "API Calls")
    Rel(capabilities_service, DataSource, "Reads/Writes data from/to")

    Rel(config_loader, ConfigService, "Reads from")
    Rel(api, config_loader, "Uses configuration from", $dashed = true)
    Rel(engine, config_loader, "Uses configuration from", $dashed = true)
    Rel(ai_service, config_loader, "Uses configuration from", $dashed = true)
    Rel(capabilities_service, config_loader, "Uses configuration from", $dashed = true)
    Rel(core_services, config_loader, "Uses configuration from", $dashed = true)

  }


  Rel(User, api, "Sends Requests to", "API (e.g., HTTP)")

  UpdateRelStyle(User, api, $textColor="black", $lineColor="black")
  UpdateRelStyle(ai_service, AIProvider, $textColor="black", $lineColor="black")
  UpdateRelStyle(capabilities_service, DataSource, $textColor="black", $lineColor="black")
  UpdateRelStyle(config_loader, ConfigService, $textColor="black", $lineColor="black")


```

This diagram provides a Level 3 view according to the C4 model, showing the primary components within the Agent Runtime Application container. 