# Architecture Explorer: Testing Plan (V1)

This document outlines the strategy and methodology for testing the Architecture Explorer, ensuring the accuracy of data generation and the functionality, usability, and stability of the interactive frontend.

---

## 1. Introduction

The primary goal of this testing plan is to validate that the Architecture Explorer accurately reflects the codebase, provides a seamless and intuitive user experience, and meets the defined requirements. Testing will be integrated throughout the development lifecycle for both the data generator and the frontend application.

## 2. Testing Principles

*   **Accuracy:** The generated architectural diagrams and metadata must precisely reflect the current state of the codebase and its annotations.
*   **Reliability:** Both the generator and the explorer must operate consistently without unexpected crashes or errors.
*   **Usability:** The frontend must be intuitive and efficient for engineers to explore and understand architectures.
*   **Efficiency:** The generator process should be performant enough for regular execution (e.g., in CI/CD).
*   **Automation:** Prioritize automated testing where feasible to ensure rapid feedback and prevent regressions.

## 3. Test Environment

*   All tests will be executed in a standard Node.js environment for the generator and a modern web browser environment (potentially headless for E2E) for the frontend, typically within the monorepo's local development setup.
*   CI/CD pipelines will be configured to run automated tests on code commits.

## 4. Testing the Architectural Data Generator

**Goal:** Verify that the generator correctly parses code, extracts metadata, infers relationships, and produces accurate Mermaid diagrams and structured JSON output.

*   **4.1. Unit Tests (Jest/ts-jest):**
    *   **Scope:** Individual functions and modules within `packages/architecture-generator`.
    *   **Focus Areas:**
        *   **`JSDocParser`:** Test parsing of all custom JSDoc tags (`@architectureComponent`, `@c4`, `@description`, `@tag`, `@groupByLayer`, `@link`) with various valid and invalid formats.
        *   **`RelationshipInferrer`:** Test specific inference rules (e.g., correct identification of imports, Effect yields, simple function calls) given isolated AST snippets.
        *   **`MermaidGenerator`:** Test the correct generation of Mermaid syntax for nodes, edges, and crucially, the static `subgraph` blocks for layers, given structured input data.
        *   **`JsonSerializer`:** Verify the output JSON structure adheres to the `ArchitectureData` TypeScript interface.
*   **4.2. Integration Tests (Jest/ts-jest, Node.js scripts):**
    *   **Scope:** The end-to-end execution of the generator against controlled TypeScript code samples.
    *   **Focus Areas:**
        *   **Small, Controlled Code Samples:** Create a set of dedicated test TypeScript files (e.g., `test-src/sample-service-a.ts`, `test-src/sample-service-b.ts`) with predefined `@architectureComponent` annotations and expected relationships/metadata.
        *   **Expected Output Assertion:** Run the full generator against these samples and assert that the generated `architecture-data.json` matches a predefined, expected JSON file. This includes verifying the `mermaidDefinition` string and the `nodes`/`edges` arrays.
        *   **Layered Structure Validation:** Explicitly confirm that `subgraph` blocks are correctly generated for `groupByLayer` attributes.
        *   **Error Scenarios:** Test the generator's behavior when encountering malformed JSDoc, unresolvable types, or other parsing errors, verifying appropriate logging/error output.
*   **4.3. Performance & Large-Scale Validation (Manual/Automated):**
    *   **Scope:** Running the generator against significant portions or the entirety of the monorepo.
    *   **Focus Areas:**
        *   **Execution Time:** Monitor and benchmark the generation time to ensure it remains within acceptable limits (e.g., for CI/CD integration).
        *   **Memory Usage:** Track memory consumption during the parsing process.
        *   **Coverage:** Verify that all expected core components and relationships from the actual codebase are correctly identified and included in the output.
        *   **Output Validity:** Perform automated JSON schema validation on the generated `architecture-data.json`.

## 5. Testing the Architecture Explorer Frontend

**Goal:** Verify that the React application correctly renders the diagrams, responds to user interactions, and provides accurate information.

*   **5.1. Unit Tests (Jest/Vitest, React Testing Library):**
    *   **Scope:** Isolated React components and their internal logic.
    *   **Focus Areas:**
        *   **`FilterControls`:** Test state updates when tags are selected/deselected, and reset functionality.
        *   **`MetadataPanel`:** Verify correct rendering of node details (description, tags, links) given various `NodeData` inputs.
        *   **Utility Functions:** Test any helper functions for SVG manipulation, data transformation, etc.
*   **5.2. Integration Tests (Jest/Vitest, React Testing Library):**
    *   **Scope:** Interactions between multiple React components, focusing on specific UI flows.
    *   **Focus Areas:**
        *   **Data Loading & Initial Render:** Confirm `App.tsx` loads `architecture-data.json` and passes correct data to `DiagramCanvas`.
        *   **Node Click Flow:** Simulate a user clicking a node in `DiagramCanvas` (by triggering `onNodeClick` with a mock ID) and assert that the `MetadataPanel` opens and displays the correct information.
        *   **Filter Application (Component Level):** Test that selecting filters in `FilterControls` correctly updates the `activeFilters` state and triggers re-rendering in `DiagramCanvas` (though visual SVG changes are best in E2E).
*   **5.3. End-to-End (E2E) Tests (Playwright/Cypress):**
    *   **Scope:** Simulating full user journeys in a real browser environment (headless or headed).
    *   **Focus Areas:**
        *   **Full Diagram Rendering:** Verify the initial Mermaid diagram (with layers) loads correctly and is visible.
        *   **Pan & Zoom:** Automate pan and zoom actions and visually assert the diagram responds as expected.
        *   **Metadata Interaction:** Click a specific node and verify that the metadata panel appears with the correct content (e.g., text assertions, screenshot comparisons).
        *   **Filtering Interaction:** Select one or more tags in the `FilterControls`, then visually assert that the correct nodes are highlighted/faded on the diagram (e.g., using screenshot comparison or checking applied CSS classes on SVG elements). Verify reset functionality.
        *   **Responsiveness:** Test on different viewport sizes to ensure the layout remains consistent and usable.
*   **5.4. Manual & Exploratory Testing:**
    *   **Scope:** Comprehensive manual testing across all features, focusing on user experience, edge cases, and unexpected interactions.
    *   **Focus Areas:**
        *   Ad-hoc testing with various generated datasets from the actual monorepo.
        *   Usability review by potential end-users (other engineers).
        *   Browser compatibility checks (if targeting specific browsers beyond standard modern ones).
        *   Accessibility checks (keyboard navigation, screen reader compatibility for interactive elements).

## 6. Testing Tools

*   **Generator Testing:**
    *   **Jest:** Testing framework.
    *   **ts-jest:** Jest transformer for TypeScript.
*   **Frontend Testing:**
    *   **Jest / Vitest:** Testing framework (Vitest is optimized for Vite projects).
    *   **React Testing Library:** For testing React components in a way that encourages good testing practices by focusing on user behavior.
    *   **Playwright / Cypress:** For End-to-End (E2E) browser automation.

## 7. Test Data Management

*   **Generator:** Use small, self-contained TypeScript files with specific JSDoc annotations and expected outputs (`.json`, `.mmd` files) checked into the repository for integration tests.
*   **Frontend:** The `architecture-data.json` produced by the generator will serve as the primary test data. For specific frontend unit/integration tests, smaller mock JSON structures can be used.

## 8. Automation & CI/CD Integration

*   Automated test scripts (e.g., `yarn test:generator`, `yarn test:explorer`, `yarn test:e2e`) will be defined in the respective `package.json` files and triggered from the root monorepo scripts.
*   These scripts will be integrated into the CI/CD pipeline to ensure that tests run automatically on every relevant code commit, preventing regressions and maintaining code quality.

---