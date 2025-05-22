# Effect Testing Guidelines

## Core Testing Principles

1. **Framework and Tools**
   - Use `@effect/vitest` for Effect-native testing
   - Import test functions from `@effect/vitest`
   - Use Effect-native assertions and matchers
   - Tests run using `Effect.runPromise` under the hood

2. **Testing Hierarchy**
   ```
   Integration Tests (Live Services)
   └── Component Tests (Minimal Mocking)
       └── Unit Tests (Isolated Components)
   ```

## Testing Approaches

### 1. Integration Tests (Preferred)
- **Use Live Service Implementations**
  - `LoggingApiLiveLayer`
  - `EntityLoaderApiLiveLayer` with `BunContext.layer`
  - Live `RepositoryApi` implementations
  - `PromptApiLiveLayer` with live dependencies
  - `SkillApiLiveLayer` with live config layers

- **Setup and Teardown**
  ```typescript
  import { describe, it, expect } from "@effect/vitest"

  describe("IntegrationTest", () => {
    const setup = Effect.gen(function* (_) {
      const tempDir = yield* Effect.sync(() => path.join(__dirname, "temp"))
      yield* Effect.sync(() => fs.mkdirSync(tempDir, { recursive: true }))
      return { tempDir }
    })

    const cleanup = ({ tempDir }: { tempDir: string }) =>
      Effect.sync(() => fs.rmSync(tempDir, { recursive: true, force: true }))

    it("should test full integration", () =>
      Effect.gen(function* (_) {
        const { tempDir } = yield* setup
        const service = yield* ServiceTag
        // Test with live services
        yield* Effect.addFinalizer(() => cleanup({ tempDir }))
        // Assertions
        yield* expect(service.someMethod()).toEqual("expected result")
      }))
  })
  ```

### 2. Component Tests (When Integration Tests Are Not Feasible)
- **Minimal Mocking Strategy**
  - Mock only immediate dependencies
  - Use `Layer.succeed(Tag, mockImplementation)`
  - Keep mocks simple and focused

- **Example Component Test**
  ```typescript
  import { describe, it, expect } from "@effect/vitest"

  describe("ComponentTest", () => {
    const mockDependencyLayer = Layer.succeed(
      DependencyTag,
      new MockDependency({
        method: () => Effect.succeed("mock result")
      })
    )

    const testLayer = Layer.provide(
      ServiceLayer,
      mockDependencyLayer
    )

    it("should test component behavior", () =>
      Effect.gen(function* (_) {
        const service = yield* ServiceTag
        // Test with mocked dependency
        yield* expect(service.method()).toEqual("mock result")
      }).pipe(Effect.provide(testLayer)))
  })
  ```

### 3. Unit Tests (For Complex Logic or Specific Error Paths)
- **When to Use**
  - Testing complex business logic in isolation
  - Verifying specific error conditions
  - Testing edge cases

- **Example Unit Test**
  ```typescript
  import { describe, it, expect } from "@effect/vitest"

  describe("UnitTest", () => {
    const createTestLayer = (config: Config) => 
      Layer.succeed(ConfigProvider.ConfigProvider, 
        ConfigProvider.fromJson(config))

    it("should handle specific error case", () =>
      Effect.gen(function* (_) {
        const service = yield* ServiceTag
        // Test specific behavior
        yield* expect(service.errorMethod()).toFailWith(new ExpectedError())
      }).pipe(Effect.provide(testLayer)))
  })
  ```

## Testing Patterns

### Layer Composition
```typescript
// Helper for composing test layers
const createTestLayer = <R, E, A>(
  mainLayer: Layer.Layer<R, E, A>,
  dependencies: Layer.Layer<never, never, R>
): Layer.Layer<never, E, A> =>
  Layer.provide(mainLayer, dependencies)

// Helper for common test scenarios
const withTestResources = <R, E, A>(
  effect: Effect.Effect<R, E, A>,
  setup: Effect.Effect<never, never, R>
) =>
  Effect.gen(function* (_) {
    const resources = yield* setup
    const result = yield* effect.pipe(Effect.provide(resources))
    return result
  })
```

### Error Testing
```typescript
import { describe, it, expect } from "@effect/vitest"

it("should handle errors correctly", () =>
  Effect.gen(function* (_) {
    const service = yield* ServiceTag
    yield* expect(service.errorMethod()).toFailWith(
      new ExpectedError("error message")
    )
  }).pipe(Effect.provide(testLayer)))
```

### Configuration Testing
```typescript
import { describe, it, expect } from "@effect/vitest"

describe("ConfigTest", () => {
  const setup = Effect.gen(function* (_) {
    const tempDir = yield* Effect.sync(() => path.join(__dirname, "temp"))
    const configPath = yield* Effect.sync(() => path.join(tempDir, "config.json"))
    
    yield* Effect.sync(() => fs.mkdirSync(tempDir, { recursive: true }))
    yield* Effect.sync(() => fs.writeFileSync(
      configPath,
      JSON.stringify({ /* test config */ })
    ))
    
    return { tempDir, configPath }
  })

  const cleanup = ({ tempDir }: { tempDir: string }) =>
    Effect.sync(() => fs.rmSync(tempDir, { recursive: true, force: true }))

  it("should load configuration", () =>
    Effect.gen(function* (_) {
      const { tempDir } = yield* setup
      const config = yield* ConfigTag
      
      yield* expect(config).toBeDefined()
      yield* Effect.addFinalizer(() => cleanup({ tempDir }))
    }).pipe(Effect.provide(configTestLayer)))
})
```

## Best Practices

1. **Effect-Native Testing**
   - Use `@effect/vitest` matchers and assertions
   - Leverage Effect's type system for test safety
   - Use Effect's resource management
   - Write tests in an Effect-first style

2. **Resource Management**
   - Use `Effect.addFinalizer` for cleanup
   - Leverage Effect's scoped resources
   - Use Effect's error handling for cleanup failures
   - Ensure resources are always cleaned up

3. **Error Testing**
   - Use Effect-native error assertions
   - Test both success and failure paths
   - Verify error types and messages
   - Test error recovery paths

4. **Configuration**
   - Use Effect's configuration system
   - Test configuration validation
   - Verify configuration loading
   - Test configuration error cases

## Anti-patterns to Avoid

1. **DO NOT**
   - Mix Effect and non-Effect testing styles
   - Use raw Vitest assertions when Effect ones exist
   - Manually manage Effect runtime
   - Use non-Effect async patterns

2. **NEVER**
   - Skip Effect-native error handling
   - Use raw promises in tests
   - Bypass Effect's type system
   - Use manual resource cleanup
   - Mix Effect and non-Effect assertions 