# Task 2.4: Architecture Model & JSON Output (Implementation)

**Goal:**

Combine the extracted component metadata (nodes) and inferred relationships (edges) into a final `ArchitectureData` model and serialize it to a JSON file.

**Instructions:**

1.  **Create a Builder Module:** Create a new file at `packages/architecture-generator/src/ArchitectureModelBuilder.ts`.
2.  **Implement the Builder:**
    *   In `ArchitectureModelBuilder.ts`, create an exported function, for example `buildArchitectureModel`, that accepts an array of `NodeData` objects and an array of `EdgeData` objects.
    *   This function should assemble these arrays into a single `ArchitectureData` object, which is the root structure defined in `src/types.ts`.
    *   For this initial version, you can hardcode a single `DiagramDefinition` that includes all nodes and edges.
3.  **Create a JSON Serializer:** Create a new file at `packages/architecture-generator/src/JsonSerializer.ts` containing a function that takes an `ArchitectureData` object and a file path, and writes the data to the specified path as a formatted JSON string.
4.  **Update the Main Script:**
    *   In `packages/architecture-generator/src/index.ts`, orchestrate the full pipeline:
        1.  Load all source files.
        2.  Iterate through them to parse JSDoc metadata for each component, creating an array of `NodeData`.
        3.  Run the relationship inferrer to get an array of `EdgeData`.
        4.  Pass the nodes and edges to the `buildArchitectureModel` function.
        5.  Validate the resulting `ArchitectureData` object against the schema defined in `architecture.schema.json` using `ajv`. If validation fails, log a detailed error to the console and exit the process with a non-zero status code.
        6.  Pass the validated `ArchitectureData` object to the JSON serializer function, saving the output to `architecture.json` in the project root.
    *   Remove all `console.log` statements from previous steps, as the final output is now the JSON file.
