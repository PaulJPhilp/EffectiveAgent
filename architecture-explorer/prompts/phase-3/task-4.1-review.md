# Task 4.1: Interactive Node Click & Metadata Display (Review)

**Goal:**

Verify that the agent has successfully implemented interactive nodes in the diagram and that clicking a node displays its metadata.

**Verification Steps:**

1.  **Check for New Component:**
    *   Confirm that the file `apps/architecture-explorer/src/MetadataPanel.tsx` exists and correctly renders node data.
2.  **Review Diagram Canvas:**
    *   Open `DiagramCanvas.tsx`. It should now have logic to attach click handlers to the SVG nodes after rendering.
    *   It must correctly identify the clicked node's ID and communicate it back to the parent component via a callback.
3.  **Review App Component:**
    *   Open `src/App.tsx`. It should manage the state of the currently selected node.
    *   It should render the `MetadataPanel` and pass it the correct `NodeData` based on the selected ID.
4.  **Run the Application:**
    *   Navigate to the `apps/architecture-explorer` directory in your terminal.
    *   Run the command: `bun run dev`.
5.  **Validate in Browser:**
    *   Open the local development URL in your browser.
    *   The diagram should be displayed. Initially, the metadata panel should show its default message.
    *   Click on one of the nodes (e.g., `SampleComponent`) in the diagram.
    *   The metadata panel should update to display the details of the `SampleComponent` as defined in `architecture.json`.
