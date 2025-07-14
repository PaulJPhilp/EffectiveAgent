# Task 3.3: Data Loading & Initial Visualization (Implementation)

**Goal:**

Load the `architecture.json` data file into the React application and use it to render the first real architectural diagram.

**Instructions:**

1.  **Place Data File:** Ensure the `architecture.json` file (generated in Phase 1) is located in the `apps/architecture-explorer/public` directory. This makes it available to be fetched by the application.
2.  **Implement Data Loading:**
    *   In `src/App.tsx`, use a `useEffect` hook to fetch the `architecture.json` file when the component mounts.
    *   Parse the JSON response.
3.  **Manage State:**
    *   Use a `useState` hook to store the loaded `ArchitectureData` object.
    *   Add basic loading and error state handling (e.g., display a "Loading..." message).
4.  **Render the Diagram:**
    *   Once the data is loaded, pass the Mermaid diagram string from the `diagrams` array in your data to the `DiagramCanvas` component.
    *   For now, you can just render the first diagram in the array (`architectureData.diagrams[0].definition`).
