# Global TypeScript Rules

*   **Type Safety:**
    *   Always declare explicit types for variables, function parameters, and function return values where inference is not obvious or sufficient.
    *   Avoid using `any`. Prefer `unknown` when the type is truly unknown and perform necessary checks or use schema parsing.
    *   Enable and adhere to `strict` mode in `tsconfig.json`.
*   **Types vs. Interfaces:**
    *   Use `type` aliases for defining function signatures, union types, intersection types, mapped types, and object shapes.
    *   Use `type Name = Schema.Schema.Type<typeof NameSchema>` to derive types from Effect Schemas.
    *   Use `type ServiceNameApi = ReturnType<typeof make>` (for sync `make`) or `type ServiceNameApi = Effect.Effect.Success<typeof make>` (for effectful `make`) to derive service API types.
    *   Use `interface` primarily for defining the shape of base data objects (like `BaseEntity`) where declaration merging might be conceptually useful, but `type` is generally preferred.
*   **Enums & Namespaces:**
    *   **Avoid `enum`**. Use string literal unions or `as const` objects.
    *   **Avoid `namespace`**. Use standard ES Modules (`import`/`export`).
*   **Immutability:** Use `readonly` modifier for immutable properties in types/interfaces and `ReadonlyArray<T>` / `Readonly<Record<K, V>>` for collections.
*   **Type Guards:** Use type guards (`Option.isSome`, `Exit.isFailure`, `instanceof`, `Schema.is`) for runtime type checking and narrowing.
*   **Null Checking:** Leverage strict null checks. Use `Option` from Effect for optional values.
*   **Type Assertions:** **Strongly avoid** type assertions (`as Type`, `as unknown as Type`). Use them only as a **last resort** for known limitations (e.g., complex generic inference in test helpers, documented library issues). Document the reason clearly when used. The test helper pattern `as Effect.Effect<..., never, never>` is currently accepted due to persistent inference issues with `Effect.provide` on complex layers.
*   **Exports:** Prefer one logical primary export per file (e.g., the service layer, the main schema). Export related types/errors/schemas from the same file. Use barrel files (`index.ts`) per service module for organizing public exports.
*   **Version Compatibility:** Ensure code is compatible with the project's specified TypeScript version (e.g., v5.x features).
*   **Path Aliases:** Use defined path aliases (`@services/`, `@core/`, etc.) for imports.
