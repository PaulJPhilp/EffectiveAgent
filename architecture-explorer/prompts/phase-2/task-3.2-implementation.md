# Task 3.2: Mermaid.js Integration & Diagram Rendering (Implementation)

**Goal:**

Integrate Mermaid.js into the React application and create a component that can render a Mermaid diagram from a string.

**Instructions:**

1.  **Prepare Data Files:**
    *   Copy `architecture.json` (from the generator's output) and `architecture.schema.json` into the `apps/architecture-explorer/public` directory. This makes them available to be fetched by the browser.
2.  **Install Validator:**
    *   Navigate to `apps/architecture-explorer` and install `ajv`: `bun add ajv`.
3.  **Implement Data Loading and Validation:**
    *   In `src/App.tsx`, use a `useEffect` hook to fetch both `architecture.json` and `architecture.schema.json`.
    *   Once fetched, use `ajv` to validate the `architecture.json` data against the schema.
    *   If validation fails, render an error message to the user. Do not proceed to the rendering step.
    *   If validation succeeds, store the validated `ArchitectureData` object in a state variable (e.g., `useState<ArchitectureData | null>(null)`).
4.  **Create Diagram Component:**
    *   Create a new component file at `apps/architecture-explorer/src/DiagramCanvas.tsx`.
    *   This component should accept a single prop: `mermaidDefinition: string`.
    *   Implement the rendering logic using a `useEffect` hook that runs `mermaid.render()` and injects the resulting SVG into a `div`.
5.  **Update App Component to Render Loaded Diagram:**
    *   In `src/App.tsx`, conditionally render the `DiagramCanvas` component only when the architectural data has been loaded and validated successfully.
    *   Find the default diagram from the `diagrams` array in your data and pass its `mermaidDefinition` string to the `DiagramCanvas` component.
