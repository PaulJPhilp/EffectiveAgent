# Backend Testing Rules

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
