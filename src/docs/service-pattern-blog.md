Below is the entire document wrapped in a single Markdown code block. You can copy this whole block into your Markdown file:

```markdown
# Standard Service Pattern (Effect‑TS)

This document outlines the standard pattern for creating services within this project using Effect‑TS (version 3.14+). Adhering to this pattern ensures consistency, maintainability, and leverages the power of Effect for dependency management, error handling, and composition.

---

## Core Components

A standard service consists of the following key parts:

1. **Service Interface (`api.ts`)**:  
   Defines the contract of the service using a TypeScript interface named `ServiceNameApi` (e.g., `LoggingServiceApi`). This file **must** contain complete and correct JSDoc comments for the interface and all its methods, as it serves as the primary documentation for the service.

2. **Service Class Definition (`service.ts`)**:  
   A class that extends `Effect.Service<ServiceNameApi>()`. This file defines the **default implementation** of the service via its `effect` property and lists its `dependencies`. This class also serves as the default layer.

3. **Alternative Implementations (`implementations/`)**:  
   (Optional) Contains alternative layers or implementations of the service interface (e.g., `InMemoryLayer` or `LiveLayer` if different from the default).

4. **Validation Schemas (`schema.ts`)**:  
   (Optional) Contains Effect `Schema` definitions used for validating input or output data within the service.

---

## File Structure Convention

Services typically follow this file structure within their respective directory (e.g., `src/services/core/my-feature/`):

```
my-feature/
├── __tests__/
│   └── service.test.ts          # Unit/integration tests for the service
├── implementations/
│   └── other-impl.layer.ts      # (Optional) Alternative layers/implementations
├── index.ts                     # Barrel file exporting the service interface, default service class, schemas, etc.
├── service.ts                   # Default service class definition (implementation, dependencies, layer)
├── api.ts                       # Service interface (ServiceNameApi) definition with mandatory JSDoc comments.
├── schema.ts                    # (Optional) Effect Schema definitions for validation
├── errors.ts                    # (Optional) Custom error types for the service
└── helpers.ts                   # (Optional) Helper functions specific to the service
```

---

## JSDoc Standard for `api.ts`

The `api.ts` file is the source of truth for the service's contract and documentation. It **must** include comprehensive JSDoc comments.

### Interface JSDoc

- Use `@file` at the top if desired.
- Provide a clear summary description of the service's purpose.
- Optionally use `@remarks` for additional usage notes.
- Optionally list key features or capabilities.
- Optionally include `@example` usage snippets.

### Method JSDoc

- Provide a clear summary of what the method does.
- Use `@param` for each parameter with a description.
- Use `@returns` to detail the `Effect` being returned (including success type `A`, error type `E`, and required services `R`, even if `R` is `never`).
- Optionally include `@remarks` or `@example` sections.
- Use `@template` for generic type parameters if applicable.

#### Example JSDoc (`ServiceMasterApi`)

```typescript
// In src/services/core/service-master/api.ts
/**
 * @file Defines the ServiceMaster API for running Effects.
 */

import { Effect } from "effect";
import type { Either } from "effect/Either";
import type { Exit } from "effect/Exit";

/**
 * Provides utilities for executing Effect workflows in various ways.
 *
 * @example
 * ```typescript
 * const myEffect = Effect.succeed("data");
 * const resultEither = yield* ServiceMaster.runEither(myEffect);
 * const resultExit = yield* ServiceMaster.runExit(myEffect);
 * ```
 */
export interface ServiceMasterApi {
  /**
   * Runs an Effect and returns its outcome wrapped in an Either.
   *
   * On success, the effect yields Either.Right<A>.
   * On failure, the effect yields Either.Left<E>.
   *
   * @param effect The Effect<A, E, R> to execute.
   * @returns An Effect yielding Either<E, A>, with no additional requirements (R = never).
   * @template A The success type of the input Effect.
   * @template E The error type of the input Effect.
   * @template R The requirements of the input Effect (provided internally).
   *
   * @example
   * ```typescript
   * const result = yield* ServiceMaster.runEither(Effect.succeed(1));
   * // result is Right(1)
   * ```
   */
  readonly runEither: <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<Either<E, A>>;

  /**
   * Runs an Effect and returns its full Exit outcome.
   *
   * Captures success (Exit.Success<A>), failure (Exit.Failure<Cause<E>>),
   * and interruption details within the Exit structure.
   *
   * @param effect The Effect<A, E, R> to execute.
   * @returns An Effect yielding Exit<E, A>, with no additional requirements (R = never).
   * @template A The success type of the input Effect.
   * @template E The error type of the input Effect.
   * @template R The requirements of the input Effect (provided internally).
   */
  readonly runExit: <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<Exit<E, A>>;

  /**
   * Runs an Effect synchronously, returning the success value A.
   *
   * @remarks
   * **Warning:** This method will throw a synchronous exception if the Effect fails
   * or includes asynchronous operations. Use with caution.
   *
   * @param effect The Effect<A, E, R> to execute.
   * @returns The success value A.
   * @throws FiberFailure if the Effect fails or is asynchronous.
   * @template A The success type of the input Effect.
   * @template E The error type of the input Effect.
   * @template R The requirements of the input Effect (provided internally).
   */
  readonly unsafeRunSync: <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => A;
}
```

---

## Example: `ServiceMaster`

### 1. `src/services/core/service-master/api.ts`

*(See the example above for complete JSDoc documentation.)*

### 2. `src/services/core/service-master/service.ts`

```typescript
import { Effect } from "effect";
import type { Either } from "effect/Either";
import type { Exit } from "effect/Exit";
import type { ServiceMasterApi } from "./api.js"; // Import the documented API

// Helper functions for swapping generic parameters (for example purposes)
const swapEither = <E, A>(either: Either<A, E>): Either<E, A> => {
  if (either._tag === "Left") {
    return { _tag: "Right", right: either.left } as Either<E, A>;
  } else {
    return { _tag: "Left", left: either.right } as Either<E, A>;
  }
};

const swapExit = <E, A>(exit: Exit<A, E>): Exit<E, A> => {
  return exit as unknown as Exit<E, A>;
};

/**
 * Implementation of the ServiceMaster using the Effect.Service pattern.
 * This service provides utilities for running Effects in various ways.
 */
export class ServiceMaster extends Effect.Service<ServiceMasterApi>()(
  "ServiceMaster",
  {
    effect: Effect.succeed({
      runEither: <A, E, R>(
        effect: Effect.Effect<A, E, R>
      ): Effect.Effect<Either<E, A>> =>
        Effect.map(Effect.either(effect), swapEither),

      runExit: <A, E, R>(
        effect: Effect.Effect<A, E, R>
      ): Effect.Effect<Exit<E, A>> =>
        Effect.map(Effect.exit(effect), swapExit),

      unsafeRunSync: <A, E, R>(effect: Effect.Effect<A, E, R>): A =>
        Effect.runSync(effect),
    }),
    dependencies: [],
  }
) {}
```

### 3. `src/services/core/service-master/index.ts`

```typescript
export * from "./api.js";      // Export the service interface
export * from "./service.js";  // Export the service class (also serves as the layer)
```

---

## Consuming the Service

Services are consumed within other Effect-based components using `yield*` with the **service class name**.

```typescript
import { Effect, Either } from "effect";
import { ServiceMaster } from "@/services/core/service-master"; // from index.ts

const someEffect = Effect.succeed("Success!");
const failingEffect = Effect.fail("Failure!");

const program = Effect.gen(function* () {
  const serviceMaster = yield* ServiceMaster; // Access the service
  
  // Run a succeeding effect using runEither
  const result1: Either<never, string> = yield* serviceMaster.runEither(someEffect);
  
  // Handle the Either result
  yield* Effect.match(Effect.succeed(result1), {
    onLeft: (e) => Effect.logError(`Operation failed: ${e}`),
    onRight: (v) => Effect.logInfo(`Operation succeeded: ${v}`)
  });

  // Run a failing effect using runEither
  const result2: Either<string, never> = yield* serviceMaster.runEither(failingEffect);

  yield* Effect.match(Effect.succeed(result2), {
    onLeft: (e) => Effect.logError(`Operation failed: ${e}`),
    onRight: (v) => Effect.logInfo(`Operation succeeded: ${v}`)
  });

  // Note: unsafeRunSync may throw synchronous exceptions; use with caution.
});

// To run the program, provide the necessary layers (here, ServiceMaster is itself the layer)
// Effect.runPromise(program.pipe(Effect.provide(ServiceMaster)));
```

---

## Testing

Testing services in this pattern generally follows two approaches:

1. **Direct Instantiation with Manual Mocks:**  
   Create a mock implementation conforming to the service interface and instantiate the service class to test its logic using Effect.

2. **Using a Test Harness (Integration/Layer Testing):**  
   Use a shared test harness (e.g., `createServiceTestHarness`) to compose the service with test implementations and run effects using assertions on the resulting `Either`.

Example (Conceptual):

```typescript
// In service.test.ts
import { ServiceMaster } from "../service.js";
import type { ServiceMasterApi } from "../api.js";
import { Effect } from "effect";
import { expect } from "vitest";

let recordedMessages: string[] = [];
const mockServiceMaster: ServiceMasterApi = {
  runEither: (effect) => Effect.sync(() => /* mock implementation */ {}),
  runExit: (effect) => Effect.sync(() => /* mock implementation */ {}),
  unsafeRunSync: (effect) => /* mock implementation */ ""
};

it("should log success messages", async () => {
  const program = mockServiceMaster.runEither(Effect.succeed("Test message"));
  await Effect.runPromise(program);
  expect(recordedMessages).toContain("Test message");
});
```

---

## Idiomatic Effect Patterns

Below are a few frequently used idioms when building Effect-based AI-related libraries:

- **Using `Effect.try`:**  
  Wrap synchronous code that might throw exceptions to lift it into the Effect world.

- **Using `Effect.gen`:**  
  Write complex, sequential Effect workflows using generator functions for improved readability.

- **Using `pipe`:**  
  Chain multiple Effect transformations in a clear, linear fashion.

- **Mapped Errors:**  
  Transform errors from underlying operations into domain-specific errors using operators like `Effect.mapError` and `Effect.catchTag`.

- **Handling Concurrency:**  
  Use `Effect.all` to run multiple Effects concurrently and `Effect.fork` to launch background tasks.

- **Resource Management:**  
  Employ `Effect.acquireRelease` to safely manage resources with guaranteed cleanup.

- **Configuration:**  
  Leverage the `Config` module to declaratively load and validate configuration.

- **Layer Composition:**  
  Compose and provide layers at the application entry point to manage dependency injection across services.

---

## Key Takeaways

- **Clear Separation:**  
  The service interface (`api.ts`) and its implementation (`service.ts`) are clearly separated, promoting a contract-driven approach.

- **Proven Idioms:**  
  Idioms like `Effect.try`, `Effect.gen`, and `pipe` have been very useful in building a robust framework.  
  **YMMV:** These idioms represent one approach; your mileage may vary based on specific project needs.

- **Testing Flexibility:**  
  Both manual mocks and a test harness approach offer flexible options for testing your services.

- **Layer Composition:**  
  Proper layer composition at the application entry point is key to managing dependencies effectively.

- **Practical for AI-Related Applications:**  
  These patterns and idioms are directly applicable to developing AI-related libraries and frameworks, ensuring maintainability and scalability.

---

## Conclusion

The standard service pattern described here emphasizes consistency, maintainability, and the power of Effect‑TS. These patterns and idioms have proven useful for managing asynchronous operations, error handling, and dependency injection in AI-related applications. Remember, while this document covers the idioms found useful in building a framework, **YMMV**—adapt them to best fit your project's needs.

Happy coding!
```

This is a single Markdown code block containing the entire document.