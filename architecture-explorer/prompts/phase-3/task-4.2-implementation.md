# Task 4.2: Tag-Based Filtering (Implementation)

**Goal:**

Implement a filtering mechanism that allows users to show or hide nodes on the diagram based on their tags.

**Instructions:**

1.  **Create Filter Component:** Create a new component file at `apps/architecture-explorer/src/FilterControls.tsx`.
    *   This component should first collect all unique tags from the full set of `NodeData`.
    *   It should then render a list of checkboxes, one for each unique tag.
    *   The component should accept the current set of active filters and an `onFilterChange` callback as props.
2.  **Manage Filter State:**
    *   In `src/App.tsx`, add a `useState` hook to manage the set of active tag filters. Initially, all tags should be active.
    *   Render the `FilterControls` component and pass it the necessary state and callbacks.
3.  **Dynamically Generate Diagram:**
    *   Create a new utility function that takes the full `ArchitectureData` and the active filters as input.
    *   This function should generate a new Mermaid diagram definition string. It should only include nodes that have at least one of the active tags, and it should only include edges where both the source and target nodes are visible.
4.  **Update Diagram Rendering:**
    *   In `src/App.tsx`, call this new utility function whenever the filters change.
    *   Pass the newly generated diagram string to the `DiagramCanvas` component. The diagram should re-render automatically to reflect the new set of visible nodes and edges.
