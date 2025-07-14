# Task 4.1: Interactive Node Click & Metadata Display (Implementation)

**Goal:**

Make the nodes in the Mermaid diagram interactive, allowing users to click on a component to view its detailed metadata.

**Instructions:**

1.  **Create Metadata Panel Component:** Create a new component file at `apps/architecture-explorer/src/MetadataPanel.tsx`.
    *   This component should accept a `NodeData` object as a prop.
    *   It should render the details of the node, such as its name, description, C4 level, layer, and tags.
    *   If no node is selected, it should display a message like "Select a node to view its details."
2.  **Enable Click Events:**
    *   In `DiagramCanvas.tsx`, you need to attach click handlers to the rendered SVG nodes. A common way to do this is to add a `useEffect` that runs after the SVG is rendered. Inside this effect, select all the `.node` elements in the SVG and attach a click event listener to each.
    *   To make nodes clickable, the Mermaid diagram definition must use the node's ID (its class name) as the node's identifier (e.g., `graph TD; ImporterComponent --> SampleComponent;`). Mermaid will use this as the DOM ID in the rendered SVG.
    *   Inside the effect, select all `.node` elements in the SVG and attach a click event listener. The `id` of the clicked DOM element will be the class name of the component, which you can use to identify which node was clicked.
    *   The component should accept an `onNodeClick` callback prop and invoke it with the clicked node's ID.
3.  **Manage Selected Node State:**
    *   In `src/App.tsx`, add a new `useState` hook to keep track of the `selectedNodeId`.
    *   Pass a handler function to the `DiagramCanvas`'s `onNodeClick` prop that updates this state.
4.  **Display the Panel:**
    *   In `src/App.tsx`, render the `MetadataPanel` component.
    *   Find the `NodeData` object that corresponds to the `selectedNodeId` and pass it to the `MetadataPanel`.
