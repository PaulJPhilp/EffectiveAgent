# Product Requirements Document (PRD): Architecture Explorer

## 1. Introduction

*   **1.1. Executive Summary:**
    The Architecture Explorer is an innovative web-based application designed to provide interactive and up-to-date visualizations of software architectures. Leveraging code-generated Mermaid diagrams directly from TypeScript/Effect/React source code, it offers engineers, architects, and new team members a dynamic way to understand system structure, component relationships, and associated metadata. By automating diagram generation and enabling interactive features like tag-based filtering and static layered grouping, the Explorer aims to significantly reduce the time and effort traditionally spent on comprehending complex codebases and their underlying designs.

*   **1.2. Problem Statement:**
    In modern software development, particularly within large monorepos or complex distributed systems, maintaining accurate and accessible architectural documentation is a persistent challenge. Traditional text-based documentation often becomes outdated quickly, diagrams are manually created and thus fall out of sync with the codebase, and static visuals lack the necessary interactivity for deep exploration. This leads to:
    *   **Increased onboarding time** for new engineers trying to grasp system complexities.
    *   **Ambiguity and misunderstanding** of component responsibilities and data flows among existing teams.
    *   **Difficulty in identifying dependencies** and potential impact areas during development.
    *   **Outdated "source of truth"** for architectural understanding, leading to design-implementation drift.

*   **1.3. Solution Overview:**
    The Architecture Explorer addresses these problems by establishing the codebase itself as the authoritative source for architectural diagrams. It will consist of two primary components:
    1.  **An Architectural Data Generator:** A custom static analysis tool built using TypeScript ASTs that parses the TypeScript/Effect/React codebase to extract architectural components, their metadata (via JSDoc comments), and their relationships, compiling this into a structured JSON format.
    2.  **A Web-Based Explorer Application:** A React application built with Vite that consumes this generated JSON data. It will dynamically render interactive Mermaid diagrams, with components visually organized into predefined layers. It will allow users to pan, zoom, and filter nodes by tags, ensuring that architectural insights are always current and easily discoverable.

## 2. Goals & Objectives

*   **2.1. Project Goals:**
    The overarching goals for the Architecture Explorer are to:
    *   **Enhance Architectural Clarity:** Provide a clear, intuitive, and visually compelling representation of the software architecture.
    *   **Reduce Architectural Debt & Drift:** Ensure that architectural diagrams are consistently in sync with the live codebase, minimizing discrepancies between design and implementation.
    *   **Improve Engineer Productivity & Onboarding:** Accelerate the learning curve for new team members and streamline the process for existing engineers to understand unfamiliar parts of the system.
    *   **Facilitate Informed Decision-Making:** Enable quicker identification of dependencies, impact areas, and structural patterns within the architecture.
    *   **Promote a Culture of Up-to-Date Documentation:** Shift the paradigm from manually maintained, often stale documentation to living, code-driven architectural insights.

*   **2.2. Measurable Objectives (Success Metrics):**
    The success of the Architecture Explorer will be primarily measured by:
    *   **50% reduction in the time required for a new engineer to understand the architecture of a project, as compared to relying solely on text-based documentation.**
        *   *Note:* This metric can be validated through structured onboarding feedback, timed learning exercises, or internal user surveys comparing learning efficacy with and without the explorer.
    *   **Increased Perceived Architectural Clarity:** Qualitative feedback from development teams indicating a significant improvement in their understanding of the system's structure and interdependencies. This can be assessed via regular developer satisfaction surveys.
    *   **Comprehensive Coverage:** Ability to successfully generate accurate and navigable diagrams for all critical core services within the target monorepo, demonstrating the robustness and completeness of the data generation process.

## 3. Target Audience

*   **3.1. Primary Users:**
    The Architecture Explorer is primarily designed for individuals who need to rapidly understand, navigate, or make decisions about a software system's structure and behavior. This includes:
    *   **Software Engineers:** Developers who need to understand existing services before making changes, debug issues, or onboard to new domains.
    *   **Technical Leads / Engineering Managers:** Individuals responsible for guiding architectural decisions, reviewing designs, and ensuring team understanding of system components.
    *   **New Onboarding Developers:** Critical for accelerating the learning curve and making them productive faster within complex codebases.
    *   **Architects:** Professionals who design, evaluate, and evolve the overall system architecture.

*   **3.2. User Persona Sketch:**
    *   **Name:** Paul
    *   **Occupation:** Engineer (Software Development)
    *   **Goals:**
        *   Quickly grasp the high-level structure and responsibilities of services he's new to.
        *   Efficiently identify dependencies and data flows between components.
        *   Understand how a change in one area might impact others.
        *   Reduce time spent digging through code and outdated wikis for architectural context.
        *   Have confidence that the diagrams accurately reflect the current codebase.
    *   **Frustrations:**
        *   Stale, inaccurate, or non-existent architectural documentation.
        *   Difficulty navigating large codebases without a visual map.
        *   Lack of a unified view that combines different levels of abstraction.
        *   Spending excessive time manually tracing code paths to understand interactions.

## 4. Scope

*   **4.1. In Scope for V1 (Minimum Viable Product):**
    The initial release of the Architecture Explorer will focus on delivering core value by providing an interactive, code-generated visualization tool with essential navigation and filtering capabilities. The following features and characteristics are included:
    *   **Navigation & Zooming:** Users can pan and zoom within the rendered Mermaid diagrams.
    *   **Interactive Node Metadata Display:** Clicking on any node will display its associated metadata (description, tags, links) in a dedicated panel.
    *   **Tag-Based Filtering & Highlighting:** Users can select predefined tags to dynamically highlight or fade out elements on the diagram, enabling focused exploration.
    *   **Predefined Layered Grouping:** The generated diagrams will always structure components into visually distinct layers (e.g., 'Core', 'AI', 'Pipeline') using Mermaid `subgraph` syntax based on their metadata. This is a static, non-toggleable aspect of the diagram structure.
    *   **Code-Generated Data Source:** The system will include an Architectural Data Generator component. This component will:
        *   Analyze **TypeScript/Effect/React** codebases **using Abstract Syntax Trees (ASTs)**.
        *   Extract architectural components, their relationships, and metadata (via custom **JSDoc comments**).
        *   Output structured JSON containing Mermaid diagram definitions and all extracted metadata.
    *   **Frontend Application:** A web-based application built with **React and Vite**, designed for local execution within a monorepo context.
    *   **Data Consumption:** The generated JSON data will be bundled directly into the frontend application for immediate access (POC approach).

*   **4.2. Out of Scope for V1 (Future Considerations):**
    To ensure a focused and timely initial release, the following functionalities and aspects are explicitly excluded from V1 but are considered valuable additions for future iterations:
    *   **Full-text Search Functionality:** Ability to search for specific components, tags, or descriptions across the entire architectural dataset.
    *   **Edge-Specific Interactions:** Displaying metadata or allowing filtering/highlighting based on attributes of relationships (edges).
    *   **Version Control / History:** Viewing how the architecture has evolved over time or comparing different versions of diagrams.
    *   **Manual Diagram Editing:** Providing an interface for users to directly modify or create diagrams within the explorer.
    *   **Cloud Deployment / Standalone Service:** The explorer will initially run locally; no shared hosted service is planned for V1.
    *   **C4 Model Drill-Down/Drill-Up:** The ability to navigate hierarchically between distinct C4 diagram levels (Context, Container, Component) via clickable nodes and a breadcrumb trail.
    *   **Subsystems (General Static Groupings):** While layers are static groups, other forms of static groupings beyond the fixed layered architecture are deferred.
    *   **Dynamic "Group By" Feature:** Allowing users to *choose* arbitrary attributes to group by dynamically (the previous interpretation of this feature).

## 5. Features & Functionality (Detailed Requirements)

This section details the user-facing capabilities of the Architecture Explorer for V1.

*   **5.1. Navigation & Zooming**
    The explorer will provide intuitive controls for users to navigate large and complex diagrams.
    *   **5.1.1. Panning:** Users must be able to pan (drag) the diagram using mouse or touch gestures to view different sections, essential for larger architectures.
    *   **5.1.2. Zooming:** Users must be able to zoom in and out of the diagram to adjust the level of detail. Standard methods like mouse wheel scrolling (or equivalent trackpad gestures) should be supported.
    *   **5.1.3. Responsive Scaling:** Diagram elements (nodes, edges, text) must scale appropriately during zooming to maintain readability and avoid visual clutter.
    *   **5.1.4. Intelligent Initial View:** The system should intelligently present an initial view of the diagram, such as fitting the entire diagram within the viewport or centering on a logical starting point.
    *   **5.1.5. *Implementation Note:*** The initial implementation will leverage Mermaid's built-in pan/zoom capabilities, with augmentation considered only if necessary to meet user experience requirements.

*   **5.2. Interactive Elements**
    The explorer will allow users to gain deeper insights into individual architectural components.
    *   **5.2.1. Node Metadata Display:**
        *   **Click Action:** Clicking on any node within the diagram must trigger the display of supplementary information about that node.
        *   **Information Display:** This information will be presented in a dedicated, clearly visible panel (e.g., a sidebar or pop-over). It will include:
            *   A detailed description of the node.
            *   Associated tags or categories.
            *   Links to external resources (e.g., source code repository, documentation, API endpoints, team ownership).
        *   **Dismissal:** The metadata panel should be easily dismissible.
        *   *Implementation Note:*** The system will leverage Mermaid's callbacks for node clicks to initiate the display of metadata.

*   **5.3. Tag-Based Filtering & Highlighting**
    Users must be able to dynamically adjust the visual representation of the diagram based on specific criteria (tags).
    *   **5.3.1. Tag Selection:** Users must be able to select one or more predefined tags (e.g., "MVP", "Authentication", "Database") via an interactive user interface (e.g., a sidebar panel).
    *   **5.3.2. Filtering Logic (OR):** When multiple tags are selected, the system must display or highlight nodes that possess *any* of the selected tags (OR logic).
    *   **5.3.3. Visual Distinction:** Filtered or highlighted elements must be visually distinct from other elements on the diagram. This could involve:
        *   Changing the background or border color of matching nodes.
        *   Adjusting the opacity of non-matching elements (fading them out) to emphasize the filtered view.
        *   Adding a subtle icon or outline to highlighted nodes.
    *   **5.3.4. Interactive Controls:** The filtering interface must allow users to easily select/deselect tags and provide a clear way to clear all active filters.
    *   **5.3.5. "Show All" / Reset Option:** A dedicated control must be available to reset all filters and return to the default, unfiltered view of the diagram.

*   **5.4. Layered Architecture Display (Static Grouping)**
    The diagram will inherently display components grouped by their defined architectural layers. This is a fundamental structural aspect of the visualization, not a user-toggleable feature in V1.
    *   **5.4.1. Predefined Layer Representation:** The generated Mermaid diagram will always include `subgraph` blocks that visually group nodes according to their assigned 'Layer' attribute (e.g., 'Core', 'AI', 'Pipeline').
    *   **5.4.2. Visual Group Distinction:** Each layer's subgraph will be clearly visually distinct, with a labeled boundary and a different background or border to visually separate the logical layers.
    *   **5.4.3. Inter-Layer Edge Preservation:** All existing relationships (edges) between nodes must be correctly preserved and rendered, even if they cross layer boundaries.
    *   **5.4.4. Non-Toggleable:** Users cannot turn off or change this layering in V1; it is a fixed structural view.

## 6. Data Source & Generation

The robustness and accuracy of the Architecture Explorer depend entirely on its ability to automatically generate up-to-date architectural data directly from the codebase. This is handled by a dedicated **Architectural Data Generator** component.

*   **6.1. Architectural Data Generator Component:**
    This component will be a custom-built static analysis tool responsible for extracting architectural insights from the source code.
    *   **6.1.1. Source Code Ingestion:** The generator must be able to read and parse the project's **TypeScript/Effect/React codebase using Abstract Syntax Trees (ASTs)**. This approach ensures high precision and reliability in identifying code constructs and their relationships.
    *   **6.1.2. Mermaid Diagram Generation:** It will automatically construct valid Mermaid diagram syntax (flowcharts), specifically including `subgraph` blocks for the **predefined layered architecture** based on the `@groupByLayer` JSDoc tag.
    *   **6.1.3. Metadata Extraction via JSDoc:** The generator will extract rich metadata for each architectural node (component) by parsing specific custom JSDoc tags within the TypeScript code. These tags will include:
        *   `@architectureComponent [ComponentName]`: Marks a code entity as an architectural component to be included.
        *   `@c4 [Level]`: Defines the C4 level for the component (e.g., System, Container, Component, Database).
        *   `@description [Text]`: A concise description for the component, displayed in the metadata panel.
        *   `@tag [Tag1, Tag2, ...]`: A comma-separated list of tags for filtering/highlighting.
        *   `@groupByLayer [LayerName]`: Defines the architectural layer (e.g., 'Core', 'AI', 'Pipeline') to which the component belongs, directly driving the static layering in the Mermaid diagram.
        *   `@link [URL]`: A URL to external resources (e.g., source code, documentation, API endpoint).
    *   **6.1.4. Relationship Inference:** Relationships (edges) between components will be inferred through static analysis of the codebase. This will primarily involve:
        *   Analyzing `import` statements to identify module dependencies.
        *   Parsing Effect dependencies (e.g., `Effect.gen` yield statements) to understand explicit service/component interactions.
        *   Analyzing function calls or method invocations between identified architectural components.
        *   This inference process will also leverage ASTs for accuracy.
    *   **6.1.5. Output Format:** The generator will output a structured JSON file. This file will contain all identified diagram definitions (Mermaid strings for the main view with layers) and the associated metadata for each node, making it easily consumable by the frontend application.
    *   **6.1.6. Automation:** The entire generation process must be scriptable and automatable, allowing for easy integration into a CI/CD pipeline or as a local development script to ensure diagrams are regularly updated.

## 7. Technical Architecture

The Architecture Explorer will be implemented as a client-side web application designed for simplicity and performance in a local development context.

*   **7.1. Frontend Stack:** The application will be built using **React** for its component-based architecture and robust ecosystem, with **Vite** serving as the build tool for its fast development server and optimized builds.
*   **7.2. Diagram Rendering Library:** The core visualization will be powered by **`mermaid.js`**, an open-source library that renders diagrammatically from text-based definitions.
*   **7.3. Styling:** **Tailwind CSS v4** will be used for its utility-first approach, enabling rapid UI development and ensuring design consistency.
*   **7.4. UI Components:** **Shadcn UI** components will be leveraged to build high-quality, customizable, and accessible UI elements quickly.
*   **7.5. Data Consumption:** For V1, the structured JSON output from the Architectural Data Generator will be **bundled directly into the frontend application**. This approach eliminates the need for a separate backend API or server-side data fetching for the initial release, simplifying the deployment model within a monorepo.
*   **7.6. State Management:** React's built-in hooks, primarily `useState` and `useContext`, will be utilized for managing application state. A lightweight global state management library like Zustand may be considered if complexity warrants it.
*   **7.7. Key UI Components:**
    The application will comprise distinct React components, each responsible for a specific part of the user interface or functionality:
    *   `ArchitectureDiagram`: The central component responsible for rendering the Mermaid diagram, handling pan and zoom interactions, and managing Mermaid callbacks for node clicks.
    *   `MetadataPanel`: Displays detailed information about a selected architectural node.
    *   `FilterControls`: Provides the user interface for selecting and clearing tags to filter and highlight diagram elements.

## 8. Deployment Strategy

The initial deployment strategy is designed to integrate seamlessly into an existing development workflow while providing a clear path for future expansion.

*   **8.1. Initial Deployment:** The Architecture Explorer will initially be deployed as a **sub-application or package within the target monorepo** it is designed to visualize. This strategy offers several benefits:
    *   **Direct Access to Source:** Simplifies the process for the Architectural Data Generator to access and parse the relevant code.
    *   **Streamlined Development:** Developers can run and test the explorer alongside the code it documents, facilitating rapid iteration.
    *   **Local Use Case:** Supports the primary use case of a developer needing to understand their local development environment or specific project within the monorepo.
*   **8.2. Future Deployment:** Should the V1 prove successful and valuable, there is a clear intent to evaluate separating the explorer into its **own dedicated repository** and potentially exploring **standalone deployment options** (e.g., as a hosted internal tool or an npm package) for broader team access and easier discoverability.