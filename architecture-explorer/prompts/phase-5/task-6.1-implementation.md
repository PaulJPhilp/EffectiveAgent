# Task 6.1: Unit & Integration Tests (Implementation)

**Goal:**

Add a suite of tests to the data generator to ensure its different modules are working correctly and to prevent regressions.

**Instructions:**

1.  **Set Up Testing Framework:**
    *   Add `vitest` to the `devDependencies` of the `@architecture-explorer/generator` package.
    *   Create a `vitest.config.ts` file in the `packages/architecture-generator` directory.
    *   Add a `test` script to the `package.json`: `"test": "vitest"`.
2.  **Write Unit Tests:**
    *   Create test files for individual modules, for example `src/JSDocParser.test.ts`.
    *   Write unit tests for the pure functions in your modules. For example, test the `JSDocParser` by passing it a mock `ClassDeclaration` object (or a string of code to parse) and asserting that the returned metadata object is correct.
3.  **Write Integration Tests:**
    *   Create an integration test file, for example `src/index.test.ts`.
    *   Write a test that runs the entire generation pipeline on the `test-data` directory.
    *   Instead of writing a JSON file to disk, have the test capture the final `ArchitectureData` object.
    *   Use `vitest`'s snapshot testing feature to compare the generated object against a stored snapshot. This makes it easy to see if the output structure changes unexpectedly in the future.
