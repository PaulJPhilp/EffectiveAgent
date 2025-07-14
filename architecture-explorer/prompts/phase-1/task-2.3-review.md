# Task 2.3: Basic Relationship Inference (Review)

**Goal:**

Verify that the agent has correctly implemented logic to infer relationships between components by analyzing `import` statements.

**Verification Steps:**

1.  **Check for New Module:**
    *   Confirm that the file `packages/architecture-generator/src/RelationshipInferrer.ts` exists.
2.  **Review Inferrer Logic:**
    *   Open `RelationshipInferrer.ts`. The logic should iterate through all source files in the project.
    *   It should correctly identify the source component and the target (imported) component.
    *   It must verify that both the importer and the importee are architectural components before creating an edge.
    *   The `sourceId` and `targetId` for the edge must be the class names of the respective components.
3.  **Review Main Script:**
    *   Open `packages/architecture-generator/src/index.ts`.
    *   Ensure it now loads all `*.ts` files from the `test-data` directory.
    *   Confirm that it calls the new relationship inferrer function and logs the resulting array of edges.
4.  **Execute the Script:**
    *   Navigate to the `packages/architecture-generator` directory in your terminal.
    *   Run the command: `bun run generate`.
5.  **Validate Output:**
    *   Check the console output. It should display an array containing one edge object, representing the dependency of `ImporterComponent` on `SampleComponent`. For example:
        ```json
        [
          {
            "sourceId": "ImporterComponent",
            "targetId": "SampleComponent",
            "label": "depends on"
          }
        ]
        ```
