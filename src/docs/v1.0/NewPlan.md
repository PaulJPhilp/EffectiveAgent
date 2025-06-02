

---

## EffectiveAgent: Implementation Plan (SkillApi First - Corrected)

**Goal:** Achieve a working `SkillApi.invokeSkill` capable of executing a simple, configured skill using a real LLM provider via `@effect/ai`, driven by basic Intelligence and Persona configurations.

**Assumptions:**

*   Starting with the fresh, standardized directory structure (with `intelligence` and `persona` under `capabilities`).
*   Using Bun, Effect v3.16, Vitest (standard runner), Temporal (via polyfill types), Drizzle (setup deferred), `@effect/ai` (v0.13.x pattern), LangGraph (deferred), LiquidJS.
*   Testing against live services (using temp files/dirs and real AI calls with API keys) where feasible.
*   Using the `make + typeof make` pattern for service implementations.

---

**Phase 0: Project Setup & Global Definitions (Completed)**

*   **(Done)** Set up project structure (`/rules`, `/src/services/...` including `capabilities/intelligence`, `capabilities/persona`).
*   **(Done)** Configure `package.json`, `tsconfig.json` (with path aliases).
*   **(Done)** Install core dependencies (including `@effect/ai`, `@effect/ai-openai`, etc.).
*   **(Done)** Define global types/errors/schemas (`/src/services/*.ts`).
*   **(Done)** Define project rules (`/rules/...`).
*   **(Done)** Define MRD/PRD/Architecture/Stack docs.

**Phase 1: Core Service Implementation (Minimal Viable)**

*   **Goal:** Implement the essential *non-domain-specific* core services needed.
*   **Steps:**
    1.  **`core/logging`:**
        *   **(Refactor)** Implement `LoggingApi` using `make` in `live.ts`. Update `types.ts`. Verify basic logging.
    2.  **`core/loader` (was `core/configuration`):**
        *   **(Refactor)** Rename directory. Implement `EntityLoaderApi` (`make` in `live.ts`), `ConfigLoaderOptions` provider (`configuration.ts`). Update `types.ts`, `errors.ts`. Test with live `BunContext.layer` and temp files.
    3.  **`core/repository`:**
        *   **(Refactor)** Implement `InMemoryRepositoryLiveLayer` factory in `implementations/in-memory/live.ts` (using `make` internally). Update `types.ts`, `errors.ts`. Test the in-memory implementation.
    4.  **`core/storage/file`:**
        *   **(New/Refactor)** Implement `FileStorageApi` (`make` in `live.ts`, depends on `BunContext`, `FileStorageConfig`). Implement `FileStorageConfig` provider (`configuration.ts`). Define `types.ts`, `errors.ts`, `schema.ts`. Test with live filesystem via `BunContext.layer` and temp files/dirs.
    5.  **`core/attachment`:**
        *   **(New/Refactor)** Implement `AttachmentApi` (`make` in `live.ts`, depends on `RepositoryApi<AttachmentLinkEntity>`). Define `types.ts`, `errors.ts`, `schema.ts`. Write tests using the in-memory repository for links.
    6.  **`core/tag`:**
        *   **(New/Refactor)** Implement `TagApi` (`make` in `live.ts`, depends on `RepositoryApi<TagEntity>`, `RepositoryApi<EntityTagLinkEntity>`). Define `types.ts`, `errors.ts`, `schema.ts`. Write tests using the in-memory repository.

**Phase 2: AI & Capability Primitives Configuration**

*   **Goal:** Implement the services responsible for loading the definitions of our core primitives (Prompt, Intelligence, Persona, Skill).
*   **Steps:**
    1.  **`ai/prompt`:**
        *   **(Refactor)** Implement `PromptConfig` service in `configuration.ts` (using `make`, depends on `EntityLoaderApi`, loads `prompts.json`). Update `types.ts`, `errors.ts`, `schema.ts`. Test with live `EntityLoader`.
    2.  **`capabilities/intelligence`:** *(Moved from core)*
        *   **(New/Refactor)** Implement `IntelligenceConfig` service in `configuration.ts` (using `make`, depends on `EntityLoaderApi`, loads `intelligences.json`). Update `types.ts`, `errors.ts`, `schema.ts`. Test with live `EntityLoader`.
    3.  **`capabilities/persona`:** *(Moved from core)*
        *   **(New/Refactor)** Implement `PersonaConfig` service in `configuration.ts` (using `make`, depends on `EntityLoaderApi`, loads `personas.json`). Update `types.ts`, `errors.ts`, `schema.ts`. Test with live `EntityLoader`.
    4.  **`capabilities/skill`:**
        *   **(New/Refactor)** Implement `SkillConfig` service in `configuration.ts` (using `make`, depends on `EntityLoaderApi`, loads `skills.json`). Update `types.ts`, `errors.ts`, `schema.ts`. Test with live `EntityLoader`.

**Phase 3: Implement & Test Core AI/Capability Services**

*   **Goal:** Implement the main `PromptApi` and `SkillApi` services and test the core `SkillApi.invokeSkill` flow.
*   **Steps:**
    1.  **`ai/prompt`:**
        *   **(Refactor)** Implement `PromptApi` service in `live.ts` (using `make`, depends on `PromptConfig`, uses `liquidjs`). Update `types.ts`. Test `renderString` and `renderTemplate` (providing live `PromptConfigLiveLayer` + deps).
    2.  **`capabilities/skill`:**
        *   **(Refactor)** Implement `SkillApi` service in `live.ts` (using `make`).
            *   Implement `invokeSkill` logic: Get configs (Skill, Intel, Persona), determine model/provider, select `AiModel` factory, prepare prompt (using `PromptApi`), prepare params, call `aiModelProvider.provide(completionsEffect)`, map result/error.
            *   Stub `streamChatCompletion`.
        *   **(Refactor)** Update `types.ts` (ensure `R` signature is correct for `invokeSkill`).
        *   **(New/Run)** Write integration test for `invokeSkill`:
            *   Use `beforeAll` to create temp `skills.json`, `intelligences.json`, `personas.json`, `prompts.json`.
            *   Provide **live** layers: `SkillApiLiveLayer`, `SkillConfigLiveLayer`, `IntelligenceConfigLiveLayer`, `PersonaConfigLiveLayer`, `PromptApiLiveLayer`, `ConfigLoaderApiLiveLayer`, `ConfigLoaderOptionsLiveLayer`, `LoggingApiLiveLayer`, `HttpClient` layer (`BunContext.layer`), and the target `@effect/ai-*` provider layer (e.g., `OpenAI.layer`).
            *   Call `invokeSkill` for a defined skill.
            *   Assert successful execution and basic response format (requires API key/network).

**Phase 4: Agent & Supervisor (Deliverable 2 & 3 - Deferred)**

*   Implement `execution/agent` services.
*   Implement `execution/thread` service (using `SkillApi`).
*   Implement `execution/supervisor` service.

---