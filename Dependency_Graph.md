# Core Services Dependency Graph

This document outlines the dependencies for services located under `src/services/core/`.

## Service Dependencies:

*   **`AttachmentService`**
    *   `RepositoryService`

*   **`AuthService`**
    *   _No external service dependencies identified._

*   **`ConfigurationService`**
    *   `Path` (from `@effect/platform`)
    *   `FileSystem` (from `@effect/platform`)

*   **`ResilienceService`**
    *   _No external service dependencies identified._

*   **`FileService`**
    *   `RepositoryService`

*   **`ServiceHealthMonitoringService`**
    *   _No external service dependencies identified._

## Notes:

*   **`LoaderService`**: Confirmed to not exist.
*   **`LoggerService`**: Information unavailable due to access limitations during analysis. Its dependencies are not included in this graph.
*   Services listed with "_No external service dependencies identified_" may use internal state management (e.g., `Effect.Ref`) but do not appear to `yield*` other `Effect.Service` instances.
*   Platform-specific services like `Path` and `FileSystem` are noted as dependencies where identified.

---
## AI Services Dependency Graph

This document outlines the dependencies for services located under `src/services/ai/`.

### Service Dependencies:

*   **`ModelService`**
    *   `ConfigurationService`

*   **`PolicyService`**
    *   `ConfigurationService`

*   **`PromptService`**
    *   `ConfigurationService`
    *   `ConfigProvider`

*   **`ProviderService`**
    *   `ConfigurationService`

*   **`ToolRegistryService`**
    *   `ConfigurationService`

*   **`ToolService`**
    *   `ToolRegistryService`

### Notes:

*   This list is based on services analyzed in previous steps. Due to current limitations, if other services exist under `src/services/ai/` that were not previously listed and analyzed, they are not included here.

---
## Capabilities Services Dependency Graph

This document outlines the dependencies for services located under `src/services/capabilities/`.

### Service Dependencies:

*   **`IntelligenceService`**
    *   _No external service dependencies identified._

*   **`PersonaService`**
    *   _No external service dependencies identified._

*   **`SkillService`**
    *   _No external service dependencies identified._

### Notes:

*   This list is based on services analyzed in previous steps (`intelligence`, `persona`, `skill`). Due to current limitations, if other services exist under `src/services/capabilities/` that were not previously listed and analyzed, they are not included here.
*   Services listed with "_No external service dependencies identified_" may use internal state management (e.g., `Effect.Ref`) but do not appear to `yield*` other `Effect.Service` instances.
