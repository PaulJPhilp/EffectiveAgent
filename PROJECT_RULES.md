# Project Rules for EffectiveAgent

## Import Paths
- Always use absolute import paths (aliased with `@/` for the root `src` directory) for all internal modules and files.
- Do not use relative paths like `../../foo/bar` for imports within the project.
- Example:
  ```ts
  // Good
  import { EffectiveError } from "@/effective-error.js";

  // Bad
  import { EffectiveError } from "../../effective-error.js";
  ```

## Rationale
- Absolute paths improve code readability, maintainability, and reduce errors when refactoring or moving files.
- They provide consistency across the codebase.

## Enforcement
- All contributors must follow this rule for new code and when refactoring existing code.
- PRs that introduce or retain relative paths for internal imports should be updated before merging.

---

_Add further rules as needed to this file._
