# Task 2.2: JSDoc-Based Metadata Extraction (Implementation)

**Goal:**

Enhance the generator to parse JSDoc comments from architectural components and extract key metadata into a structured format.

**Instructions:**

1.  **Create a Parser Module:** Create a new file at `packages/architecture-generator/src/JSDocParser.ts`.
2.  **Implement the Parser:**
    *   In `JSDocParser.ts`, create an exported function, for example `parseComponentJSDoc`, that accepts a `ts-morph` `ClassDeclaration` node as input.
    *   This function should read the JSDoc comments attached to the class.
    *   It must look for and extract the values from the following tags: `@architectureComponent`, `@c4`, `@description`, `@tag`, and `@groupByLayer`.
    *   The function should return an object that conforms to a subset of the `NodeData` interface defined in `src/types.ts`. **Crucially, it must include the `id` field, which should be set to the component's class name** (e.g., `SampleComponent`). You will need to import the necessary types from `./types.ts`.
3.  **Update the Main Script:**
    *   In `packages/architecture-generator/src/index.ts`, import and use your new `parseComponentJSDoc` function.
    *   After finding the class in `sample.ts`, pass it to the parser.
    *   Log the resulting metadata object to the console to verify its contents. The output should be a clean, structured object representing the parsed JSDoc data.
