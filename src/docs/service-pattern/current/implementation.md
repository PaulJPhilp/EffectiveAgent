# Effect Service Implementation Guide

This guide provides step-by-step instructions for implementing services using the Effect pattern. It follows the locked reference implementation while incorporating current best practices.

## Prerequisites

- TypeScript 5.8+
- Effect 3.14+
- Understanding of basic Effect concepts

## Implementation Steps

### 1. Service Directory Structure

Create a new directory for your service following this structure:
```
src/services/your-domain/your-service/
├── __tests__/
│   └── service.test.ts
├── api.ts
├── service.ts
├── errors.ts
├── types.ts
└── index.ts
```

### 2. Define Service API (api.ts)

```typescript
import { Effect } from "effect"

/**
 * @file Defines the YourService API
 */

/**
 * Service description and purpose.
 *
 * @example
 * ```typescript
 * const result = yield* YourService.someOperation()
 * ```
 */
export interface YourServiceApi {
  /**
   * Operation description.
   *
   * @param input - Description of input
   * @returns Effect with operation result
   */
  readonly someOperation: (input: string) => Effect.Effect<Result, ServiceError>
}
```

### 3. Define Service Errors (errors.ts)

```typescript
import { Data } from "effect"

export class ServiceError extends Data.TaggedError<{
  readonly _tag: "ServiceError"
  readonly message: string
  readonly cause?: unknown
}>("ServiceError") {}
```

### 4. Implement Service (service.ts)

```typescript
import { Effect } from "effect"
import type { YourServiceApi } from "./api.js"
import { ServiceError } from "./errors.js"

export class YourService extends Effect.Service<YourServiceApi>()(
  "YourService",
  {
    effect: Effect.gen(function* () {
      // Service implementation
      return {
        someOperation: (input: string) =>
          Effect.try({
            try: () => ({ result: input }),
            catch: error => new ServiceError({ message: "Operation failed", cause: error })
          })
      }
    }),
    dependencies: [] // List required services
  }
)
```

### 5. Create Index File (index.ts)

```typescript
export * from "./api.js"
export * from "./service.js"
export * from "./errors.js"
```

### 6. Implement Tests (service.test.ts)

```typescript
import { Effect } from "effect"
import { expect, it } from "vitest"
import { YourService } from "../service.js"

it("should perform operation successfully", async () => {
  const program = Effect.gen(function* () {
    const service = yield* YourService
    const result = yield* service.someOperation("test")
    expect(result).toEqual({ result: "test" })
  })

  await Effect.runPromise(
    program.pipe(
      Effect.provide(YourService)
    )
  )
})
```

## Best Practices

1. **Service Definition**
   - Use descriptive service names
   - Follow the Effect.Service pattern exactly
   - Document all public APIs with JSDoc

2. **Error Handling**
   - Define specific error types
   - Use Effect.try for unsafe operations
   - Map all errors to domain-specific errors

3. **Testing**
   - Test both success and error paths
   - Use Effect.gen for test programs
   - Provide necessary test layers

4. **Dependencies**
   - List all required services in dependencies array
   - Access services using yield*
   - Consider service composition

## Common Patterns

### 1. Accessing Dependencies

```typescript
const someOperation = Effect.gen(function* () {
  const otherService = yield* OtherService
  const result = yield* otherService.operation()
  return result
})
```

### 2. Error Mapping

```typescript
Effect.try({
  try: () => someOperation(),
  catch: error => new ServiceError({ message: "Operation failed", cause: error })
})
```

### 3. Resource Management

```typescript
Effect.acquireRelease(
  acquire,
  resource => cleanup
)
```

### 4. Configuration

```typescript
const config = yield* Config.string("SERVICE_CONFIG")
```

## Advanced Topics

1. **Service Composition**
   - Layer merging
   - Dependency provision
   - Runtime configuration

2. **Testing Strategies**
   - Mock services
   - Test layers
   - Integration testing

3. **Error Handling**
   - Error hierarchies
   - Error recovery
   - Error logging

## Related Documentation

- See `reference/service-pattern.md` for core concepts
- See `testing.md` for detailed testing guidelines
- See `examples/` for real-world implementations 