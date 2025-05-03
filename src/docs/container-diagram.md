# Container Diagram

This diagram zooms into the "EffectiveAgent Framework" System and shows the main containers within it.

```mermaid
C4Container
  title Container diagram for EffectiveAgent Framework

  actor Developer
  actor "User / Client Application" as User

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

  System_Boundary(c1, "EffectiveAgent Framework") {
    Container(app, "Agent Runtime Application", "Node.js, TypeScript", "The core application hosting LangGraph agents, providing APIs, and orchestrating tasks. Includes framework logic and services.")
  }

  Rel(Developer, app, "Develops & Configures code within")
  Rel(Developer, VCS, "Uses")

  Rel(User, app, "Interacts with", "API (e.g., HTTP)") // Assuming an API interface

  Rel(app, AIProvider, "Makes API calls to", "Vercel AI SDK")
  Rel(app, ConfigService, "Reads configuration from", "dotenv / file system")
  Rel(app, DataSource, "Reads/Writes data", "File System API / pdf-parse")

  UpdateRelStyle(Developer, app, $textColor="black", $lineColor="black", $offsetX="-100")
  UpdateRelStyle(User, app, $textColor="black", $lineColor="black", $offsetY="-10")
  UpdateRelStyle(app, AIProvider, $textColor="black", $lineColor="black", $offsetY="-50", $offsetX="-50")
  UpdateRelStyle(app, ConfigService, $textColor="black", $lineColor="black")
  UpdateRelStyle(app, DataSource, $textColor="black", $lineColor="black", $offsetY="50")


```

This diagram provides a Level 2 view according to the C4 model, showing the primary container within the system boundary. 