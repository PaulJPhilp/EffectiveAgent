# Producer Pattern Design Document

## What is a Producer?
A **Producer** is a service module responsible for generating, transforming, or enriching data using AI models or external providers. Producers encapsulate the logic for interacting with provider APIs, handling errors, and exposing a clear, typed API for consumers within the platform.

Producers are used by higher-level services or workflows to obtain AI-generated artifacts (such as embeddings, completions, summaries, etc.) in a consistent, maintainable, and testable way.

---

## Producer Service Pattern

The Producer pattern is implemented using the following structure:

1. **Service Implementation**
   - Each producer exposes a single main service class (e.g., `EmbeddingService`).
   - The service class implements business logic, error handling, and dependency injection via constructor parameters.
   - All public methods return an `Effect` with explicit error types (never `any`).
   - Service instantiation is done via a `make` function or static factory method.
   - Errors are defined in a dedicated `errors.ts` file, with each error class extending `EffectiveError`.

2. **Service API**
   - The public API interface for the service is defined in a separate `api.ts` file.
   - This interface describes all public methods, their parameters, return types, and error contracts using JSDoc.
   - The service implementation imports and implements this API interface.

3. **Error Handling**
   - All error types are explicit, well-documented, and composable as a union type (e.g., `EmbeddingServiceError`).
   - Errors include rich context (description, module, method, cause, and relevant fields).

---

## Testing Producers

- **Test Suite Location:**
  - All tests for a producer are placed in a `__tests__` directory colocated with the producer module (e.g., `producers/embedding/__tests__/`).

- **Test Harness and Utilities:**
  - Test suites use shared test harness utilities (e.g., `createAiTestHarness`) to provide consistent setup, teardown, and mocking.
  - Common helpers (such as assertion utilities) are imported from the shared `test-utils` package.
  - Tests are written using Vitest and @effect/vitest, never Jest.

- **Test Structure:**
  - Tests are organized by scenario (normal, invalid, edge cases), using the harness for all cases.
  - Test helpers are either colocated in the test file or imported from test-utils, but never rely on global state.

---

## Summary of Key Standards

- **API interfaces go in `api.ts`.**
- **Service logic and implementation go in `service.ts`.**
- **Errors are defined in `errors.ts`, with a union type for all service errors.**
- **Tests go in `__tests__` and use the shared test harness/utilities.**
- **No use of Context.Tag or Layer-based DI; always use direct class references and constructor injection.**
- **All public methods return typed `Effect` instances with explicit error types.**

---

This pattern ensures all producers are maintainable, testable, and consistent across the codebase. Use the EmbeddingService as a reference implementation when creating or refactoring other producers.
