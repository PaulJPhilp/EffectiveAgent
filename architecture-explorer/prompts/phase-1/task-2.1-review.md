# Task 2.1: `ts-morph` Project & Initial Source Loading (Review)

**Goal:**

Verify that the AI agent has correctly set up the `ts-morph` project, implemented the initial parsing script, and configured the package to run it.

**Verification Steps:**

1.  **Check `package.json`:**
    *   Open `packages/architecture-generator/package.json`.
    *   Confirm that `ts-morph` is listed under `dependencies`.
    *   Verify that the `scripts.generate` value is set to `bun run src/index.ts`.
2.  **Review `index.ts`:**
    *   Open `packages/architecture-generator/src/index.ts`.
    *   Ensure it imports `Project` from `ts-morph`.
    *   Confirm that it creates a `Project`, adds `packages/architecture-generator/test-data/sample.ts`, and attempts to log the number of classes found.
3.  **Execute the Script:**
    *   Navigate to the `packages/architecture-generator` directory in your terminal.
    *   Run the command: `bun run generate`.
4.  **Validate Output:**
    *   Check the console output. It should display a message indicating that it parsed the `sample.ts` file and found exactly **1** class.
