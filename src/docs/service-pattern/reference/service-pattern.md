---
status: LOCKED_REFERENCE
version: 1.0
last_modified: 2024-03-20
protection: reference_implementation
do_not_modify: true
---

# Service Pattern Reference (Effect-TS v3.16+)

This document describes the **current, canonical pattern** for defining services using Effect-TS (v3.16+) in this codebase. All new and refactored services must follow this approach for maintainability, type safety, and composability.

## Core Components

A standard service consists of:

1.  **Service Interface (`api.ts`)**: TypeScript interface named `ServiceNameApi` with full JSDoc on the interface and all methods. This is the contract for consumers and implementors.
2.  **Service Class (`service.ts`)**: `export class ServiceName extends Effect.Service<ServiceNameApi>()("ServiceName", { effect, dependencies }) { }`. Implements the default layer and tag. The `effect` property provides the implementation (using `Effect.succeed` or `Effect.gen`). The `dependencies` array lists required services (empty if none).
3.  **Alternative Implementations (`implementations/`)**: (Optional) For in-memory, live, or mock variants.
4.  **Schemas (`schema.ts`)**: (Optional) Effect-based schemas for input/output validation.
5.  **Error Types (`errors.ts`)**: (Optional) Custom error classes using `Data.TaggedError`.
6.  **Barrel (`index.ts`)**: Exports the service class, interface, schemas, and errors.
7.  **Test Harness**: Use `createServiceTestHarness` for effectful testing and mocking.

## File Structure

```
my-feature/
├── __tests__/
│   └── service.test.ts
├── implementations/
│   └── other-impl.layer.ts
├── index.ts
├── service.ts
├── api.ts
├── schema.ts
├── errors.ts
└── helpers.ts
```

## Interface & JSDoc Requirements

- Place all method signatures in `ServiceNameApi`.
- Every method and the interface itself must have clear, English JSDoc.
- Use `@param`, `@returns`, and `@template` as appropriate. Always specify Effect types fully.
- Example:

```typescript
/**
 * Provides utilities for executing Effect workflows.
 * @remarks Centralizes common Effect running patterns.
 */
export interface ServiceMasterApi {
  /**
   * Runs an Effect and returns Either.
   * @param effect The Effect to execute.
   * @returns An Effect yielding Either<E, A>.
   */
  readonly runEither: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<Either<E, A>>;
}
```

## Service Class Pattern

- Always use:

```typescript
export class MyService extends Effect.Service<MyServiceApi>()(
  "MyService",
  {
    effect: Effect.gen(function* () {
      // Implementation
      return {
        // methods
      };
    }),
    dependencies: [OtherService] // or []
  }
) { }
```

- The class itself is the Layer and Tag. Do **not** use `Context.Tag` (except for legacy Repository).
- The `effect` property can use `Effect.succeed` (for sync) or `Effect.gen` (for async/complex).
- `dependencies` is an array of required services (empty if none).

## Anti-Patterns

- **Do not use `Context.Tag`** for new services (except legacy Repository).
- Do not define multiple service classes in one file.
- Do not omit JSDoc or use `any` types.

## Example: SkillService

**api.ts**
```typescript
/**
 * @file SkillService API
 * Provides registration, lookup, and invocation of skills.
 */
export interface SkillServiceApi {
  /**
   * Registers a new skill.
   * @param definition The skill definition object.
   * @returns An Effect yielding the registered skill.
   */
  register(definition: SkillDefinition): Effect.Effect<RegisteredSkill, SkillConfigError>;
  // ...other methods
}
```

**service.ts**
```typescript
export class SkillService extends Effect.Service<SkillServiceApi>()(
  "SkillService",
  {
    effect: Effect.gen(function* () {
      // Internal state, helpers, etc.
      return {
        register: (definition) => /* ... */
        // ...other methods
      };
    }),
    dependencies: []
  }
) { }
```

## Testing Pattern

- Use a test harness to inject the service and provide effectful mocks.
- Example:

```typescript
export const createServiceTestHarness = <R, E, A>(
  Service: Effect.Service<A, E, R>,
  createTestImpl?: () => Effect.Effect<A>
) => ({
  runTest: (effect: Effect.Effect<any>) =>
    Effect.runPromise(effect.pipe(Effect.provide(Service))),
  expectError: (effect: Effect.Effect<any>, errorTag: string) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* Effect.either(effect)
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left._tag).toBe(errorTag)
        }
      }).pipe(Effect.provide(Service))
    )
});
```

- In tests, use `Effect.gen` to call service methods. Provide mocks as needed using effectful factories.

## Summary

- Always use the `Effect.Service` class pattern.
- Fully document interfaces and methods.
- List all dependencies explicitly.
- Use a test harness for effectful, type-safe testing.
- Avoid Context.Tag except for repository.
- Keep all code and docs in English and TypeScript.

## File Structure Convention

Services typically follow this file structure within their respective directory (e.g., `src/services/core/my-feature/`):

```
my-feature/
├── __tests__/
│   └── service.test.ts          # Unit/integration tests for the service
├── implementations/
│   └── other-impl.layer.ts    # (Optional) Alternative layers/implementations
├── index.ts                     # Barrel file exporting the service interface, default service class, schemas etc.
├── service.ts                   # Default service class definition (implementation, dependencies, layer)
├── api.ts                       # Service interface (ServiceNameApi) definition with mandatory JSDoc comments.
├── schema.ts                    # (Optional) Effect Schema definitions for validation
├── errors.ts                    # (Optional) Custom error types for the service
└── helpers.ts                   # (Optional) Helper functions specific to the service
```

## JSDoc Standard for `api.ts`

The `api.ts` file is the source of truth for the service's contract and documentation. It must include comprehensive JSDoc comments.

**Interface JSDoc:**

*   Use `@file` at the top if desired.
*   Provide a clear summary description of the service's purpose.
*   Optionally use `@remarks` for more detailed explanations or usage notes.
*   Optionally list key features or capabilities.
*   Optionally include `@example` usage snippets.

**Method JSDoc:**

*   Provide a clear summary description of the method's purpose.
*   Use `@param` for each parameter, specifying its name and description.
*   Use `@returns` to describe the `Effect` being returned, including the success type (`A`), error type (`E`), and required services (`R`), even if `R` is `never`.
*   Optionally use `@remarks` for implementation details, constraints, or edge cases.
*   Optionally use `@example` to show how to use the method.
*   Use `@template` for generic type parameters if applicable.

**Example JSDoc (`ServiceMasterApi`):**

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
 * @remarks
 * This service centralizes common Effect running patterns, allowing consumers
 * to choose between Promise-based, Either-based, or Exit-based results,
 * as well as synchronous execution (with appropriate caveats).
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
   * @returns An Effect yielding Either<E, A>, requiring no services (R = never).
   * @template A The success type of the input Effect.
   * @template E The error type of the input Effect.
   * @template R The requirements of the input Effect (will be provided internally).
   *
   * @example
   * ```typescript
   * const result = yield* ServiceMaster.runEither(Effect.succeed(1));
   * // result is Right(1)
   * const result2 = yield* ServiceMaster.runEither(Effect.fail("error"));
   * // result2 is Left("error")
   * ```
   */
  readonly runEither: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<Either<E, A>>; // R becomes never here

  /**
   * Runs an Effect and returns its full Exit outcome.
   *
   * Captures success (Exit.Success<A>), failure (Exit.Failure<Cause<E>>),
   * and interruption details within the Exit structure.
   *
   * @param effect The Effect<A, E, R> to execute.
   * @returns An Effect yielding Exit<E, A>, requiring no services (R = never).
   * @template A The success type of the input Effect.
   * @template E The error type of the input Effect.
   * @template R The requirements of the input Effect (will be provided internally).
   */
  readonly runExit: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<Exit<E, A>>;

  /**
   * Runs an Effect synchronously, returning the success value A.
   *
   * @remarks
   * **Warning:** This method will throw a synchronous exception if the Effect fails
   * or involves asynchronous operations that cannot be completed synchronously.
   * Use with extreme caution, primarily for simple, known-synchronous Effects
   * or in testing scenarios where failure is explicitly handled via try/catch.
   * Prefer runEither or runExit for safe handling of potential failures.
   *
   * @param effect The Effect<A, E, R> to execute synchronously.
   * @returns The success value A.
   * @throws FiberFailure if the Effect fails or is asynchronous.
   * @template A The success type of the input Effect.
   * @template E The error type of the input Effect.
   * @template R The requirements of the input Effect (will be provided internally).
   */
  readonly unsafeRunSync: <A, E, R>(effect: Effect.Effect<A, E, R>) => A;
}

## Example: `ServiceMaster`

Let's illustrate with the `ServiceMaster` service, which provides utilities for running Effects.

**1. `src/services/core/service-master/api.ts`**

*(See JSDoc example above for the content of this file)*

**2. `src/services/core/service-master/service.ts`**

```typescript
import { Effect } from "effect";
import type { Either } from "effect/Either";
import type { Exit } from "effect/Exit";
import type { ServiceMasterApi } from "./api.js"; // Import the documented API

// Helper function to swap the generic parameters in Either
// Note: In a real service, helpers might be in helpers.ts
const swapEither = <E, A>(either: Either<A, E>): Either<E, A> => {
  if (either._tag === "Left") {
    return { _tag: "Right", right: either.left } as Either<E, A>;
  } else {
    return { _tag: "Left", left: either.right } as Either<E, A>;
  }
};

// Helper function to swap the generic parameters in Exit
// Note: In a real service, helpers might be in helpers.ts
const swapExit = <E, A>(exit: Exit<A, E>): Exit<E, A> => {
  return exit as unknown as Exit<E, A>; // Type assertion for simplicity in example
};

/**
 * Implementation of the ServiceMaster using Effect.Service pattern.
 * Provides utilities for running Effects in different ways.
 */
export class ServiceMaster extends Effect.Service<ServiceMasterApi>()( // Use ServiceMasterApi
  "ServiceMaster", // String identifier
  {
    effect: Effect.succeed({
      runEither: <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<Either<E, A>> =>
        Effect.map(Effect.either(effect), swapEither),

      runExit: <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<Exit<E, A>> =>
        Effect.map(Effect.exit(effect), swapExit),

      unsafeRunSync: <A, E, R>(effect: Effect.Effect<A, E, R>): A =>
        Effect.runSync(effect),
    }),
    dependencies: [], // No dependencies for this service
  }
) {}
```

**3. `src/services/core/service-master/index.ts`**

```typescript
export * from "./api.js";      // Export interface
export * from "./service.js";  // Export service class (which is also the layer)
```

## Consuming the Service

Services are consumed within other Effect-based components using `yield*` with the **service class name**:

```typescript
import { Effect, Either } from "effect";
import { ServiceMaster } from "@/services/core/service-master"; // Assuming index.ts export

const someEffect = Effect.succeed("Success!");
const failingEffect = Effect.fail("Failure!");

const program = Effect.gen(function* () {
  const serviceMaster = yield* ServiceMaster; // Access the service via its class name
  
  // Run a succeeding effect using runEither
  const result1: Either<never, string> = yield* serviceMaster.runEither(someEffect);
  
  // Idiomatically handle the Either result within Effect
  yield* Effect.match(Effect.succeed(result1), {
    onLeft: (e) => Effect.logError(`Operation failed: ${e}`), // This won't run
    onRight: (v) => Effect.logInfo(`Operation succeeded: ${v}`)
  });
  // Output: timestamp=... level=INFO fiber=#... message="Operation succeeded: Success!"

  // Run a failing effect using runEither
  const result2: Either<string, never> = yield* serviceMaster.runEither(failingEffect);

  // Idiomatically handle the Either result within Effect
  yield* Effect.match(Effect.succeed(result2), { // Wrap result2 in Effect to use Effect.match
    onLeft: (e) => Effect.logError(`Operation failed: ${e}`),
    onRight: (v) => Effect.logInfo(`Operation succeeded: ${v}`) // This won't run
  });
  // Output: timestamp=... level=ERROR fiber=#... message="Operation failed: Failure!"

  // Note: unsafeRunSync is available but throws synchronous exceptions
  // requiring try...catch, which is generally avoided in Effect workflows.
  // Prefer runEither or runExit for safer error handling within Effect.
});

// To run, provide the necessary layers (the service class itself is the layer)
// Effect.runPromise(program.pipe(Effect.provide(ServiceMaster)));
```

## Testing

Testing Effect services involves verifying the logic within the service implementation. Two common approaches are observed:

**1. Direct Instantiation with Manual Mocks (Unit Testing Logic)**

For unit testing the internal logic of service methods, especially when dependencies are simple or easily mocked:

*   **Create a Mock Implementation**: Define an object that conforms to the service interface (`ServiceNameApi`). Implement the methods with mock behavior (e.g., return fixed values, record calls, interact with a simple state like an array or map).
*   **Instantiate Service Class**: Directly instantiate the service class (`service.ts`), potentially passing the mock implementation via its constructor if designed for injection (this is not strictly part of the `Effect.Service` pattern itself but a common technique).
*   **Run Effects**: In your tests (`it` blocks), use `Effect.gen` to call methods on the mock implementation or the instantiated service (if constructor injection was used).
*   **Assert**: Verify the results of the effects or check the state of your mock (e.g., recorded calls, state changes).

   *Example (Conceptual, based on LoggingService test):*
   ```typescript
   // In service.test.ts
   import { LoggingService } from "../service.js";
   import type { LoggingServiceApi } from "../api.js";
   import { Effect, LogLevel } from "effect";
   import { expect } from "vitest";

   let recordedMessages: string[] = [];
   const mockLogger: LoggingServiceApi = {
     info: (msg) => Effect.sync(() => { recordedMessages.push(msg); }),
     // ... other methods mocked
   };

   // Assuming LoggingService constructor takes the implementation (example purpose only)
   // const testService = new LoggingService(mockLogger); 

   it("should log info messages", async () => {
     const program = mockLogger.info("Test message"); // Call mock directly
     await Effect.runPromise(program);
     expect(recordedMessages).toContain("Test message");
   });
   ```

**2. Using the Test Harness (Integration/Layer Testing)**

For testing service interactions within the Effect context, especially when dealing with dependencies and layers, the shared test harness is the standard approach (as outlined in the `effect-service-test` guidelines):

*   **Import Harness**: Import `createServiceTestHarness` from `@core/test-utils/effect-test-harness.js`.
*   **Import Service Class**: Import the service class itself (e.g., `MyService` from `service.ts`).
*   **Define Test Implementation Factory (`createTestImpl`)**: Create an `Effect` that returns an object conforming to the service interface (`ServiceNameApi`). This mock might use `Ref` for stateful behavior.
*   **Create Harness**: Instantiate the harness: `const harness = createServiceTestHarness(MyService, createTestImpl);`.
*   **Write Tests**: Within `it` blocks:
    *   Define the test `Effect` using `Effect.gen`.
    *   Access the service using `yield* MyService` (the harness provides this).
    *   Call service methods.
    *   Run the test using `harness.runTest(effect)` for success cases or `harness.expectError(effect, "ErrorTag")` to assert specific failures.

   *Example (From `effect-service-test` rule):*
   ```typescript
   import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js";
   import { MyService } from "../service.js"; // Service Class
   import type { MyServiceApi } from "../api.js"; // Use ServiceNameApi convention
   import { Effect, Ref } from "effect";
   import { expect } from "vitest";

   const createTestImpl = () => {
     return Effect.gen(function* () {
       const store = yield* Ref.make(new Map());
       const operation1 = (input: any): Effect.Effect<any, any> => {
         // Mock implementation using store
         return Effect.succeed({ output: input }); 
       };
       return { operation1 } satisfies Partial<MyServiceApi>; // Use Partial if mocking subset
     });
   };

   const serviceHarness = createServiceTestHarness(MyService, createTestImpl);

   it("should perform operation1 successfully", async () => {
     const testInput = { data: "test" };
     const effect = Effect.gen(function* () {
       const service = yield* MyService;
       const result = yield* service.operation1(testInput);
       expect(result).toEqual({ output: testInput });
       return result;
     });
     await serviceHarness.runTest(effect);
   });
   ```

Choose the testing approach based on whether you need to test the isolated logic (manual mock) or the service's behavior within the Effect ecosystem (test harness).

## Idiomatic Effect Patterns for Services

This section covers common Effect patterns used when implementing and consuming services, promoting safety, composability, and clear error handling.

### `Effect.try`

**What it is:**
`Effect.try` takes a synchronous function (`() => A`) that might throw an exception and lifts it into the Effect context. It returns an `Effect<A, unknown>`, where the success channel contains the function's return value (`A`) and the failure channel captures any thrown exception (typed as `unknown` by default, often requires mapping).

**When to use it & Why:**
Use `Effect.try` inside service implementations (`service.ts`) when you need to interact with synchronous code that *could throw an exception*. This commonly occurs when using:

*   Native Node.js APIs used synchronously (though prefer Effect's platform services like `FileSystem` when available).
*   Third-party libraries that don't have Effect-native wrappers and rely on throwing exceptions for errors.
*   Built-in JavaScript functions known to throw (e.g., `JSON.parse`).

The primary benefit is **bringing potentially unsafe synchronous operations into the Effect error channel**. Instead of needing a `try...catch` block (which is generally avoided), the potential exception becomes a typed error within Effect, allowing you to handle it consistently using combinators like `Effect.mapError`, `Effect.catchTag`, etc.

**Example (Inside a Service Implementation):**

```typescript
// In service.ts
import { Effect } from "effect";
import * as FileSystem from "@effect/platform"; // Assuming usage of FileSystem service

// ... inside the 'effect' factory ...

const parseConfigFile = (filePath: string): Effect.Effect<object, Error | FileSystem.FileSystemError> => 
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem;
    const rawContent = yield* fs.readFileString(filePath); // Effectful file reading

    // Use Effect.try to safely parse potentially invalid JSON
    const config = yield* Effect.try({
      try: () => JSON.parse(rawContent), // This synchronous function can throw
      catch: (unknownError) => new Error(`Failed to parse config: ${unknownError}`)
    });

    // Further validation/processing...
    return config;
  });

// ... rest of service implementation ...
```

**When NOT to use it & Why:**

*   **Asynchronous Operations:** If the function returns a `Promise`, use `Effect.tryPromise` instead.
*   **Functions Already Returning `Effect`:** If a function already returns an `Effect`, simply use or `yield*` it directly. Wrapping it in `Effect.try` is unnecessary and incorrect.
*   **Pure Effect Logic:** Don't wrap standard Effect combinators or pure functions that don't throw exceptions in `Effect.try`.

### `Effect.gen`

**What it is:**
`Effect.gen` provides a way to write complex, sequential Effect workflows using generator function syntax (`function*`). Inside the generator, you use `yield*` to resolve Effects and access their success values, making the code resemble familiar synchronous `async/await` patterns.

**When to use it & Why:**
Use `Effect.gen` when your service method involves **multiple sequential steps**, especially when:

*   You need to **access dependencies** using `yield* ServiceName`.
*   You need to **call multiple Effect-returning functions** (other service methods, helper functions) and use their results in subsequent steps.
*   The alternative using nested `Effect.flatMap` or `pipe` becomes difficult to read and manage.

`Effect.gen` significantly improves the **readability and maintainability** of complex asynchronous and potentially failing workflows by flattening the composition structure.

**Important Note:** Avoid using the underscore parameter (`function* (_)`) as it's considered an older style. Directly yield the service tag or effect: `yield* ServiceTag` or `yield* someEffect`.

**Example (Inside a Service Implementation):**

```typescript
// In service.ts
import { Effect } from "effect";
import { UserService } from "@/services/user/api.js"; // Example dependency
import { PermissionsService } from "@/services/permissions/api.js"; // Example dependency
import { TaskService } from "@/services/tasks/api.js"; // Example dependency
import { UserError, PermissionsError, TaskError } from "./errors.js"; // Example errors

// ... inside the service class ...

const assignTaskWithPermissions = (userId: string, taskId: string): Effect.Effect<void, UserError | PermissionsError | TaskError> =>
  Effect.gen(function* () {
    // 1. Access dependencies
    const userService = yield* UserService;
    const permissionsService = yield* PermissionsService;
    const taskService = yield* TaskService;

    // 2. Call Effect-returning methods sequentially
    const user = yield* userService.getUser(userId).pipe(
      Effect.mapError(e => new UserError({ message: "User fetch failed", cause: e }))
    );

    // Use user result in the next step
    const hasPermission = yield* permissionsService.checkTaskAssignPermission(user.role, taskId).pipe(
      Effect.mapError(e => new PermissionsError({ message: "Permission check failed", cause: e }))
    );

    if (!hasPermission) {
      return yield* Effect.fail(new PermissionsError({ message: "User lacks permission to assign task" }));
    }

    // 3. Final step
    yield* taskService.assignTaskToUser(taskId, userId).pipe(
      Effect.mapError(e => new TaskError({ message: "Task assignment failed", cause: e }))
    );

    // No explicit return needed for Effect<void>
  });

// ... rest of service implementation ...
```

**When NOT to use it & Why:**

*   **Single Operation:** If your workflow involves only a single Effect operation (e.g., accessing one dependency and calling one method), using `Effect.gen` adds unnecessary boilerplate. A direct `pipe` or method call is simpler: `yield* MyService.operation(input)` or `MyService.pipe(Effect.flatMap(s => s.operation(input)))`.
*   **Simple Mapping/Filtering:** For straightforward transformations on a single Effect result, `Effect.map`, `Effect.filterOrFail`, etc., are often more concise than `Effect.gen`.

### `pipe`

**What it is:**
`pipe` is a standalone helper function (imported from `effect` or `effect/Function`) that takes an initial value (in our case, usually an `Effect`) as the first argument, followed by a sequence of functions. Each function in the sequence receives the result of the previous one, allowing for a clear, top-to-bottom composition chain.

**When to use it & Why:**
Use `pipe` extensively when you need to **apply multiple operations or transformations** to an initial `Effect`. It's the primary way to chain Effect operators like:

*   `Effect.map`: Transform the success value.
*   `Effect.flatMap`: Chain another Effect-returning operation based on the success value.
*   `Effect.mapError`: Transform the error value.
*   `Effect.catchTag`, `Effect.catchAll`: Handle specific errors or all errors.
*   `Effect.filterOrFail`: Filter the success value, failing if the predicate is not met.
*   `Effect.tap`: Perform a side-effect without changing the value.
*   `Effect.annotateLogs`, `Effect.withSpan`: Add observability.
*   ...and many others.

The primary benefit of `pipe` is **readability and composability**. It avoids deeply nested function calls `f(g(h(initialEffect)))` and presents the flow of operations linearly.

**Example (Inside a Service Implementation):**

```typescript
// In service.ts
import { Effect, pipe } from "effect";
import { HttpClientService } from "@/services/http/api.js"; // Example dependency
import { DataError, NetworkError, ValidationError } from "./errors.js"; // Example errors
import * as S from "@effect/schema/Schema"; // Schema for validation

// Example Schema
const ResponseSchema = S.Struct({ data: S.String });

// ... inside the service class ...

const fetchDataAndValidate = (url: string): Effect.Effect<string, DataError | NetworkError | ValidationError> =>
  pipe(
    // 1. Initial Effect: Access dependency and make HTTP call
    HttpClientService,
    Effect.flatMap(client => client.get(url)),
    Effect.mapError(e => new NetworkError({ message: `HTTP request failed`, cause: e })), // Map initial network error

    // 2. Chain operations using pipe
    Effect.flatMap(response => 
      Effect.tryPromise({ // Use tryPromise for response.json()
        try: () => response.json() as Promise<unknown>,
        catch: (e) => new DataError({ message: "Failed to parse JSON", cause: e })
      })
    ),
    Effect.flatMap(json =>
      S.decodeUnknown(ResponseSchema)(json).pipe( // Use pipe for schema decoding too
        Effect.mapError(e => new ValidationError({ message: "Invalid response schema", cause: e }))
      )
    ),
    Effect.map(decoded => decoded.data), // Extract the data field
    Effect.tap(data => Effect.logDebug(`Successfully fetched and validated data: ${data}`)), // Log success
    Effect.annotateLogs({ // Add log context
      service: "MyDataService",
      operation: "fetchDataAndValidate",
      url: url
    })
  );

// ... rest of service implementation ...
```

**When NOT to use it & Why:**

*   **Complex Sequential Logic with Intermediate Values:** If your workflow involves many steps where you need to `yield` intermediate results and use them later in complex ways (like multiple independent data fetches feeding into a final calculation), `Effect.gen` often provides better readability for managing those intermediate variables.
*   **Single Simple Operation:** If you are just applying one simple operation (like `Effect.map`), a direct method call might be slightly more concise, although using `pipe` is never wrong: `myEffect.pipe(Effect.map(f))` vs `Effect.map(myEffect, f)`.

### Mapped Errors

**What it is:**
This idiom refers to the practice of catching errors from underlying operations (dependencies, unsafe functions, etc.) and transforming them into specific, domain-relevant errors for the current service or function. This is primarily achieved using Effect operators like `Effect.mapError`, `Effect.catchTag`, `Effect.catchAll`, and the `catch` handler within `Effect.try` / `Effect.tryPromise`.

**Why it's important:**
Mapping errors ensures that:

*   **Consumers know what to expect:** The error type (`E` in `Effect<A, E, R>`) accurately reflects the *possible* failures originating from *this specific service method*, not just any error from deep within its dependencies.
*   **Encapsulation:** Implementation details (like a dependency using a specific network error) are hidden. Consumers only need to handle the domain errors defined by the service they are directly interacting with.
*   **Clear Error Handling:** It allows for precise error handling using Effect's tagged errors and related combinators.

**Examples:**
This pattern is demonstrated extensively in the previous examples:

*   The **`pipe`** example shows mapping network errors, JSON parsing errors, and schema validation errors into specific `NetworkError`, `DataError`, and `ValidationError` types.
*   The **`Effect.gen`** example shows mapping errors from `UserService`, `PermissionsService`, and `TaskService` into corresponding domain errors.
*   The **`Effect.try`** example uses the `catch` handler to map a generic parsing exception into a specific `Error`.

Consistently applying the Mapped Errors idiom is crucial for building robust and maintainable Effect-based applications.

### Managing State with `Ref`

**What it is:**
`Ref<A>` is an Effect data type representing a **mutable reference** to a value of type `A`. It provides atomic operations (`Ref.get`, `Ref.set`, `Ref.update`, `Ref.modify`) to safely read and modify the contained value within the Effect concurrency model.

**When to use it & Why:**
Use `Ref` inside the **implementation factory (`effect: ...`)** of a service definition (`service.ts`) when that specific service implementation needs to manage **internal, mutable state**. Common use cases include:

*   **In-Memory Stores/Caches:** Simple, non-persistent storage scoped to the lifetime of the service layer (often used for testing or basic implementations).
*   **Counters or Accumulators:** Tracking internal metrics or state changes within the service instance.
*   **Simple State Machines:** Managing the internal state transitions of a service instance.

Using `Ref` ensures that state manipulations are **fiber-safe**. Multiple concurrent fibers interacting with the same service instance won't cause race conditions when modifying the state via `Ref`'s atomic operations.

The `Ref` is typically created *inside* the `Effect.gen` (or other Effect constructor) used for the `effect` property in the service definition. This ensures that each instance of the service layer gets its *own* independent state reference.

**Example (Inside a Service Implementation - In-Memory Counter):**

```typescript
// In service.ts
import { Effect, Ref } from "effect";
import type { ICounterService } from "./api.js"; // Assuming api.ts defines ICounterService

// ... inside the service class definition ...
export class CounterService extends Effect.Service<ICounterService>()(
  "CounterService",
  {
    effect: Effect.gen(function* () {
      // Create the Ref inside the factory - it holds the state
      const countRef = yield* Ref.make(0); 

      const increment = (amount: number): Effect.Effect<void> => 
        Ref.update(countRef, (current) => current + amount);

      const decrement = (amount: number): Effect.Effect<void> => 
        Ref.update(countRef, (current) => current - amount);

      const get = (): Effect.Effect<number> => 
        Ref.get(countRef);

      const reset = (): Effect.Effect<void> => 
        Ref.set(countRef, 0);

      // Return the implementation using the Ref
      return {
        increment,
        decrement,
        get,
        reset
      } satisfies ICounterService;
    }),
    dependencies: []
  }
) {}
```

**When NOT to use it & Why:**

*   **Persistent State:** `Ref` state is lost when the application or service layer restarts. For data that needs to persist, use a database or a dedicated persistent storage service (like the `Repository` service).
*   **Shared Application State:** If state needs to be shared across *different* service instances or application components, `Ref` created within a single service factory is usually not the right tool. Consider creating a dedicated state management service that holds the `Ref` and is provided globally.
*   **Immutable Data Flow:** If the logic can be achieved purely through transforming inputs to outputs without needing mutable internal state, prefer an immutable approach.
*   **Configuration:** Service configuration should typically be handled via the `Config` service, not stored in a `Ref`.

### `Effect.tryPromise`

**What it is:**
`Effect.tryPromise` takes a function that returns a `Promise<A>` (or an options object with `try` and `catch` handlers) and lifts it into the Effect context. It returns an `Effect<A, unknown>` (or `Effect<A, E>` if a `catch` handler is provided), where the success channel contains the Promise's resolved value (`A`) and the failure channel captures any promise rejection or exception thrown by the `catch` handler.

**When to use it & Why:**
Use `Effect.tryPromise` inside service implementations (`service.ts`) whenever you need to interact with **asynchronous code that returns a `Promise`**. This is essential for integrating with:

*   Most standard Node.js asynchronous APIs.
*   Third-party libraries that provide Promise-based APIs (e.g., database clients, external API SDKs).
*   Functions using `async/await` syntax.

Similar to `Effect.try`, the benefit is **bringing potentially failing asynchronous operations into the Effect error channel** safely. It allows you to compose Promise-based logic within your Effect workflows and handle potential rejections consistently using Effect's error handling combinators.

**Example (Inside a Service Implementation - Fetching from API):**

```typescript
// In service.ts
import { Effect, pipe } from "effect";
import { NetworkError, ThirdPartyError } from "./errors.js"; // Example errors
import fetch from "node-fetch"; // Example: Using a Promise-based fetch

// ... inside the service class ...

const fetchUserData = (userId: string): Effect.Effect<{ name: string }, NetworkError | ThirdPartyError> =>
  pipe(
    Effect.tryPromise({
      try: () => fetch(`https://api.example.com/users/${userId}`),
      // Map rejection (e.g., network issue) to a domain error
      catch: (unknownError) => new NetworkError({ message: `Failed to fetch user data`, cause: unknownError })
    }),
    // Chain operations using pipe
    Effect.flatMap(response =>
      Effect.tryPromise({
        // Map rejection (e.g., invalid JSON) to a domain error
        try: () => response.json() as Promise<{ name: string }>, // Assuming API returns { name: string }
        catch: (unknownError) => new ThirdPartyError({ message: "Failed to parse user JSON from API", cause: unknownError })
      })
    )
    // Optionally map the success value or add logging
    // Effect.map(userData => ({ ...userData, fetchedAt: Date.now() }))
  );

// ... rest of service implementation ...
```

**When NOT to use it & Why:**

*   **Synchronous Operations:** If the function is synchronous and might throw, use `Effect.try` instead.
*   **Functions Already Returning `Effect`:** If a function already returns an `Effect`, simply use or `yield*` it directly. Wrapping it in `Effect.tryPromise` is unnecessary and incorrect.

### Error Handling (`Effect.catchAll`, `Effect.catchTag`)

**What it is:**
Effect provides powerful combinators to handle failures within the error channel (`E` in `Effect<A, E, R>`). Key patterns include:

*   **`Effect.catchAll`**: Catches *any* error in the Effect's failure channel. It takes a callback function `(error: E) => Effect<A2, E2, R2>` that receives the caught error and must return a *new* Effect. This new Effect can represent a successful recovery value (`Effect.succeed`), a different error (`Effect.fail`), or another operation entirely.
*   **`Effect.catchTag`**: Catches only errors that match a specific *tag* (typically the `_tag` property of a tagged error class). It takes the tag value and a callback function `(error: Extract<E, { _tag: K }>) => Effect<A2, E2, R2>` that receives the *specific* matched error and returns a recovery Effect. Errors not matching the tag are passed through unchanged.

**When to use it & Why:**
Use these error handling combinators (usually via `pipe`) to build resilient workflows:

*   **`catchAll`**: Use for general error recovery, logging all failures, or providing a default value/state when *any* anticipated error occurs. It's a broad catch mechanism.
*   **`catchTag`**: Use when you need to handle different types of *expected* errors in distinct ways. This relies on using **tagged error classes** (e.g., `class NetworkError extends Data.TaggedError("NetworkError") { ... }`) to allow Effect to discriminate between failure types at runtime.

These patterns allow you to gracefully recover from failures, provide alternative logic, or simply observe errors without crashing the entire workflow.

**Example (Inside a Service Implementation):**

```typescript
// In service.ts
import { Effect, pipe } from "effect";
import { FileSystem } from "@effect/platform";
import { NetworkError, CacheError, ConfigError } from "./errors.js"; // Assume these are tagged errors

declare const fetchFromNetwork: (key: string) => Effect.Effect<string, NetworkError>; 
declare const readFromCache: (key: string) => Effect.Effect<string, CacheError>;

// ... inside the service class ...

const getDataWithFallback = (key: string): Effect.Effect<string, ConfigError> =>
  pipe(
    fetchFromNetwork(key), // Try fetching from network first
    // If fetchFromNetwork fails with a NetworkError, try the cache
    Effect.catchTag("NetworkError", (networkError) => 
      pipe(
        Effect.logWarning("Network fetch failed, trying cache", { key, error: networkError.message }),
        Effect.flatMap(() => readFromCache(key)),
        // If cache read also fails, provide a default or map to a different error
        Effect.catchTag("CacheError", (cacheError) => 
           pipe(
             Effect.logError("Cache also failed, returning default.", { key, error: cacheError.message }),
             Effect.succeed("default_value") // Recover with a default value
           )
        )
      )
    ),
    // Example: Catch any remaining *unexpected* error (maybe from logic added later)
    // This catchAll might map to a ConfigError or just log
    Effect.catchAll((unexpectedError) => 
       pipe(
         Effect.logError("Unexpected error getting data", { key, error: unexpectedError }),
         Effect.fail(new ConfigError({ message: "Failed to get data due to unexpected issue" }))
       )
    )
  );

// ... rest of service implementation ...
```

**Other Handling Patterns:**

*   **`Effect.orElse`**: Provides an alternative Effect to run if the first one fails, without needing to inspect the error itself. Useful for simple fallbacks.
*   **`Effect.retry`**: Automatically retries a failing Effect based on a schedule or policy.

### Concurrency Patterns (`Effect.all`, `Effect.fork`)

**What it is:**
Effect provides primitives for managing concurrent operations safely within its structured concurrency model.

*   **`Effect.all`**: Takes an iterable (like an array) of Effects and runs them **concurrently**. It returns a new Effect that succeeds with an array of results *only when all* input Effects succeed. If *any* input Effect fails, `Effect.all` fails immediately (interrupting other concurrent Effects within the group).
*   **`Effect.fork`**: Launches an Effect to run concurrently in a new **Fiber**. It immediately returns an `Effect<Fiber.Runtime<A, E>>` (an Effect yielding the Fiber itself), allowing the parent Fiber to continue without waiting for the forked Effect to complete. The lifecycle of the forked fiber is independent unless explicitly managed (`Fiber.join`, `Fiber.interrupt`).

**When to use it & Why:**

*   **`Effect.all`**: Use when you have multiple **independent** tasks that can run in parallel to improve performance. Common use cases include fetching data from multiple sources, processing a list of items concurrently, or performing parallel computations. You can control the degree of parallelism using the `{ concurrency: number | "unbounded" }` option.
*   **`Effect.fork`**: Use for:
    *   **Background Tasks:** Launching long-running processes (e.g., monitoring, background sync) that shouldn't block the main flow.
    *   **Fire-and-Forget:** Initiating operations where the result or completion isn't immediately needed (e.g., sending optional analytics). **Use with caution**, as unmanaged fibers can lead to resource leaks or unexpected behavior if not properly supervised or interrupted.

Effect's structured concurrency ensures that if the parent scope/fiber is interrupted or fails, child fibers (like those launched by `Effect.all` or implicitly managed) are typically interrupted automatically, preventing leaks.

**Example (Inside a Service Implementation):**

```typescript
// In service.ts
import { Effect, pipe, Fiber } from "effect";
import { ApiClientService } from "@/services/api-client/api.js"; // Example dependency
import { NetworkError } from "./errors.js";

// ... inside the service class ...

const processItemsInParallel = (itemIds: string[]): Effect.Effect<string[], NetworkError> => 
  Effect.gen(function* () {
    const apiClient = yield* ApiClientService;

    // Create an array of Effects, one for each item
    const effects = itemIds.map(id => 
      apiClient.fetchItemDetails(id).pipe(
        Effect.mapError(e => new NetworkError({ message: `Failed fetch for ${id}`, cause: e}))
      )
    );

    // Run up to 10 fetches concurrently
    const results = yield* Effect.all(effects, { concurrency: 10 });
    
    // results is an array of the success values from fetchItemDetails
    return results.map(detail => `Processed: ${detail.id}`); 
  });

const launchBackgroundSync = (syncId: string): Effect.Effect<void> => 
  Effect.gen(function* () {
    const apiClient = yield* ApiClientService;
    
    yield* Effect.logInfo("Launching background sync task", { syncId });

    // Define the background task
    const syncTask = apiClient.performLongSync(syncId).pipe(
      Effect.tap(() => Effect.logInfo("Background sync completed", { syncId })),
      Effect.catchAll(error => 
        Effect.logError("Background sync failed", { syncId, error })
      )
    );

    // Fork the task - parent fiber continues immediately
    const fiber = yield* Effect.fork(syncTask);

    // Optional: We could store fiber.id or manage it, but here we let it run detached.
    // yield* Fiber.join(fiber) // Would wait for completion
    // yield* Fiber.interrupt(fiber) // Would cancel it
  });

// ... rest of service implementation ...
```

**When NOT to use it & Why:**

*   **`Effect.all` for Sequential Tasks:** If tasks depend on the results of previous ones, use `Effect.gen` or `Effect.flatMap` for sequential execution.
*   **Unbounded Concurrency (`Effect.all`):** Be cautious using `{ concurrency: "unbounded" }` as it can exhaust resources (network sockets, memory, CPU) if the number of effects is very large.
*   **`Effect.fork` without Management:** Avoid forking critical tasks where completion or failure *must* be handled, unless you explicitly manage the fiber's lifecycle (joining, interrupting, supervision). Prefer structured concurrency where possible.

### Resource Management (`Effect.acquireRelease`, `Scope`)

**What it is:**
Effect provides robust mechanisms for managing resources (e.g., network connections, file handles, database transactions) that require explicit acquisition and release to prevent leaks.

*   **`Effect.acquireRelease`**: The primary operator for simple resource management. It takes two arguments: an `acquire` Effect and a `release` function. The `release` function receives the acquired resource and returns an Effect that performs cleanup. `acquireRelease` returns a new Effect that, when run, executes `acquire`, provides the resource to the subsequent workflow, and **guarantees** that `release` is executed afterward, regardless of whether the workflow succeeds, fails, or is interrupted.
*   **`Scope`**: A more advanced concept representing a lifetime or context for resources. Effects can require a `Scope`, and resources added to a `Scope` are automatically released when the `Scope` is closed. `Effect.acquireRelease` uses a `Scope` internally.

**When to use it & Why:**
Use `Effect.acquireRelease` (or manage `Scope` explicitly) whenever you interact with resources needing cleanup:

*   Database connections/transactions.
*   File handles.
*   Network connections/sockets.
*   Locks or mutexes.
*   Subscriptions.

This pattern **guarantees resource safety**, ensuring cleanup code runs even in the face of errors or concurrent interruptions, which is notoriously difficult to achieve correctly with manual `try...finally` or Promise-based approaches.

Often, this pattern is implemented **within lower-level services** that provide access to the resource (e.g., a `DatabaseConnectionPool` service might use `acquireRelease` internally when providing a connection), rather than in every high-level business logic service.

**Example (Conceptual - Inside a Service Providing a Resource):**

```typescript
// In a hypothetical FileHandleService.ts
import { Effect, Scope, pipe } from "effect";
import * as nodefs from "node:fs/promises"; // Using Node's promise-based fs
import { FileSystemError } from "./errors.js"; // Example error

// Interface might look like:
// interface IFileHandleService {
//   readFileWithHandle: <A, E, R>(filePath: string, useHandle: (handle: nodefs.FileHandle) => Effect<A, E, R>) 
//      => Effect<A, E | FileSystemError, R>;
// }

// ... inside the service class definition ...
  effect: Effect.succeed({
    // Method that acquires a file handle, uses it, and guarantees release
    readFileWithHandle: <A, E, R>(
      filePath: string, 
      useHandle: (handle: nodefs.FileHandle) => Effect.Effect<A, E, R>
    ): Effect.Effect<A, E | FileSystemError, R> => 
      Effect.acquireRelease(
        // Acquire: Open the file handle
        Effect.tryPromise({
          try: () => nodefs.open(filePath, 'r'),
          catch: (e) => new FileSystemError({ message: `Failed to open file: ${filePath}`, cause: e })
        }),
        // Release: Close the handle (takes the acquired handle)
        (handle) => Effect.tryPromise({
          try: () => handle.close(),
          catch: (e) => new FileSystemError({ message: `Failed to close file: ${filePath}`, cause: e })
        })
      ).pipe(
        // Use the acquired handle in the provided effect
        Effect.flatMap((handle) => useHandle(handle))
        // Scope is managed automatically by acquireRelease
      )
  }),
  dependencies: []
// ...
```

**When NOT to use it & Why:**

*   **Automatically Managed Resources:** Don't use for resources managed by the JavaScript runtime (e.g., standard objects, arrays) or Effect abstractions that handle their own scopes (like some `Stream` constructors).
*   **Short-Lived, Simple Resources:** If a resource is extremely simple and its lifetime is naturally tied to a small, synchronous block of code where errors aren't expected, it might be overkill, but using it adds safety.

### Configuration (`Config`)

**What it is:**
Effect provides a dedicated `Config` module and `ConfigProvider` system for managing application configuration in a type-safe and declarative way. You define the *shape* of the configuration needed (e.g., `Config.string("API_KEY")`, `Config.number("PORT")`, `Config.boolean("ENABLE_FEATURE_X")`) and Effect handles loading it from the environment (by default, environment variables) via the `ConfigProvider`.

**When to use it & Why:**
Use the `Config` module whenever a service needs access to **static configuration values** required for its operation. This includes:

*   API keys, secrets, credentials.
*   Service URLs, hostnames, ports.
*   Feature flags.
*   Timeout values, retry counts, concurrency limits.
*   Paths to files or directories.

Accessing configuration via `Config` provides several benefits:

*   **Type Safety:** Ensures configuration values match expected types (string, number, etc.) at load time.
*   **Explicitness:** Declaratively defines the configuration dependencies of a service.
*   **Environment Awareness:** Abstracts away the source of configuration (env vars, files, etc.), handled by the `ConfigProvider`.
*   **Error Handling:** Provides clear errors if configuration is missing or invalid.
*   **Security:** `Config.redacted` prevents accidental logging of secrets.

Configuration is typically accessed within the service implementation factory (`effect: ...`) using `yield* Config.<type>(...)` inside an `Effect.gen` block.

**Example (Inside a Service Implementation):**

```typescript
// In service.ts
import { Effect, Config, Redacted, pipe } from "effect";
import { HttpClientService } from "@/services/http/api.js"; // Example dependency
import { ConfigError, NetworkError } from "./errors.js"; // Example errors

// ... inside the service class definition ...
export class ExternalApiService extends Effect.Service</* ... IExternalApiService ... */>()(
  "ExternalApiService",
  {
    effect: Effect.gen(function* () {
      // 1. Define and load required configuration
      const apiKey = yield* Config.redacted("EXTERNAL_API_KEY"); // Use redacted for secrets
      const baseUrl = yield* Config.string("EXTERNAL_API_BASE_URL");
      const timeoutMs = yield* Config.number("EXTERNAL_API_TIMEOUT_MS").pipe(
        Config.withDefault(5000) // Provide a default value
      );
      const enableCaching = yield* Config.boolean("EXTERNAL_API_ENABLE_CACHING").pipe(
        Config.withDefault(false)
      );

      const httpClient = yield* HttpClientService;

      // 2. Use configuration in service logic
      const makeRequest = (path: string): Effect.Effect<unknown, NetworkError> => {
        const url = `${baseUrl}/${path}`;
        const headers = { 
          "Authorization": `Bearer ${Redacted.value(apiKey)}`, // Use Redacted.value to access secret
          "X-Enable-Caching": String(enableCaching) 
        };
        
        return httpClient.get(url, { headers }).pipe(
          Effect.timeout(timeoutMs), // Apply timeout from config
          Effect.mapError(e => new NetworkError({ message: `API request failed: ${url}`, cause: e}))
        );
      };

      return {
        makeRequest
        // ... other methods
      } /* satisfies IExternalApiService */;
    }).pipe(
      // Map potential ConfigError during loading to a service-specific error
      Effect.mapError(e => new ConfigError({ message: "External API configuration failed", cause: e }))
    ),
    dependencies: [HttpClientService] // Declare dependencies
  }
) {}
```

**Key `Config` Features:**

*   **`Config.redacted`**: For sensitive values; prevents logging, requires `Redacted.value()` for access.
*   **`Config.withDefault`**: Provides a fallback value if the config is missing.
*   **`Config.nested`**: Loads config values under a specific namespace (e.g., `Config.nested(Config.string("HOST"), "SERVER")` looks for `SERVER_HOST`).
*   **`Config.all` / Structs / Tuples**: Combine multiple `Config` definitions.
*   **`Config.validate`**: Add custom validation rules.
*   **`Config.map*`**: Transform loaded configuration values.

**When NOT to use it & Why:**

*   **Dynamic State:** For state that changes during the application lifecycle, use `Ref`.
*   **Request-Specific Data:** Data passed in as arguments to service methods should not be loaded via `Config`.

### Layer Composition (`Layer.merge`, `Layer.provide`)

**What it is:**
While individual services define their own layers (typically via the service class itself in our pattern: `class ServiceName extends Effect.Service...`), a complete application needs to combine these individual layers into a single, unified layer that provides all necessary dependencies. `Layer` provides static methods for this composition:

*   **`Layer.merge`**: Combines two independent layers (`Layer<A>` and `Layer<B>`) into a single layer (`Layer<A | B>`). Use this when services do *not* depend on each other.
*   **`Layer.provide`**: Takes a layer providing dependencies (`Layer<In>`) and a layer that requires those dependencies (`Layer<Out, E, In>`) and returns a new layer (`Layer<Out, E>`) where the dependencies have been satisfied. Use this to wire together services where one depends on another. You can chain multiple `provide` calls.
*   **`Layer.mergeAll`**: Merges multiple independent layers provided as arguments (`Layer.mergeAll(layerA, layerB, layerC)`). Equivalent to chaining `Layer.merge`.
*   **`Layer.provideMerge`**: A convenience method combining `provide` and `merge`. `Layer.provideMerge(dependencyLayer, dependentLayer)` is equivalent to `Layer.provide(dependencyLayer, dependentLayer).pipe(Layer.merge(dependencyLayer))`, making the dependency available alongside the dependent service.

**When to use it & Why:**
Use layer composition at the **application entry point** (or the top level of a major subsystem) to construct the final environment required by your main application `Effect`. This is how you perform **dependency injection** in Effect.

*   Build the complete application environment by merging and providing layers for all required services (database, logging, HTTP client, configuration, custom business logic services, etc.).
*   Ensure that services receive the correct implementations of their dependencies.
*   Allows swapping implementations easily (e.g., providing a `TestLayer` instead of a `LiveLayer` during testing) by changing the composition at the entry point.

**Example (Application Entry Point):**

```typescript
// In main.ts or app.ts
import { Effect, Layer } from "effect";
import { HttpLiveLayer } from "@/services/http/live.js"; // Assume provides IHttp
import { ApiClientService } from "@/services/api-client/service.js"; // Assume depends on IHttp, provides IApiClient
import { LoggingService } from "@/services/core/logging/service.js"; // Provides ILogging
import { UserService } from "@/services/user/service.js"; // Assume depends on IApiClient, provides IUser

// Main application logic effect
const mainAppLogic = Effect.gen(function* () {
  const logger = yield* LoggingService;
  const userService = yield* UserService;

  yield* logger.info("Application starting...");
  const user = yield* userService.loadUser("123");
  yield* logger.info("User loaded", { userName: user.name });
  // ... more logic
});

// 1. Define independent base layers
const BaseServicesLayer = Layer.mergeAll(
  LoggingService, // Service class acts as layer
  HttpLiveLayer // Assume this is an explicit layer variable
);

// 2. Define layers with dependencies, providing them
const ApiClientLayer = Layer.provide(BaseServicesLayer, ApiClientService);
const UserLayer = Layer.provide(ApiClientLayer, UserService); // UserService needs ApiClient

// 3. Compose the final application layer
// We need LoggingService and UserService available for mainAppLogic
// UserLayer already has UserService. We need to merge back the base services.
const AppLayer = Layer.provideMerge(BaseServicesLayer, UserLayer);
// Or more explicitly:
// const ProvidedUserLayer = Layer.provide(BaseServicesLayer, UserLayer);
// const AppLayer = Layer.merge(BaseServicesLayer, ProvidedUserLayer);

// 4. Run the application by providing the final composed layer
Effect.runPromise(
  mainAppLogic.pipe(
    Effect.provide(AppLayer)
    // Add ConfigProvider etc. if needed
  )
).catch(console.error);
```

**When NOT to use it & Why:**

*   **Inside Service Implementations:** Service implementations should generally *declare* their dependencies (via the `dependencies` array in the `Effect.Service` definition) and access them using `yield*`. They should *not* typically perform layer composition internally. Composition happens at the application boundary.

*   **Use `Effect.provideService` Sparingly:** While `Effect.provideService(MyService, implementation)` can directly inject a single service instance into an `Effect`, it bypasses the `Layer` system. This is generally discouraged for application-level dependency management as it's less composable and harder to manage than building a full `Layer` at the application boundary. Prefer `Layer` composition and `Effect.provide(AppLayer)`. `Effect.provideService` might be useful in very isolated testing scenarios or specific integration points, but layers are the standard.

### Handling Optionality and Results (`Option`, `Either`)

Effect leverages the `Option` and `Either` data types for handling potentially absent values and explicit success/failure results. Here are common idioms:

**1. Returning `Effect<Option<A>>` for Optional Results**

*   **Idiom:** Service methods that look up data which might not exist (e.g., `findById`, `findByName`) should return `Effect.Effect<Option.Option<A>, ErrorType>`. The `Option` within the success channel explicitly models the possibility of absence.
*   **Why:** This avoids using `null` or `undefined`, making the absence explicit and type-safe. It forces consumers to handle the `None` case.
*   **Example (Service API Signature):**
    ```typescript
    // In api.ts
    import { Effect, Option } from "effect";
    import { RepositoryError } from "./errors.js";
    import type { User } from "./types.js";

    export interface IUserService {
      readonly findUserById: (id: string) => Effect.Effect<Option.Option<User>, RepositoryError>;
    }
    ```

**2. Handling `Option` with `Option.match` in Workflows**

*   **Idiom:** When consuming an `Effect<Option<A>>`, use `Effect.flatMap` or `Effect.gen` to access the resolved `Option<A>`, then use the **synchronous `Option.match`** function inside the workflow to handle the `Some` and `None` cases.
*   **Why:** This allows branching logic *synchronously* based on the presence or absence of the value *after* the Effect has resolved the `Option`. It keeps the core logic cleaner than deeply nested Effect combinators for simple branching. Treating absence as an immediate failure (`Effect.getOrFail`) appears less common in this codebase, favoring explicit handling.
*   **Example (Consuming Service):**
    ```typescript
    import { Effect, Option, pipe } from "effect";
    import { UserService } from "@/services/user/api.js"; // Provides IUserService from previous example
    import { PermissionsError } from "./errors.js";

declare const checkPermissions: (userId: string) => Effect.Effect<boolean, PermissionsError>;

    const processUserPermissions = (userId: string): Effect.Effect<string, RepositoryError | PermissionsError> => 
      Effect.gen(function* () {
        const userService = yield* UserService;
        const userOption: Option.Option<User> = yield* userService.findUserById(userId);

        // Handle the Option synchronously using Option.match
        const message = Option.match(userOption, {
          onNone: () => Effect.succeed("User not found, skipping permissions check."), // Return an Effect
          onSome: (user) => 
            checkPermissions(user.id).pipe( // Return an Effect
              Effect.map(hasPermission => 
                hasPermission ? `${user.name} has permissions.` : `${user.name} lacks permissions.`
              )
            )
        });
        
        // Yield the Effect returned by Option.match
        return yield* message;
      });
    ```

**3. Using `Effect.either` in Tests for Assertions**

*   **Idiom:** In test files (`*.test.ts`), wrap the `Effect` being tested with `Effect.either`. This transforms `Effect<A, E>` into `Effect<Either<E, A>>`, moving any potential error into a `Left<E>` within the success channel. Then, `yield` the result and perform synchronous assertions on the `Either` (`result._tag === "Left"` or `result._tag === "Right"`).
*   **Why:** Simplifies testing of failure cases. Instead of needing `try/catch` around `Effect.runPromise` or complex Effect-based error assertions, you can synchronously check the `_tag` and the value/error within the resolved `Either`.
*   **Example (Inside a Test File):**
    ```typescript
    // In service.test.ts
    import { Effect, Either } from "effect";
    import { expect } from "vitest";
    import { SomeService } from "../service.js"; // The service under test
    import { SpecificError } from "../errors.js";

    it("should fail correctly on invalid input", async () => {
      const program = Effect.gen(function* () {
        const service = yield* SomeService;
        const effectToTest = service.operationThatMightFail(""); // Call the method
        
        // Wrap with Effect.either
        const result: Either<SpecificError, never> = yield* Effect.either(effectToTest);

        // Synchronous assertions on the Either
        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(SpecificError);
          // expect(result.left.message).toContain(...)
        }
      });
      
      // Assuming test harness or default layer is provided elsewhere
      await Effect.runPromise(program);
    });
    ```

---

**Note on Service Definition Patterns:**

The pattern described above using `class ServiceName extends Effect.Service<Interface>()("Identifier", { effect: ..., dependencies: ... })` is the **standard** method for defining services in this project.

The older pattern using the class-based `Context.Tag("ServiceName")<Tag, Interface>()` is considered an **anti-pattern** and should generally be avoided.

**Exception:** The **Repository** service (`@core/repository`) is the only service currently allowed to use the class-based `Context.Tag` pattern due to specific implementation details or historical reasons. All other new or refactored services **must** use the standard `Effect.Service` pattern described here. 

## Idiomatic Effect Platform Patterns

Effect Platform (`@effect/platform`, `@effect/platform-node`, `@effect/platform-bun`) provides Effect-native abstractions for interacting with the underlying runtime environment (Node.js, Bun). Here are common idioms used in this project:

### 1. Using Platform Services (e.g., FileSystem)

*   **Idiom:** Use Effect's platform services directly from `@effect/platform` (like `FileSystem`) in your services.
*   **Why:**
    *   **Direct Access:** Leverage Effect's built-in platform capabilities without unnecessary abstraction.
    *   **Consistency:** Use Effect's standard error handling and resource management.
    *   **Simplicity:** Avoid redundant wrapper services.
    *   **Type Safety:** Benefit from Effect's type system directly.
*   **Example (Using FileSystem):**
    ```typescript
    import { FileSystem } from "@effect/platform";
    import { Effect } from "effect";

    const readFileContent = (path: string) => 
      Effect.gen(function*() {
        // Use Effect's FileSystem directly
        const fs = yield* FileSystem.FileSystem;
        const content = yield* fs.readFileString(path);
        // ... process content ...
        return content;
      });
    ```
*   **Note:** Remember to provide the appropriate platform context layer (`NodeContext.layer` or `BunContext.layer`) at your application's entry point.

### 2. Using `HttpClientRequest` Builders

*   **Idiom:** Construct outgoing HTTP requests using the static builder methods provided by `@effect/platform/HttpClientRequest`, such as `HttpClientRequest.get(url)`, `HttpClientRequest.post(url)`, `HttpClientRequest.put(url)`, etc. Chain methods like `.pipe(HttpClientRequest.jsonBody(data))` or `.pipe(HttpClientRequest.setHeader(key, value))` to configure the request.
*   **Why:** Provides a declarative and type-safe way to build HTTP requests before they are executed by an `HttpClient`.
*   **Example (Inside an HTTP-consuming service):**
    ```typescript
    import { Effect, pipe } from "effect";
    import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform/HttpClient";
    import { HttpBody } from "@effect/platform/HttpBody";
    import { ApiError } from "./errors.js";

    const postDataToApi = (data: object): Effect.Effect<unknown, ApiError> => 
      Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient; // Assuming direct use or via wrapper

        // Build the request
        const request = HttpClientRequest.post("https://api.example.com/items").pipe(
          HttpClientRequest.jsonBody(data), // Set JSON body
          HttpClientRequest.setHeader("X-Request-Id", crypto.randomUUID())
        );
        
        // Execute the request
        const response = yield* client.pipe(Effect.andThen(request)).pipe(
            Effect.mapError(e => new ApiError({ message: "HTTP request failed", cause: e}))
        );
        
        // Handle response (see next idiom)
        if (response.status >= 400) {
            return yield* Effect.fail(new ApiError({ message: `API Error: ${response.status}` }));
        }
        return yield* HttpBody.json(response).pipe(
             Effect.mapError(e => new ApiError({ message: "Failed to parse response JSON", cause: e }))
         );
      });
    ```

### 3. Parsing HTTP Responses with `HttpBody.json()`

*   **Idiom:** After receiving a successful `HttpClientResponse` from executing a request via `HttpClient`, use the `HttpBody.json(response)` function (from `@effect/platform/HttpBody`) to parse the response body as JSON. This returns an `Effect<unknown, HttpBody.Error>` which should typically be mapped to a domain-specific error.
*   **Why:** Provides a standard, Effect-based way to handle the potentially failing operation of parsing a response body. Integrates cleanly with Effect's error handling.
*   **Example:** (See the `postDataToApi` example in Idiom 2 above). Note the use of `HttpBody.json(response).pipe(Effect.mapError(...))`. 

### 4. Providing Platform Context (`NodeContext`/`BunContext`)

*   **Idiom:** At the **application entry point** (where the final `AppLayer` is composed and the main `Effect` is run), ensure the correct platform context layer (`NodeContext.layer` for Node.js or `BunContext.layer` for Bun) is provided as part of the overall application layer.
*   **Why:** Platform services like `FileSystem`, `HttpClient` (when using default implementations), `Terminal`, etc., need access to the underlying runtime (Node/Bun) to perform I/O operations. Providing this context layer satisfies their dependency requirements.
*   **Example (Application Entry Point):**
    ```typescript
    // In main.ts or app.ts
    import { Effect, Layer } from "effect";
    import { NodeContext } from "@effect/platform-node"; // Or BunContext from @effect/platform-bun
    // ... other service layers (AppLayer from previous example)

    // Main application logic effect
    const mainAppLogic = /* ... defined elsewhere ... */ Effect.void;
    
    // Compose the final application layer WITH the platform context
    const FullAppLayer = Layer.merge(AppLayer, NodeContext.layer); // Merge platform context

    // Run the application by providing the final composed layer
    Effect.runPromise(
      mainAppLogic.pipe(
        Effect.provide(FullAppLayer)
      )
    ).catch(console.error);
    ```
*   **Note:** You typically don't interact with `NodeContext` or `BunContext` directly within your service logic; you just ensure it's provided once at the top level.

---

**Note on Service Definition Patterns:**

The pattern described above using `class ServiceName extends Effect.Service<Interface>()("Identifier", { effect: ..., dependencies: ... })` is the **standard** method for defining services in this project.

The older pattern using the class-based `Context.Tag("ServiceName")<Tag, Interface>()` is considered an **anti-pattern** and should generally be avoided.

**Exception:** The **Repository** service (`@core/repository`) is the only service currently allowed to use the class-based `Context.Tag` pattern due to specific implementation details or historical reasons. All other new or refactored services **must** use the standard `Effect.Service` pattern described here. 