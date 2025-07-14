# Task 2.1: `ts-morph` Project & Initial Source Loading (Implementation)

**Goal:**

Your task is to set up the core of the architectural data generator. You will install the `ts-morph` library and create a script that initializes a `ts-morph` project, loads a sample source file, and verifies that it can parse the file's contents.

**Instructions:**

1.  **Install Dependency:** Add `ts-morph` as a dependency to the `@architecture-explorer/generator` package.
2.  **Create Entry Point:** Create a new file at `packages/architecture-generator/src/index.ts`.
3.  **Implement Parsing Logic:** In `src/index.ts`, write a script that performs the following actions:
    *   Imports the `Project` class from the `ts-morph` library.
    *   Creates a new instance of the `Project`.
    *   Adds the source file located at `packages/architecture-generator/test-data/sample.ts` to the project.
    *   To verify that the parsing is successful, retrieve the source file from the project, get all the classes declared within it, and log the file path and the number of classes found to the console.
4.  **Update `package.json`:** Modify the `generate` script in `packages/architecture-generator/package.json` to execute the `src/index.ts` file using `bun run`.
