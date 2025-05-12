# Backend Architecture Rules

*   **Framework:** EffectiveAgent Backend Services.
*   **Core Pattern:** Service-oriented architecture using Effect-TS Layers for dependency management.
*   **Service Categories:** Organize services under top-level directories: `core`, `ai`, `capabilities`, `execution`, `memory`. Use singular, descriptive names (e.g., `core/file`, not `core/storage/file`).
*   **Standard Service Structure:** Each service module (`src/services/{category}/{serviceName}/`) should contain:
    *   `live.ts`: Contains the `make` function(s) defining service implementation(s) and the corresponding `Layer` definition(s) (e.g., `ServiceNameApiLiveLayer`, `ServiceNameConfigLiveLayer` if config is loaded here).
    *   `types.ts`: Defines service `Context.Tag`s (e.g., `ServiceNameApi`, `ServiceNameConfigData`) and exports inferred service/data types using `ReturnType`/`Effect.Success`. Defines supporting TS types/interfaces for the service API. Service API methods should generally have `R = never` where possible, encapsulating dependencies.
    *   `errors.ts`: Defines service-specific tagged errors using `Data.TaggedError`.
    *   `schema.ts`: Defines Effect Schemas for domain configuration files (`XxxConfigFileSchema`) and core data entities (`XxxEntitySchema`, often extending `BaseEntitySchema`). Exports inferred types from schemas (e.g., `XxxEntity`, `XxxEntityData`).
    *   `docs/`: Contains `PRD.md` and `Architecture.md`.
    *   `__tests__/`: Contains Vitest test files (`live.test.ts`).
    *   `index.ts`: Barrel file exporting the public API (Tags, Layers, key types/errors/schemas).
*   **Naming Conventions:**
    *   Service Tags: `ServiceNameApi` (e.g., `PromptApi`, `FileApi`). For config data Tags: `ServiceNameConfig` (e.g., `PromptConfig`).
    *   Inferred Service API Types: `ServiceNameApi` (e.g., `PromptApi`). For config data types: `ServiceNameConfigData` (e.g., `PromptConfigData`).
    *   Schema Definitions: `XxxEntitySchema`, `XxxConfigFileSchema`. Inferred Types: `XxxEntity`, `XxxEntityData`, `XxxConfigFile`. Global base: `BaseEntitySchema`.
    *   Implementation Factory: `make`.
    *   Layers: `ServiceNameApiLiveLayer`, `ServiceNameConfigLiveLayer`.
    *   Files: `live.ts`, `types.ts`, `errors.ts`, `schema.ts`, `index.ts`. Use kebab-case for multi-word service names only if necessary, prefer single descriptive names (e.g., `file`, `prompt`).
    *   Contractions: Use `Config`, `Db`, `Impl`, `Def` where appropriate and clear.
