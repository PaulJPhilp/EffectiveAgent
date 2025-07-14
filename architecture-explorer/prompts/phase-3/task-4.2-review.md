# Task 4.2: Tag-Based Filtering (Review)

**Goal:**

Verify that the agent has successfully implemented a tag-based filtering system that dynamically updates the rendered diagram.

**Verification Steps:**

1.  **Check for New Component:**
    *   Confirm that the file `apps/architecture-explorer/src/FilterControls.tsx` exists and renders a list of checkboxes for all available tags.
2.  **Review App Component:**
    *   Open `src/App.tsx`. It should now manage the state of active filters.
    *   It should contain logic to regenerate the Mermaid diagram definition based on the active filters.
3.  **Run the Application:**
    *   Navigate to the `apps/architecture-explorer` directory in your terminal.
    *   Run the command: `bun run dev`.
4.  **Validate in Browser:**
    *   Open the local development URL in your browser.
    *   You should see the filter controls (checkboxes) rendered on the page, with all of them checked by default.
    *   Uncheck one of the tags (e.g., the "sample" tag).
    *   The diagram should immediately re-render, and the `SampleComponent` node (and any edges connected to it) should disappear from the view.
