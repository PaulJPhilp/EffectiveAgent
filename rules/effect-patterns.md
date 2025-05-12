# Backend Effect-TS Patterns

*   **Core:** Use Effect-TS v3.14+ for all asynchronous, concurrent, and potentially fallible operations.
*   **Service Definition (`make + typeof make`):**
    *   Define service implementation logic within a `make` function in `live.ts`.
    *   Prefer **synchronous `make` functions** that accept dependencies (like `Clock`, `FileSystem`, other services via their interface type) as arguments.
    *   If construction is inherently effectful (e.g., requires initializing state with `Ref.make`), define `make` as an `Effect`.
    *   Define the service `Tag` in `types.ts` using `Context.GenericTag<ServiceApiType>(...)`.
    *   Export the inferred service type in `types.ts` using `export type ServiceNameApi = ReturnType<typeof make>` (for sync `make`) or `export type ServiceNameApi = Effect.Effect.Success<typeof make>` (for effectful `make`).
    *   Define the service `Layer` in `live.ts`.
        *   For sync `make` with injected dependencies: Use `Layer.effect(ServiceTag, Effect.map(DependencyTag, (dep) => make(dep)))` or similar composition to resolve dependencies from context and pass them to `make`. The layer requires the dependencies (`RIn`).
        *   For effectful `make`: Use `Layer.effect(ServiceTag, make)`. The layer requires the dependencies (`RIn`) needed by the `make` effect.
*   **Control Flow:**
    *   Prefer `.pipe()` with Effect operators (`Effect.flatMap`, `Effect.map`, `Effect.mapError`, `Effect.catchTag`, etc.) for chaining operations, as it often has better type inference than `Effect.gen`.
    *   Use `Effect.gen` for complex sequences where it significantly improves readability, but be mindful of potential type inference issues.
    *   Use `yield* ServiceTag` directly within `Effect.gen`. **Avoid** the underscore adapter pattern.
*   **Error Handling:**
    *   Use `Data.TaggedError` for all custom errors. Define errors in `errors.ts`.
    *   Use `Effect.fail` to raise errors.
    *   Handle errors explicitly using `Effect.catchTag`, `Effect.catchTags`, `Effect.catchAll`, `Effect.mapError`. Use `Effect.tapError` or `Effect.tapErrorCause` for logging errors without altering the flow.
    *   Preserve original error context using the `cause` property in custom errors where appropriate (usually for generic `DbError` or `ConfigError`).
    *   Use `Effect.exit` and `Exit.isFailure`/`Cause.failureOption` in tests to inspect failure causes.
*   **Option Handling:** Use `Option.match` (often within `Effect.flatMap`) or `Effect.map(Option.map(...))` / `Effect.flatMap(Option.flatMap(...))` patterns.
*   **Dependency Injection:** Use `Layer` for defining service implementations and their dependencies. Compose layers using `Layer.provide` (for direct dependency -> consumer relationships) and `Layer.merge` (for combining parallel services). Provide the final composed layer using `Effect.provide`.
*   **Configuration:**
    *   Use the `Config` module (`effect/Config`) for runtime configuration from environment variables (e.g., API keys, simple paths). Define layers providing config data using `Layer.effect(ConfigTag, Effect.config(configDef))`.
    *   Use the `EntityLoaderApi` service for loading structured domain configuration files (JSON). Define layers providing config data (e.g., `PromptConfigLiveLayer`) within the service's `live.ts`, using `Layer.effect` that depends on `EntityLoaderApi`.
*   **State Management:** Use `Ref` for managing shared mutable state within service implementations (e.g., in-memory repository store).
*   **Resource Management:** Use `Effect.acquireRelease` or `Scope` when managing resources requiring explicit cleanup (less common with platform services). `Layer.build` uses `Scope` implicitly.
*   **Logging:** Use the `LoggingApi` service facade.
*   **Platform Services:** Use services provided by `@effect/platform-bun` (e.g., `BunContext.layer` providing `FileSystem`, `Clock`, `HttpClient`). Inject these services into `make` functions via Layers; avoid making API methods require platform services directly. Use `Clock.currentTimeMillis`.
