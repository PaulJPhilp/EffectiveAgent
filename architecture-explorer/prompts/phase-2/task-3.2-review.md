# Task 3.2: Mermaid.js Integration & Diagram Rendering (Review)

**Goal:**

Verify that the agent has successfully integrated Mermaid.js and that the application can render a diagram.

**Verification Steps:**

1.  **Check Dependencies and Files:**
    *   Confirm that `ajv` has been added to `apps/architecture-explorer/package.json`.
    *   Verify that `architecture.json` and `architecture.schema.json` are present in the `public` directory.
2.  **Review Data Loading and Validation Logic:**
    *   Open `src/App.tsx`. It should contain a `useEffect` hook to fetch the JSON files.
    *   Verify that it uses `ajv` to validate the data against the schema.
    *   Confirm there is error handling logic to display a message if validation fails.
3.  **Review Rendering Logic:**
    *   Open `src/DiagramCanvas.tsx`. Ensure it correctly renders a diagram from a `mermaidDefinition` prop.
    *   In `App.tsx`, confirm that `DiagramCanvas` is only rendered *after* the data has been successfully loaded and validated.
    *   The `mermaidDefinition` passed to the component must come from the loaded `architecture.json` file, not a hardcoded string.
4.  **Run and Validate:**
    *   Run the app with `bun run dev`.
    *   The browser should display the diagram defined in your `architecture.json` file. To test the failure case, temporarily invalidate `architecture.json` and confirm an error message is shown instead of the diagram.
