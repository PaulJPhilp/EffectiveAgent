# EffectiveAgent Project Rules & Conventions (Updated 2024-07-29)

## Meta / AI Collaboration Rules (`/rules/meta/ai-collaboration.md`)

*   Always verify information before presenting it. Do not make assumptions or speculate without clear evidence.
*   Make changes file by file and give the user a chance to spot mistakes, unless specifically asked to provide multiple files.
*   Acknowledge mistakes when they occur to facilitate collaborative correction. Avoid excessive apologies.
*   Avoid giving feedback about understanding in comments or documentation (e.g., avoid "As you know...", "Clearly...").
*   Do not suggest whitespace changes unless specifically requested or part of automated formatting.
*   Do not summarize changes made unless specifically requested.
*   Do not invent changes other than what's explicitly requested.
*   Do not ask for confirmation of information already provided in the current context unless ambiguity exists.
*   Do not remove unrelated code or functionalities. Pay attention to preserving existing structures.
*   Provide all edits for a single file request in a single code block. Ensure the *entire* file content is provided when requested.
*   Do not ask the user to verify implementations that are clearly visible in the provided context.
*   Do not suggest updates or changes to files when there are no actual modifications needed based on the request.
*   *(AI Limitation)* Cannot provide links to real local files. Refer to files by their project path (e.g., `/src/services/core/loader/live.ts`).
*   Do not show or discuss the previous implementation unless specifically requested or necessary to explain a change.
*   Check the provided context (previous messages, files) for current implementations and decisions before suggesting changes or asking questions.

## Global Coding Style (`/rules/global/coding-style.md`)

*   **Language:** Use English for all code, comments, and documentation.
*   **Formatting:** Adhere to project formatting standards (enforced by Biome/Prettier). Do not leave unnecessary blank lines within functions. Use Prettier defaults (printWidth: 80).
*   **Readability:** Prioritize clear, maintainable, and human-readable code.
*   **Naming Conventions:**
    *   Use camelCase for variables, functions, and methods.
    *   Use UPPER_CASE for environment variables and true constants.
    *   Use descriptive names that reveal purpose and usage. Use complete words where possible.
    *   Use verbs for boolean variables (e.g., `isLoading`, `hasError`, `canDelete`).
    *   Avoid abbreviations unless universally understood (e.g., API, URL, Id) or standard loop/callback variables (i, j, err, ctx, req, res).
*   **Constants:** Replace hard-coded "magic" values with named constants. Define constants at the top of the file or in dedicated files (e.g., `CONFIG_FILENAME` in `live.ts` for config layers).
*   **Functions & Logic:**
    *   Keep functions short and focused on a single purpose (aim for < 20 lines where practical).
    *   Name functions with a verb indicating their action (e.g., `getUser`, `calculateTotal`, `renderPrompt`). Boolean functions use `isX`, `hasX`, `canX`. Void functions use `executeX`, `saveX`.
    *   Avoid deeply nested blocks; use early returns and extract logic into helper functions or `.pipe()` chains.
    *   Use Effect operators (`Effect.map`, `Effect.flatMap`, etc.) and higher-order functions where they simplify logic.
    *   Use arrow functions for simple callbacks/inline functions (< 3 instructions); use named `function` declarations otherwise.
    *   Use default parameter values where appropriate instead of null/undefined checks within the function body.
    *   Reduce numerous function parameters by using a single input object (Receive Object, Return Object - RO-RO). Declare types for input/output objects.
    *   Maintain a single level of abstraction within a function.
*   **Data Handling:**
    *   Prefer immutability: Use `readonly` for properties, `ReadonlyArray`, `Readonly<Record<...>>`. Use `as const` for constant literals.
    *   Encapsulate data within appropriate types/objects; avoid overusing primitive types (`string`, `number`). Use defined types like `EntityId`, `Timestamp`.
*   **Comments:**
    *   Write code that is as self-documenting as possible.
    *   Use comments primarily to explain *why* something is done a certain way, not *what* it does (especially for complex logic or workarounds).
    *   Use JSDoc for public APIs (exported functions, classes, types, layers).
*   **Principles:** Follow DRY and SOLID principles. Prefer composition over inheritance.
*   **Modularity:** Design for modularity to improve maintainability and reusability.
*   **Error Handling (General):** Implement robust error handling using Effect's error channel. Use specific, typed errors. Handle potential edge cases.
*   **Security:** Always consider security implications.
*   **Performance:** Consider performance implications where relevant.
*   **Version Control:** Write clear commit messages (e.g., using conventional commits `feat:`, `fix:`, `refactor:`, `test:`, `docs:`), make small/focused commits, use meaningful branch names.

## Global TypeScript Rules (`/rules/global/typescript.md`)

*   **Type Safety:**
    *   Always declare explicit types for variables, function parameters, and function return values where inference is not obvious or sufficient.
    *   Avoid using `any`. Prefer `unknown` when the type is truly unknown and perform necessary checks or use schema parsing.
    *   Enable and adhere to `strict` mode in `tsconfig.json`.
*   **Types vs. Interfaces:**
    *   Use `type` aliases for defining function signatures, union types, intersection types, mapped types, and object shapes.
    *   Use `type Name = Schema.Schema.Type<typeof NameSchema>` to derive types from Effect Schemas.
    *   Use `type ServiceNameApi = ReturnType<typeof make>` (for sync `make`) or `type ServiceNameApi = Effect.Effect.Success<typeof make>` (for effectful `make`) to derive service API types.
    *   Use `interface` primarily for defining the shape of base data objects (like `BaseEntity`) where declaration merging might be conceptually useful, but `type` is generally preferred.
*   **Enums & Namespaces:**
    *   **Avoid `enum`**. Use string literal unions or `as const` objects.
    *   **Avoid `namespace`**. Use standard ES Modules (`import`/`export`).
*   **Immutability:** Use `readonly` modifier for immutable properties in types/interfaces and `ReadonlyArray<T>` / `Readonly<Record<K, V>>` for collections.
*   **Type Guards:** Use type guards (`Option.isSome`, `Exit.isFailure`, `instanceof`, `Schema.is`) for runtime type checking and narrowing.
*   **Null Checking:** Leverage strict null checks. Use `Option` from Effect for optional values.
*   **Type Assertions:** **Strongly avoid** type assertions (`as Type`, `as unknown as Type`). Use them only as a **last resort** for known limitations (e.g., complex generic inference in test helpers, documented library issues). Document the reason clearly when used. The test helper pattern `as Effect.Effect<..., never, never>` is currently accepted due to persistent inference issues with `Effect.provide` on complex layers.
*   **Exports:** Prefer one logical primary export per file (e.g., the service layer, the main schema). Export related types/errors/schemas from the same file. Use barrel files (`index.ts`) per service module for organizing public exports.
*   **Version Compatibility:** Ensure code is compatible with the project's specified TypeScript version (e.g., v5.x features).
*   **Path Aliases:** Use defined path aliases (`@services/`, `@core/`, etc.) for imports.

## Backend Architecture Rules (`/rules/architecture.md`)

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

## Backend Effect-TS Patterns (`/rules/effect-patterns.md`)

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

## Backend Testing Rules (`/rules/testing.md`)

*   **Framework:** Use **Vitest** as the test runner. Use standard Vitest functions (`describe`, `it`, `expect`).
*   **Execution:** Run Effect tests using `await Effect.runPromise(...)` or `await Effect.runPromiseExit(...)`.
*   **Live Services First:** Prioritize testing against **live service implementations**.
    *   Use live `LoggingApiLiveLayer`.
    *   Use live `EntityLoaderApiLiveLayer` (providing `BunContext.layer` as its dependency). Test loading by creating temporary config files in `beforeAll`/`afterAll`.
    *   Use live `RepositoryApi` implementations (start with in-memory implementation built directly in tests using `Layer.effect` and the repository's `make` function).
    *   Use live `PromptApiLiveLayer` (providing the live `PromptConfigLiveLayer` and its dependencies).
    *   Use live `SkillApiLiveLayer` (providing live config layers, `PromptApi`, logging, `BunContext` for HttpClient, and live `@effect/ai-*` provider layers). Requires network access and API keys.
*   **Minimal Mocking:** Avoid mocking. If absolutely necessary for isolating complex logic or specific error paths:
    *   Prefer mocking only the immediate dependency using `Layer.succeed(Tag, mockImplementation)`.
*   **Layer Composition in Tests:**
    *   Define layers for dependencies (e.g., in-memory repo, platform context) directly within the test file or suite setup.
    *   Compose the final layer needed for the test using `Layer.provide` to inject dependencies into the layer under test (e.g., `Layer.provide(testRepoLayer, FileApiLiveLayer)`).
    *   Use helper functions (`runTest`, `runFailTest`) that accept the test `Effect` (requiring the service under test, e.g., `FileApi`) and provide the final composed layer.
    *   **Use type assertions** (`as Effect.Effect<..., never, never>`) within the helper functions on the result of `Effect.provide` as a pragmatic workaround for persistent TypeScript inference issues with complex layer compositions.
    *   Alternatively, use the `Layer.build` pattern (`Effect.scoped(Layer.build(composedLayer)).pipe(Effect.flatMap(context => Effect.provide(testEffect, context)))`) which can be more robust for complex scenarios or when resource scoping is critical, though it may require slightly different helper structures.
*   **Test Structure:** Follow Arrange-Act-Assert. Group tests using `describe`. Use descriptive names for `it` blocks.
*   **Error Testing:** Use `Effect.runPromiseExit`, `Exit.isFailure`, and `Cause.failureOption` to safely assert specific failure tags (`expect(failure.value._tag).toBe(...)`) and properties.
*   **Setup/Teardown:** Use `beforeAll`/`afterAll` for setting up test conditions (e.g., creating temp files/directories using `node:fs/promises`) and cleaning up afterwards.
