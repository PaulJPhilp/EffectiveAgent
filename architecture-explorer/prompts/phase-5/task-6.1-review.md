# Task 6.1: Unit & Integration Tests (Review)

**Goal:**

Verify that the agent has implemented a solid suite of tests for the data generator.

**Verification Steps:**

1.  **Check Test Configuration:**
    *   Confirm that `vitest` has been added as a dev dependency and that the `test` script exists in `packages/architecture-generator/package.json`.
    *   Check for the presence of `vitest.config.ts`.
2.  **Review Unit Tests:**
    *   Inspect the unit test files (e.g., `JSDocParser.test.ts`). They should have good coverage of the different parsing scenarios, including edge cases and error conditions.
3.  **Review Integration Tests:**
    *   Inspect the integration test file (`index.test.ts`). It should correctly run the full pipeline and use a snapshot to verify the output.
4.  **Run the Tests:**
    *   Navigate to the `packages/architecture-generator` directory.
    *   Run the command: `bun run test`.
5.  **Validate Output:**
    *   All tests should pass.
    *   If it's the first time running, a `__snapshots__` directory should be created with the initial snapshot file. Inspect this file to ensure the captured output is correct.
