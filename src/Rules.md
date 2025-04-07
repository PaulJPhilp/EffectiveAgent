# EffectiveAgent Project Rules & Conventions

## Meta / AI Collaboration Rules (`/rules/meta/ai-collaboration.md`)

*   Always verify information before presenting it. Do not make assumptions or speculate without clear evidence.
*   Make changes file by file and give the user a chance to spot mistakes.
*   Never use apologies. *(Self-correction: While aiming for accuracy, acknowledging mistakes when they occur is necessary for collaborative correction)*
*   Avoid giving feedback about understanding in comments or documentation (e.g., avoid "As you know...", "Clearly...").
*   Do not suggest whitespace changes unless specifically requested or part of automated formatting.
*   Do not summarize changes made unless specifically requested.
*   Do not invent changes other than what's explicitly requested.
*   Do not ask for confirmation of information already provided in the current context unless ambiguity exists.
*   Do not remove unrelated code or functionalities. Pay attention to preserving existing structures.
*   Provide all edits for a single file request in a single code block.
*   Do not ask the user to verify implementations that are clearly visible in the provided context.
*   Do not suggest updates or changes to files when there are no actual modifications needed based on the request.
*   *(AI Limitation)* Cannot provide links to real local files. Refer to files by their project path.
*   Do not show or discuss the current implementation unless specifically requested or necessary to explain a change.
*   Check the provided context (previous messages, files) for current implementations and decisions.

## Global Coding Style (`/rules/global/coding-style.md`)

*   **Language:** Use English for all code, comments, and documentation.
*   **Formatting:** Adhere to project formatting standards (enforced by Biome). Do not leave unnecessary blank lines within functions.
*   **Readability:** Prioritize clear, maintainable, and human-readable code.
*   **Naming Conventions:**
    *   Use camelCase for variables, functions, and methods.
    *   Use UPPER_CASE for environment variables and true constants.
    *   Use descriptive names that reveal purpose and usage. Use complete words where possible.
    *   Use verbs for boolean variables (e.g., `isLoading`, `hasError`, `canDelete`).
    *   Avoid abbreviations unless universally understood (e.g., API, URL, Id) or standard loop/callback variables (i, j, err, ctx, req, res).
*   **Constants:** Replace hard-coded "magic" values with named constants. Define constants at the top of the file or in dedicated files.
*   **Functions & Logic:**
    *   Keep functions short and focused on a single purpose (aim for < 20 lines where practical).
    *   Name functions with a verb indicating their action (e.g., `getUser`, `calculateTotal`, `renderPrompt`). Boolean functions use `isX`, `hasX`, `canX`. Void functions use `executeX`, `saveX`.
    *   Avoid deeply nested blocks; use early returns and extract logic into helper functions.
    *   Use higher-order functions (map, filter, etc.) where they simplify logic.
    *   Use arrow functions for simple callbacks/inline functions (< 3 instructions); use named `function` declarations otherwise.
    *   Use default parameter values where appropriate instead of null/undefined checks within the function body.
    *   Reduce numerous function parameters by using a single input object (Receive Object, Return Object - RO-RO). Declare types for input/output objects.
    *   Maintain a single level of abstraction within a function.
*   **Data Handling:**
    *   Prefer immutability: Use `readonly` for properties, `ReadonlyArray`, `Readonly<Record<...>>`. Use `as const` for constant literals.
    *   Encapsulate data within appropriate types/objects; avoid overusing primitive types.
*   **Comments:**
    *   Write code that is as self-documenting as possible.
    *   Use comments primarily to explain *why* something is done a certain way, not *what* it does.
    *   Use JSDoc for public APIs (exported functions, classes, types).
*   **Principles:** Follow DRY and SOLID principles. Prefer composition over inheritance.
*   **Modularity:** Design for modularity to improve maintainability and reusability.
*   **Error Handling (General):** Implement robust error handling. Use specific, typed errors where possible. Handle potential edge cases.
*   **Security:** Always consider security implications.
*   **Performance:** Consider performance implications where relevant.
*   **Version Control:** Write clear commit messages, make small/focused commits, use meaningful branch names.

## Global TypeScript Rules (`/rules/global/typescript.md`)

*   **Type Safety:**
    *   Always declare explicit types for variables, function parameters, and function return values.
    *   Avoid using `any`. Prefer `unknown` when the type is truly unknown and perform necessary checks.
    *   Enable and adhere to `strict` mode in `tsconfig.json`.
*   **Types vs. Interfaces:**
    *   Use `type` aliases for defining function signatures, union types, intersection types, mapped types, and simple object shapes.
    *   Use `type Name = z.infer<typeof NameSchema>` to derive types from Zod schemas.
    *   Use `type ServiceNameApi = Context.Tag.Service<typeof ServiceNameApi>` for inferred service types with the `make` pattern.
    *   `interface` may be used for defining the structure of base data objects if preferred (e.g., `BaseEntity`), but `type` is generally sufficient.
*   **Enums & Namespaces:**
    *   **Avoid `enum`**. Use string literal unions (e.g., `type Role = "admin" | "user"`) or `as const` objects (e.g., `const Status = { Active: "active", Inactive: "inactive" } as const; type Status = typeof Status[keyof typeof Status];`) instead.
    *   **Avoid `namespace`**. Use standard ES Modules (`import`/`export`) for code organization.
*   **Immutability:** Use `readonly` modifier for immutable properties in types/interfaces and `ReadonlyArray<T>` / `Readonly<Record<K, V>>` for collections.
*   **Type Guards:** Use type guards (like `Option.isSome`, `Exit.isFailure`, `instanceof`) for runtime type checking and narrowing.
*   **Null Checking:** Leverage strict null checks (`strictNullChecks: true` in tsconfig). Use `Option` from Effect where appropriate for optional values.
*   **Type Assertions:** Avoid type assertions (`as Type`, `as unknown as Type`) unless absolutely necessary (e.g., working around known limitations in type inference with generics). Document the reason when used. **Specifically avoid `as unknown as UnrelatedType`.**
*   **Exports:** Prefer one logical primary export per file (e.g., the service layer, the main schema), though exporting related types/errors from the same file is acceptable. Use barrel files (`index.ts`) per service module for organizing public exports.
*   **Version Compatibility:** Ensure code is compatible with the project's specified TypeScript version (e.g., v5.x features).

## Backend Architecture Rules (`/rules/architecture.md`)

*   **Framework:** EffectiveAgent Backend Services.
*   **Core Pattern:** Shared services architecture. Do not make changes to shared services without careful consideration of cross-cutting impact.
*   **Service Categories:** Organize services under top-level directories: `core`, `ai`, `capabilities`, `execution`, `memory`.
*   **Standard Service Structure:** Each service module (`src/services/{category}/{serviceName}/`) should contain:
    *   `live.ts`: Contains the `make` object/effect defining the main service implementation and the `ServiceNameApiLiveLayer`.
    *   `configuration.ts`: Contains the `make` object/effect defining the configuration service implementation (if needed) and the `ServiceNameConfigLiveLayer`. Loads domain-specific config (e.g., `${serviceName}.json`) using `EntityLoaderApi`.
    *   `types.ts`: Defines service `Context.Tag`s (`ServiceNameApi`, `ServiceNameConfig`) and exports inferred service types using `Context.Tag.Service<...>`. Defines supporting TS types/interfaces for the service API.
    *   `errors.ts`: Defines service-specific tagged errors extending `AppError`.
    *   `schema.ts`: Defines Zod schemas for domain configuration files (`XxxConfigFileSchema`) and core data definitions (`XxxDefSchema`, often extending `BaseEntitySchema`).
    *   `docs/`: Contains `PRD.md` and `Architecture.md`.
    *   `__tests__/`: Contains Vitest test files (`live.test.ts`, `configuration.test.ts`).
    *   `index.ts`: Barrel file exporting the public API (Tags, Layers, key types/errors/schemas).
*   **Naming Conventions:**
    *   Service Tags/Inferred Types: `ServiceNameApi`, `ServiceNameConfig` (e.g., `PromptApi`, `SkillConfig`).
    *   Schema Definitions: `XxxDefSchema`, `XxxConfigFileSchema`. Inferred Types: `XxxDef`, `XxxConfigFile`. Global base: `BaseEntitySchema`.
    *   Implementation Objects: `make` (within `live.ts` or `configuration.ts`).
    *   Layers: `ServiceNameApiLiveLayer`, `ServiceNameConfigLiveLayer`.
    *   Files: `live.ts`, `configuration.ts`, `types.ts`, `errors.ts`, `schema.ts`, `index.ts`. Use kebab-case for multi-word service names (e.g., `chat-memory`).
    *   Contractions: Use `Config`, `Db`, `Impl`, `Def` where appropriate and clear.

## Backend Effect-TS Patterns (`/rules/effect-patterns.md`)

*   **Core:** Use Effect-TS v3.14 for all asynchronous, concurrent, and potentially fallible operations. Leverage its core features: `Effect`, `Layer`, `Context`, `Cause`, `Exit`, `Option`, `Either`, `Stream`, `Schedule`, `Ref`, `Queue`, `Config`, `Schema`.
*   **Service Definition:** Use the **`make + typeof make`** pattern:
    *   Define service implementation logic within an Effectful `make` constant in `live.ts` or `configuration.ts`.
    *   Define the service `Tag` in `types.ts` using `Context.GenericTag<ServiceNameApi>(...)`.
    *   Export the inferred service type from the implementation file: `export type ServiceNameApiLive = Effect.Effect.Success<typeof make>;` (Optional, Tag is primary).
    *   Define the service `Layer` in the implementation file using `Layer.effect(ServiceTag, make)`.
*   **Control Flow:**
    *   Prefer `Effect.gen` for complex sequences involving multiple `yield*`.
    *   Use `.pipe()` with Effect operators (`Effect.flatMap`, `Effect.map`, `Effect.mapError`, `Effect.catchTag`, etc.) for chaining operations.
    *   **Avoid** using the underscore adapter pattern (`function*(_) { yield* _(Tag); }`). Use `yield* ServiceTag` directly.
*   **Error Handling:**
    *   Use `Data.TaggedError` (or extend `AppError`) for all custom errors. Define errors in `errors.ts`.
    *   Use `Effect.fail` to raise errors; avoid throwing exceptions.
    *   Handle errors explicitly using `Effect.catchTag`, `Effect.catchTags`, `Effect.catchAll`, `Effect.mapError`.
    *   Preserve original error context using the `cause` property in custom errors.
    *   Use `Effect.exit` in tests to inspect failure causes (`Cause.failureOption`).
*   **Option Handling:** When an Effect yields an `Option<A>`, use `.pipe(Effect.flatMap(Option.match({ onNone: () => Effect.fail(...), onSome: (value) => Effect.succeed(value) /* or further effects */ })))` or the direct `option._tag === "Some"` check pattern to handle the cases effectfully.
*   **Dependency Injection:** Use `Layer` for defining service implementations and their dependencies. Compose layers using `Layer.provide` and `Layer.merge`. Provide the final composed layer to `Effect.runPromise` or test effects using `Effect.provide`.
*   **Configuration:** Use the `Config` module (`effect/Config`) for runtime configuration (e.g., API keys from env vars via `Config.secret`). Use the `EntityLoaderApi` service for loading domain configuration files (JSON/YAML).
*   **Concurrency:** Use Effect's concurrency operators (`Effect.forEach` with `{ concurrency: ... }`, Fibers) when needed.
*   **Resource Management:** Use `Effect.acquireRelease` or `Scope` for managing resources that require cleanup (e.g., database connections, file handles if not using platform services).
*   **Logging:** Use the `LoggingApi` service facade. Use `Effect.tap` or `Effect.tapError` for logging within pipelines without altering the main flow. Use `Effect.annotateLogs` to add contextual data.
*   **Platform Services:** Use services provided by `@effect/platform-bun` (e.g., `BunContext.layer` providing `FileSystem`, `Path`, `HttpClient`, `Clock`). Use the `DefaultServices.liveServices` workaround (`Layer.succeedContext`) only if `.layer` exports cannot be resolved due to environment issues. Use `Clock.currentTimeMillis` (as `currentTimeInstant` resolution was problematic).

## Backend Testing Rules (`/rules/testing.md`)

*   **Framework:** Use **Vitest** as the test runner. Use standard Vitest functions (`describe`, `it`, `expect`).
*   **Execution:** Run Effect tests using `await Effect.runPromise(...)` or `await Effect.runPromise(Effect.exit(...))` for error checking.
*   **Live Services First:** Prioritize testing against **live service implementations** where feasible.
    *   Use live `LoggingApiLiveLayer`.
    *   Use live `EntityLoaderApiLiveLayer` with live `ConfigLoaderOptionsLiveLayer` and live platform services (`BunContext.layer` or `DefaultServices` workaround). Test by creating temporary config files in `beforeAll`/`afterAll`.
    *   Use live `RepositoryApi` implementations (start with `InMemoryRepositoryLiveLayer`, add tests for Drizzle layers later).
    *   Use live `PromptApiLiveLayer` (providing live `PromptConfigurationLiveLayer` + deps).
    *   Use live `SkillApiLiveLayer` (providing live config layers, logging, HTTP client, and live `@effect/ai-*` provider layers). Requires network access and API keys (use `.env` and `dotenv` for setup, skip tests if keys missing).
*   **Minimal Mocking:** Avoid mocking services, especially core/platform services.
    *   If mocking is absolutely necessary to isolate complex logic or test specific error paths not easily triggered live:
        *   Prefer mocking only the immediate dependency (e.g., mock `EntityLoaderApi` when testing `PromptConfiguration`).
        *   Use `Layer.succeed(Tag, mockImplementation)` to provide the mock.
        *   Use `vi.spyOn` from Vitest for spying on method calls if needed, rather than full mocks.
*   **Test Structure:** Follow Arrange-Act-Assert. Group tests using `describe`. Use descriptive names for `it` blocks.
*   **Error Testing:** Use `Effect.exit` and `Cause.failureOption` to safely assert specific failure types and properties.
*   **Setup/Teardown:** Use `beforeAll`/`afterAll` (or `beforeEach`/`afterEach`) for setting up test conditions (e.g., creating temp files/directories using `node:fs/promises`) and cleaning up afterwards.

