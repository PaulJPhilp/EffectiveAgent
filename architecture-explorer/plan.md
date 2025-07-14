# Architecture Explorer: Implementation Plan (V1)

This plan outlines a phased approach for developing the Architecture Explorer's V1 Minimum Viable Product (MVP), encompassing both the Architectural Data Generator and the Architecture Explorer Frontend. The phases are designed to build incrementally, proving core functionalities before adding refinements.

---

## 1. Phase 0: Foundation & Core Setup

**Goal:** Establish the necessary monorepo structure, basic tooling, and common configurations for both applications.

*   **1.1. Monorepo Workspace Setup:**
    *   Create `packages/architecture-generator` and `apps/architecture-explorer` directories.
    *   Configure `package.json` workspaces.
    *   Set up root `tsconfig.json` and individual `tsconfig.json` for generator and explorer.
*   **1.2. Shared Tooling & Linting:**
    *   Configure ESLint and Prettier for the entire monorepo.
    *   Set up basic Git hooks (e.g., husky, lint-staged) for code quality.

---

## 2. Phase 1: Architectural Data Generator - Core Logic (Data Extraction & Basic Diagram)

**Goal:** Develop the essential generator logic to parse annotated TypeScript code, extract metadata, infer basic relationships, and produce a Mermaid diagram string with static layering.

*   **2.1. `ts-morph` Project & Initial Source Loading:**
    *   Install `ts-morph` within `packages/architecture-generator`.
    *   Develop a core script to initialize a `ts-morph` project and load source files (e.g., targeting a small, representative subset of your codebase or a dedicated test file).
    *   Verify `ts-morph` can correctly parse the files and identify nodes.
*   **2.2. JSDoc-Based Metadata Extraction:**
    *   Implement `JSDocParser` logic to read and extract values from `@architectureComponent`, `@c4`, `@description`, `@tag`, `@groupByLayer`, and `@link` JSDoc tags.
    *   Create initial in-memory data structures for "nodes" with extracted metadata.
*   **2.3. Basic Relationship Inference (Imports):**
    *   Implement `RelationshipInferrer` to identify basic relationships between components by analyzing `import` statements.
    *   Create initial in-memory data structures for "edges."
*   **2.4. Mermaid String Generation with Static Layers:**
    *   Develop `MermaidGenerator` to take the extracted nodes (with `groupByLayer` attributes) and edges.
    *   Generate a basic Mermaid flowchart (`graph TD`) definition, correctly incorporating `subgraph` blocks for the predefined layers.
*   **2.5. JSON Output:**
    *   Implement `JsonSerializer` to combine the Mermaid string, node metadata, and edge data into the `architecture-data.json` file.
    *   Set up an NPM/Yarn script (e.g., `generate`) in the `architecture-generator` package to automate this process.

---

## 3. Phase 2: Architecture Explorer Frontend - Basic Visualization

**Goal:** Get the React application rendering the generated Mermaid diagram, enabling basic navigation (pan/zoom), and displaying metadata on node clicks.

*   **3.1. Vite/React App Setup:**
    *   Initialize the React/Vite project in `apps/architecture-explorer`.
    *   Install `mermaid`, `tailwindcss`, and `shadcn-ui`.
    *   Configure Tailwind CSS and set up Shadcn UI for component scaffolding.
*   **3.2. Data Loading & Initial Diagram Render:**
    *   Modify `App.tsx` (or a central data provider) to import and load `architecture-data.json`.
    *   Create the `DiagramCanvas.tsx` component.
    *   Integrate `mermaid.js` into `DiagramCanvas`, passing the Mermaid definition string to it for initial rendering.
    *   Verify diagram displays correctly in the browser, including the static layers.
*   **3.3. Navigation (Pan & Zoom):**
    *   Confirm Mermaid's default pan and zoom capabilities are working within `DiagramCanvas`. Augment only if essential UX requirements are not met.
*   **3.4. Node Click & Basic Metadata Panel:**
    *   In `DiagramCanvas`, implement `mermaidAPI.addNodeClick()` to capture clicks on diagram nodes.
    *   When a node is clicked, capture its ID and update application state (`selectedNodeId`).
    *   Develop `MetadataPanel.tsx` (using Shadcn `Dialog` or a side-aligned component).
    *   Ensure the panel correctly displays the `description` and `tags` for the `selectedNodeId` using the data from `architecture-data.json`.

---

## 4. Phase 3: Architecture Explorer Frontend - Interactive Features

**Goal:** Implement the tag-based filtering and highlighting functionality, and polish the user interface.

*   **4.1. Filter Controls UI:**
    *   Develop `FilterControls.tsx` within the sidebar area.
    *   Dynamically generate the list of unique tags from `architecturalData.nodes`.
    *   Use Shadcn UI components (e.g., `Checkbox` or `Switch`) to allow users to select multiple tags.
    *   Implement a "Show All" / Reset button for filters.
*   **4.2. Tag-Based Filtering & Highlighting Logic:**
    *   In `DiagramCanvas.tsx`, implement logic to apply visual distinction to SVG elements based on `activeFilters`. This will involve post-processing the Mermaid-rendered SVG to adjust opacity, add specific CSS classes (Tailwind), or change colors for matching/non-matching nodes.
*   **4.3. Overall UI/UX Refinements:**
    *   Ensure responsive design for the main layout and panels using Tailwind CSS.
    *   Refine the look and feel of the metadata panel, filter controls, and overall application using Shadcn UI components and Tailwind.

---

## 5. Phase 4: Generator & System Enhancements

**Goal:** Improve the robustness and accuracy of the data generation process, and set up automated workflows.


*   **5.2. Robust Error Handling & Logging (Generator):**
    *   Implement comprehensive error handling for parsing failures, missing metadata, or unresolvable references.
    *   Add detailed logging to assist with debugging the generation process.
*   **5.3. Automation & CI/CD Integration:**
    *   Create a dedicated script (e.g., `yarn build:architecture`) at the monorepo root to trigger the generator and potentially the explorer's build.
    *   (Future) Document steps for integrating this generation process into a CI/CD pipeline.

---

## 6. Phase 5: Testing & Documentation

**Goal:** Ensure the quality and usability of the explorer and provide necessary documentation for users and future developers.

*   **6.1. Generator Testing:**
    *   Write unit tests for `JSDocParser`, `RelationshipInferrer`, and `MermaidGenerator` logic to ensure accurate data extraction and diagram generation.
    *   Create integration tests using small, controlled TypeScript code samples with expected JSON output.
*   **6.2. Frontend Component Testing:**
    *   (Optional for V1) Write unit tests for key React components (e.g., `FilterControls`, `MetadataPanel`).
*   **6.3. User Documentation:**
    *   Create a `README.md` for the `architecture-explorer` app, explaining how to run it, navigate, use filters, and understand the layered view.
*   **6.4. Developer Documentation (Generator):**
    *   Document the custom JSDoc tags and their usage within the codebase.
    *   Provide guidance on extending the generator for new metadata types or relationship inference rules.

---

## V2 / Future Enhancements

*   **Advanced Relationship Inference:**
    *   Enhance `RelationshipInferrer` to handle more complex scenarios:
        *   Analyze `Effect.gen` yield expressions for service dependencies.
        *   Implement more sophisticated call graph analysis to infer interactions between components.
        *   Improve type resolution for greater accuracy.

---
