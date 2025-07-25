# Effect Service Pattern for v3.16+

## Service Interface Definition

Define a clear interface for your service first:

```typescript
// In types.ts
export interface MyServiceInterface {
  readonly operation1: (input: Input) => Effect.Effect<Output, MyError>;
  readonly operation2: (id: string) => Effect.Effect<Option.Option<Entity>, MyError>;
}
```

## Effect.Service Class Pattern (Canonical)

**Always use the Effect.Service class pattern for service definitions and dependency injection. Do NOT use Context.Tag directly or via class-based tag pattern.**

```typescript
// In service.ts
export class MyService extends Effect.Service<MyServiceInterface>()("MyService", {
  effect: Effect.gen(function* () {
    // Implementation
  })
})
```

## Service Implementation

Implement your service with `Effect.gen`:

```typescript
// In live.ts
export const make = Effect.gen(function* () {
  // Access dependencies directly with yield*
  const dependency = yield* DependencyService
  
  const operation1 = (input: Input): Effect.Effect<Output, MyError> => {
    return dependency.someMethod(input).pipe(
      Effect.mapError(err => new MyError({ cause: err }))
    );
  };
  
  const operation2 = (id: string): Effect.Effect<Option.Option<Entity>, MyError> => {
    // Implementation
  };
  
  return {
    operation1,
    operation2
  };
});

// Create the layer
export const MyServiceLiveLayer = Layer.effect(
  MyService,
  make
);
```

## Consuming Services

Access services in Effect.gen functions:

```typescript
const program = Effect.gen(function* () {
  // Access service directly with yield*
  const myService = yield* MyService;
  
  // Use the service
  const result = yield* myService.operation1(input);
  
  return result;
});
```

## Layer Composition

Compose service layers properly:

```typescript
// Combine individual layers
const AppLayer = Layer.mergeAll(
  ServiceA.Live,
  ServiceB.Live,
  ServiceC.Live
);

// Use Layer.provide for sequential dependencies 
const LayerWithDependency = Layer.provide(
  DependencyLayer,
  DependentServiceLayer
);
```

## Testing Services Using the Test Harness

Use the standard test harness utility to avoid type inference issues:

```typescript
// Import the test harness utility
import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js";

// Create test implementation
const createTestImpl = () => {
  return Effect.gen(function* () {
    // Create any needed state
    const store = yield* Ref.make(new Map());
    
    // Implement service methods
    const operation1 = (input: Input): Effect.Effect<Output, MyError> => {
      // Test implementation
    };
    
    return {
      operation1,
      // Other methods
    };
  });
};

// Create the test harness for the service
const serviceHarness = createServiceTestHarness(
  MyService,  // Pass the service class
  createTestImpl // Pass the implementation factory
);

// In your tests
it("should perform operation1 successfully", async () => {
  const effect = Effect.gen(function* () {
    const service = yield* MyService;
    const result = yield* service.operation1(testInput);
    expect(result).toEqual(expectedOutput);
    return result;
  });
  
  // Run the test with the harness
  await serviceHarness.runTest(effect);
});

// Test error cases
it("should fail with specific error", async () => {
  const effect = Effect.gen(function* () {
    const service = yield* MyService;
    return yield* service.operation2("invalid-id");
  });
  
  // Assert specific error
  await serviceHarness.expectError(effect, "MySpecificErrorTag");
});
```

The test harness provides these utilities:

- `runTest`: Run effects expecting success
- `runFailTest`: Run effects expecting failure, returns Exit state
- `expectError`: Assert a specific error tag was thrown
- `TestLayer`: Access the layer directly if needed

## Common Mistakes to Avoid

1. **DO NOT** use `Context.Tag` or any explicit tag property—use only the Effect.Service class pattern for all service definitions and dependency injection.
2. **DO NOT** use `Context.GenericTag`.
3. **DO NOT** use function parameter in `Effect.gen` like `function* (_)`—use direct yielding.
4. **DO NOT** forget to handle errors explicitly in your service implementation.
5. **DO NOT** mix different versions of the Effect pattern in the same codebase.
6. **DO NOT** add `.Default` or `.Live` static properties to Effect.Service classes - these cause type errors and are not part of the canonical pattern.

## Anti-patterns to Avoid

### Adding .Default Properties to Services
```typescript
// DON'T DO THIS - Causes type errors
export class MyService extends Effect.Service<MyServiceInterface>()("MyService", {
  effect: makeMyService
}) {
  static readonly Default = Layer.effect(MyService, makeMyService) // WRONG!
}
```

The Effect.Service class should be used directly as a layer without additional static properties. 