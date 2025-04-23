# Architecture Decision Record: Pipeline Primitive

**Status:** Proposed

**Context:**

We need a standardized, reusable, and developer-friendly way to define and execute common AI workflows (text generation, object generation, chat, embeddings, etc.) within our Effect-based application. Current approaches might involve direct use of provider clients or lower-level services, leading to potential boilerplate and inconsistent configuration.

**Decision:**

We will introduce a new high-level primitive called `Pipeline`. A `Pipeline` represents a configurable "recipe" for a specific AI task. The goal is to improve developer experience (DX), promote reusability, ensure consistent configuration, and align with the Effect ecosystem.

**Core Concepts:**

1.  **`Pipeline`:** The central abstraction. An instance represents a specific AI workflow recipe, potentially partially configured.
2.  **`Pipeline Configuration`:** Pipelines are defined by configuration, likely stored in JSON files (similar to `providers.json`). These configurations specify the provider, model, default parameters (temperature, max retries, etc.), and potentially other settings.
3.  **`PipelineConfigService` (Hypothetical):** A service responsible for loading, validating, and providing access to pipeline configurations.
4.  **Partial Pipelines:** A `Pipeline` can be instantiated in a partially configured state (e.g., provider and model selected, but temperature left variable). These are not directly executable but serve as building blocks.
5.  **Composable Pipelines:** Partial pipelines can potentially be composed or built upon other partial pipelines.
6.  **Executable Pipelines:** A fully configured `Pipeline` where all necessary parameters for execution are defined (either baked in or expected at runtime).
7.  **Standardized Inputs/Outputs:**
    *   **`EffectiveInput`:** The existing builder for constructing the core input payload (messages, parts).
    *   **`EffectiveResponse<TData>`:** A standardized wrapper for successful results, containing common metadata (`model`, `id`, `timestamp`, `usage`) and the specific data payload (`TData`).
    *   **`EffectiveError`:** A standardized wrapper or hierarchy for errors, likely extending `AiError`.

**Key Characteristics:**

*   **Configuration-Driven:** Core behavior (provider, model, parameters) is defined declaratively.
*   **Task Agnostic (Potentially Typed):** The `Pipeline` concept aims to handle various AI tasks. Implementations might involve typed pipelines (e.g., `ObjectPipeline`, `ChatPipeline`) to ensure type safety for task-specific inputs (like schemas) and outputs.
*   **Reusability:** Pre-configured pipelines (recipes) can be shared and reused across the application.
*   **Composability:** Partial pipelines can be used as base configurations for more specific ones.
*   **Immutable Configuration:** Once a parameter is baked into a pipeline instance, it cannot be overridden by the consumer of that instance.
*   **Effect-Based Execution:** An executable pipeline provides a `run` method that takes the remaining inputs (`EffectiveInput`, potentially task-specific options like a schema) and returns an `Effect<EffectiveResponse<TData>, EffectiveError>`. Execution happens within a single Effect fiber.
*   **Dependency Management:** An executable pipeline resolves its dependencies (e.g., the correct `ProviderClient` based on its configuration) when its `run` Effect is executed.

**High-Level Workflow:**

1.  Load a pipeline recipe configuration using `PipelineConfigService`.
2.  Instantiate a `Pipeline` object from the configuration (potentially partially configured).
3.  Optionally, further configure the pipeline instance, creating more specialized partial pipelines.
4.  Obtain an `ExecutablePipeline` instance.
5.  Execute the pipeline: `pipeline.run(input: EffectiveInput, remainingOptions: {...})`. This returns an `Effect`.
6.  Run the `Effect` to get the `EffectiveResponse` or `EffectiveError`.

**Relationship to Other Services:**

*   The `Pipeline`'s `run` Effect will internally utilize lower-level services like `ProviderService`, `ModelService`, and the standardized `ProviderClientApi`.
*   It encapsulates the logic of selecting the correct provider/model and calling the appropriate `ProviderClientApi` method based on its configuration and the task type.

**Phased Implementation Plan:**

1.  **Phase 1: Standardize ProviderClientApi:** Refactor `ProviderClientApi` methods and implementations to accept `EffectiveInput` and return `Effect<EffectiveResponse<TData>, EffectiveError>`. Standardize options objects (potentially using inheritance).
2.  **Phase 2: Evaluate Producer/Streamer Abstraction:** Assess if the intermediate Producer/Streamer abstraction (as previously discussed) adds significant value after Phase 1. This phase might be skipped if the direct path to Pipelines seems clear.
3.  **Phase 3: Implement Pipeline Primitive:**
    *   Design and implement the `Pipeline` object/interface and its builder pattern.
    *   Define the structure for `Pipeline Configuration` (JSON Schema).
    *   Implement `PipelineConfigService`.
    *   Implement the `run` logic and dependency resolution within the pipeline's execution Effect.

This architecture aims to create a powerful, configuration-driven layer for AI interactions, simplifying common tasks and promoting consistency. 