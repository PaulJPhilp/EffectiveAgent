# Task 2.3: Basic Relationship Inference (Implementation)

**Goal:**

Extend the generator to infer basic relationships (dependencies) between architectural components by analyzing their `import` statements.

**Instructions:**

1.  **Update Source Loading:** In `packages/architecture-generator/src/index.ts`, modify the project to add all `*.ts` files from the `test-data` directory, not just the single `sample.ts` file.
2.  **Create an Inferrer Module:** Create a new file at `packages/architecture-generator/src/RelationshipInferrer.ts`.
3.  **Implement the Inferrer:**
    *   In `RelationshipInferrer.ts`, create an exported function, for example `inferImportRelationships`, that accepts a `ts-morph` `Project` instance.
    *   This function should iterate through every source file in the project.
    *   For each file, it should identify the architectural component defined within it (the class with `@architectureComponent`).
    *   Then, it should analyze the `import` declarations in that same file. For each import, it must resolve the module to its source file and check if the imported file also contains an architectural component.
    *   If a relationship is found, it should create an `EdgeData` object using the class names of the components as the IDs (e.g., `{ sourceId: 'ImporterComponent', targetId: 'SampleComponent', type: 'depends on' }`).
    *   The function should return an array of all the `EdgeData` objects it discovers.
4.  **Update the Main Script:**
    *   In `packages/architecture-generator/src/index.ts`, import and use your new `inferImportRelationships` function after parsing all the component metadata.
    *   Log the resulting array of relationships to the console.
