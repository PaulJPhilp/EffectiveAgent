# Architecture Explorer: Architecture Document

This document details the technical architecture of the Architecture Explorer, outlining the structure, components, and data flow for both the Architectural Data Generator and the Architecture Explorer Frontend.

---

## 1. Overall System Architecture

The Architecture Explorer system is comprised of two distinct, yet interconnected, applications. The **Architectural Data Generator** acts as a build-time or pre-flight process, transforming raw source code into structured architectural data. The **Architecture Explorer Frontend** then consumes this static data to provide an interactive visualization.

```mermaid
graph TD
    A[Source Code (TS/Effect/React)] -->|Analysis & Transformation| B(Architectural Data Generator);
    B -->|Output: architecture-data.json| C(Architecture Explorer Frontend);
    C -->|User Interaction| D[Interactive Web UI];

    subgraph Development Environment
        A
        B
    end

    subgraph User Interaction
        C
        D
    end
```

---

## 2. Architectural Data Generator

The Architectural Data Generator is a TypeScript application, leveraging AST parsing, designed to systematically extract architectural components, their metadata, and their interdependencies directly from the source code.

*   **Goal/Role:** To reliably and automatically transform a TypeScript/Effect/React codebase into a structured, current, and consistent architectural model, outputting it as a JSON file.
*   **Input:** Your TypeScript/Effect/React source code files within the monorepo.
*   **Output:** A single `architecture-data.json` file.

### 2.1. High-Level Flow: Architectural Data Generator

```mermaid
graph TD
    A[Source Code (TS/Effect/React)] -->|Read & Parse| B(TS Project Loader);
    B -->|AST Traversal| C{AST Analyzer};
    C -->|Extract Component Metadata (JSDoc)| D[JSDoc Parser];
    C -->|Infer Relationships (Imports, Effect, Calls)| E[Relationship Inferrer];
    D & E -->|Aggregate & Model| F[Architecture Model Builder];
    F -->|Generate Mermaid String (with Layers)| G[Mermaid Generator];
    F & G -->|Serialize to JSON| H[JSON Serializer];
    H --> I[architecture-data.json];

    subgraph Architectural Data Generator Process
        B
        C
        D
        E
        F
        G
        H
    end
```

### 2.2. Internal Modules/Components: Architectural Data Generator

1.  **`ProjectLoader` (using `ts-morph`):**
    *   **Responsibility:** Initializes and configures the `ts-morph` project. Loads all relevant TypeScript source files based on `tsconfig.json` into an in-memory AST representation.
    *   **Output:** A `ts-morph` `Project` instance.
2.  **`AstAnalyzer`:**
    *   **Responsibility:** Orchestrates the AST traversal process. Iterates through `SourceFile` objects and initiates deeper analysis by delegating to specialized parsers for individual nodes.
3.  **`JSDocParser`:**
    *   **Responsibility:** Extracts architectural metadata from JSDoc comments. Recognizes custom tags like `@architectureComponent`, `@c4`, `@description`, `@tag`, `@groupByLayer`, and `@link`, converting them into structured data.
4.  **`RelationshipInferrer`:**
    *   **Responsibility:** Identifies and extracts dependencies (edges) between architectural components. Logic includes parsing `import` statements, analyzing `Effect.gen` blocks and `yield*` expressions for Effect dependencies, and tracing function/method calls. Utilizes `ts-morph`'s type checker for accurate symbol resolution.
5.  **`ArchitectureModelBuilder`:**
    *   **Responsibility:** Aggregates all extracted nodes (components) and relationships (edges) into a consistent, denormalized in-memory data model. Ensures data integrity and uniqueness.
6.  **`MermaidGenerator`:**
    *   **Responsibility:** Converts the `ArchitectureModelBuilder`'s internal model into a Mermaid diagram definition string. Crucially, it constructs `subgraph` blocks based on the `@groupByLayer` attribute to represent the predefined layered architecture.
7.  **`JsonSerializer`:**
    *   **Responsibility:** Serializes the final architectural model, including the generated Mermaid string, into the `architecture-data.json` file, ensuring adherence to the predefined output schema.

### 2.3. Key Technical Considerations: Architectural Data Generator

*   **Robustness:** Handling various TypeScript syntax constructs, edge cases in JSDoc parsing, and complex type resolutions.
*   **Performance:** Optimizing AST traversal and type checking for large codebases to ensure acceptable generation times. Strategies may include caching or incremental analysis.
*   **Extensibility:** Designing the parser and inferrers to be adaptable to future custom tags, new relationship patterns (e.g., specific framework conventions), or additional visualization needs.
*   **Error Reporting:** Providing clear and actionable error messages when architectural data cannot be reliably extracted or processed.

---

## 3. Architecture Explorer Frontend

The Architecture Explorer Frontend is a client-side React application designed to provide an interactive and visual representation of the architecture based on the generated data.

*   **Goal/Role:** To consume the `architecture-data.json` file and render a dynamic, interactive web interface that allows users to explore, filter, and understand the architectural diagram.
*   **Input:** The `architecture-data.json` file, bundled directly into the application.
*   **Output:** An interactive web UI displaying the architectural diagram.

### 3.1. High-Level Flow: Architecture Explorer Frontend

```mermaid
graph TD
    A[architecture-data.json] -->|Bundled Import & Load| B(Root App Component - App.tsx);
    B -->|State Management (Context/Hooks)| C(Diagram Canvas Component);
    B -->|State Management (Context/Hooks)| D(Control Panels - Filter, Metadata);
    C -->|User Interaction (Node Click)| B;
    D -->|User Interaction (Filter Selection)| B;
    C -->|Mermaid.js Render SVG| E[Interactive SVG Diagram];

    subgraph Architecture Explorer Frontend
        B
        C
        D
        E
    end
```

### 3.2. Core Application State

Centralized state management, primarily via React Context and Hooks, will orchestrate the application's interactive elements. Key state variables will include:

*   `architecturalData`: The parsed content of `architecture-data.json`, loaded once and made globally accessible.
*   `activeFilters`: An array of strings representing tags currently selected for filtering/highlighting.
*   `selectedNodeId`: The ID of the node currently selected by the user, triggering the metadata panel.

### 3.3. Key React Components: Architecture Explorer Frontend

1.  **`App.tsx` (Root Component):**
    *   **Responsibility:** Serves as the main entry point, managing global application state, handling data loading, and orchestrating the top-level layout of the UI (using Tailwind CSS and Shadcn UI).
    *   **Data Provision:** Loads `architecture-data.json` and makes it available to child components.
    *   **Event Handling:** Receives and processes events from child components (e.g., node clicks, filter changes) to update global state.
2.  **`DiagramCanvas.tsx`:**
    *   **Responsibility:** The core component for rendering and managing the Mermaid diagram visualization.
    *   **Mermaid Integration:** Uses `mermaid.js` to render the `mermaidDefinition` string into an SVG element. Manages `mermaidAPI.addNodeClick()` to capture user interactions on diagram nodes.
    *   **Visual Filtering:** Applies dynamic styling (e.g., opacity, color) to SVG elements based on the `activeFilters` state, emphasizing matching nodes and de-emphasizing others. Handles Mermaid's default pan and zoom capabilities.
3.  **`Sidebar.tsx` (Container Component):**
    *   **Responsibility:** A layout component (likely using Shadcn UI's layout primitives) that encapsulates and organizes the various control panels and information displays.
4.  **`FilterControls.tsx`:**
    *   **Responsibility:** Presents the user interface for tag-based filtering. Dynamically lists available tags (extracted from `architecturalData`) and allows users to select/deselect them using Shadcn UI components (e.g., Checkboxes or Switches).
5.  **`MetadataPanel.tsx`:**
    *   **Responsibility:** Displays detailed metadata for the `selectedNodeId`. Uses Shadcn UI components (e.g., a Dialog or Sheet) to present information like description, tags, and external links in a user-friendly format.

### 3.4. Key Technical Considerations: Architecture Explorer Frontend

*   **Performance:** Efficient rendering and re-rendering of large SVG diagrams, particularly when applying filters or handling extensive interactivity.
*   **Responsiveness:** Ensuring the layout and diagram display optimally across various screen sizes and devices, leveraging Tailwind CSS for responsive design.
*   **SVG Manipulation:** Managing direct manipulation of the Mermaid-generated SVG DOM for advanced visual effects (e.g., filtering, custom highlighting). This will require careful implementation to avoid conflicts with Mermaid's own rendering.
*   **User Experience (UX):** Providing intuitive interactions for navigation, filtering, and information discovery.

---