# Global Coding Style

*   **Language:** Use English for all code, comments, and documentation.
*   **Formatting:** Adhere to project formatting standards (enforced by Biome/Prettier). Do not leave unnecessary blank lines within functions. Use Prettier defaults (printWidth: 80).
*   **Readability:** Prioritize clear, maintainable, and human-readable code.
*   **Naming Conventions:**
    *   Use camelCase for variables, functions, and methods.
    *   Use UPPER_CASE for environment variables and true constants.
    *   Use descriptive names that reveal purpose and usage. Use complete words where possible.
    *   Use verbs for boolean variables (e.g., `isLoading`, `hasError`, `canDelete`).
    *   Avoid abbreviations unless universally understood (e.g., API, URL, Id) or standard loop/callback variables (i, j, err, ctx, req, res).
*   **Constants:** Replace hard-coded "magic" values with named constants. Define constants at the top of the file or in dedicated files (e.g., `CONFIG_FILENAME` in `live.ts` for config layers).
*   **Functions & Logic:**
    *   Keep functions short and focused on a single purpose (aim for < 20 lines where practical).
    *   Name functions with a verb indicating their action (e.g., `getUser`, `calculateTotal`, `renderPrompt`). Boolean functions use `isX`, `hasX`, `canX`. Void functions use `executeX`, `saveX`.
    *   Avoid deeply nested blocks; use early returns and extract logic into helper functions or `.pipe()` chains.
    *   Use Effect operators (`Effect.map`, `Effect.flatMap`, etc.) and higher-order functions where they simplify logic.
    *   Use arrow functions for simple callbacks/inline functions (< 3 instructions); use named `function` declarations otherwise.
    *   Use default parameter values where appropriate instead of null/undefined checks within the function body.
    *   Reduce numerous function parameters by using a single input object (Receive Object, Return Object - RO-RO). Declare types for input/output objects.
    *   Maintain a single level of abstraction within a function.
*   **Data Handling:**
    *   Prefer immutability: Use `readonly` for properties, `ReadonlyArray`, `Readonly<Record<...>>`. Use `as const` for constant literals.
    *   Encapsulate data within appropriate types/objects; avoid overusing primitive types (`string`, `number`). Use defined types like `EntityId`, `Timestamp`.
*   **Comments:**
    *   Write code that is as self-documenting as possible.
    *   Use comments primarily to explain *why* something is done a certain way, not *what* it does (especially for complex logic or workarounds).
    *   Use JSDoc for public APIs (exported functions, classes, types, layers).
*   **Principles:** Follow DRY and SOLID principles. Prefer composition over inheritance.
*   **Modularity:** Design for modularity to improve maintainability and reusability.
*   **Error Handling (General):** Implement robust error handling using Effect's error channel. Use specific, typed errors. Handle potential edge cases.
*   **Security:** Always consider security implications.
*   **Performance:** Consider performance implications where relevant.
*   **Version Control:** Write clear commit messages (e.g., using conventional commits `feat:`, `fix:`, `refactor:`, `test:`, `docs:`), make small/focused commits, use meaningful branch names.
