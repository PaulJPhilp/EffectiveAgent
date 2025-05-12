# Testing Effect Services

This guide covers testing strategies and patterns for Effect services. It focuses on practical approaches to testing service implementations using Vitest and Effect's testing utilities.

## Testing Approaches

### 1. Unit Testing with Mock Dependencies

Use this approach when testing service logic in isolation:

```typescript
import { Effect } from "effect"
import { expect, it, vi } from "vitest"
import type { DependencyApi } from "./dependency.js"
import { YourService } from "./service.js"

// Mock dependency implementation
const mockDependency: DependencyApi = {
  operation: vi.fn(() => Effect.succeed("mocked"))
}

it("should use dependency correctly", async () => {
  const program = Effect.gen(function* () {
    const service = yield* YourService
    const result = yield* service.operation()
    expect(result).toBe("processed:mocked")
    expect(mockDependency.operation).toHaveBeenCalled()
  })

  await Effect.runPromise(
    program.pipe(
      Effect.provide(YourService),
      Effect.provideService(Dependency, mockDependency)
    )
  )
})
```

### 2. Integration Testing with Test Harness

For testing service interactions and real implementations:

```typescript
import { createServiceTestHarness } from "@/test-utils"
import { YourService } from "./service.js"

const harness = createServiceTestHarness(YourService)

it("should handle real operations", async () => {
  const program = Effect.gen(function* () {
    const service = yield* YourService
    const result = yield* service.operation()
    expect(result).toMatchSnapshot()
  })

  await harness.runTest(program)
})
```

## Testing Patterns

### 1. Error Testing

Test both success and error paths:

```typescript
it("should handle errors", async () => {
  const program = Effect.gen(function* () {
    const service = yield* YourService
    const result = yield* Effect.either(service.operation())
    
    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ServiceError)
    }
  })

  await harness.runTest(program)
})
```

### 2. State Testing

Test stateful services:

```typescript
it("should maintain state correctly", async () => {
  const program = Effect.gen(function* () {
    const service = yield* YourService
    
    yield* service.increment()
    yield* service.increment()
    
    const count = yield* service.getCount()
    expect(count).toBe(2)
  })

  await harness.runTest(program)
})
```

### 3. Resource Testing

Test resource acquisition and release:

```typescript
it("should manage resources", async () => {
  const cleanup = vi.fn()
  
  const program = Effect.gen(function* () {
    const service = yield* YourService
    
    yield* Effect.acquireRelease(
      service.acquire(),
      () => Effect.sync(() => cleanup())
    )
  })

  await harness.runTest(program)
  expect(cleanup).toHaveBeenCalled()
})
```

## Test Utilities

### 1. Service Test Harness

```typescript
export const createServiceTestHarness = <R, E, A>(
  Service: Effect.Service<A, E, R>,
  createTestImpl?: () => Effect.Effect<A>
) => {
  return {
    runTest: (effect: Effect.Effect<any>) =>
      Effect.runPromise(
        effect.pipe(
          Effect.provide(Service)
        )
      ),
    
    expectError: (effect: Effect.Effect<any>, errorTag: string) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const result = yield* Effect.either(effect)
          expect(result._tag).toBe("Left")
          if (result._tag === "Left") {
            expect(result.left._tag).toBe(errorTag)
          }
        }).pipe(
          Effect.provide(Service)
        )
      )
  }
}
```

### 2. Mock Helpers

```typescript
export const createMockService = <A extends object>(
  implementation: Partial<A>
): A => {
  return new Proxy({} as A, {
    get: (target, prop) => {
      if (prop in implementation) {
        return implementation[prop as keyof A]
      }
      return vi.fn(() => Effect.fail("Not implemented"))
    }
  })
}
```

## Best Practices

1. **Test Organization**
   - Group related tests
   - Use descriptive test names
   - Follow Arrange-Act-Assert pattern

2. **Mock Dependencies**
   - Mock at the service boundary
   - Verify mock interactions
   - Use type-safe mocks

3. **Error Testing**
   - Test all error paths
   - Verify error types
   - Test error recovery

4. **State Testing**
   - Reset state between tests
   - Test state transitions
   - Verify final state

5. **Resource Testing**
   - Verify cleanup
   - Test interruption
   - Check resource leaks

## Common Testing Scenarios

### 1. Testing Async Operations

```typescript
it("should handle async operations", async () => {
  const program = Effect.gen(function* () {
    const service = yield* YourService
    const result = yield* service.asyncOperation()
    expect(result).toBeDefined()
  })

  await harness.runTest(program)
})
```

### 2. Testing Concurrent Operations

```typescript
it("should handle concurrent operations", async () => {
  const program = Effect.gen(function* () {
    const service = yield* YourService
    const results = yield* Effect.all([
      service.operation(),
      service.operation()
    ])
    expect(results).toHaveLength(2)
  })

  await harness.runTest(program)
})
```

### 3. Testing Configuration

```typescript
it("should use configuration", async () => {
  const program = Effect.gen(function* () {
    const service = yield* YourService
    const config = yield* Config.string("TEST_CONFIG")
    expect(config).toBe("test-value")
  })

  await harness.runTest(
    program.pipe(
      Effect.provideConfig(Config.from({ TEST_CONFIG: "test-value" }))
    )
  )
})
```

## Related Documentation

- See `reference/service-pattern.md` for core service concepts
- See `implementation.md` for service implementation details
- See `examples/` for real-world testing examples 