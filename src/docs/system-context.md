# System Context Diagram

This diagram shows the high-level view of the EffectiveAgent Framework, its users, and the external systems it interacts with.

```mermaid
C4Context
  title System Context Diagram for EffectiveAgent Framework

  actor Developer
  actor "User / Client Application" as User

  system "EffectiveAgent Framework" as Core {
    description "The core framework for building and running AI agents using LangGraph."
  }

  system_ext "AI Model Provider" as AIProvider {
    description "External Large Language Model services (e.g., Google AI, OpenAI) accessed via Vercel AI SDK."
  }
  system_ext "Configuration Service" as ConfigService {
    description "Provides runtime configuration (e.g., API keys, settings) via environment variables or files."
  }
  system_ext "File System / Data Source" as DataSource {
    description "External storage for input data (e.g., PDFs), knowledge bases, or other resources."
  }
  system_ext "Version Control System" as VCS {
      description "Source code management and documentation hosting (e.g., Git, GitHub)."
  }


  Rel(Developer, Core, "Develops & Configures")
  Rel(Developer, VCS, "Uses")

  Rel(User, Core, "Interacts with Agents built by the framework")

  Rel(Core, AIProvider, "Uses", "API Calls (Vercel AI SDK)")
  Rel(Core, ConfigService, "Reads Configuration from")
  Rel(Core, DataSource, "Reads/Writes Data from/to")
```

This diagram provides a Level 1 view according to the C4 model. 