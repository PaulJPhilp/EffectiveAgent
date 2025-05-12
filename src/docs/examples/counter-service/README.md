# Counter Service Example

This example demonstrates a complete implementation of the Effect Service Pattern using a simple counter service. It showcases key patterns and best practices for building Effect-based services.

## Features

- Thread-safe counter implementation using `Ref`
- Full type safety with TypeScript
- Comprehensive error handling
- Complete test coverage
- JSDoc documentation

## Key Implementation Points

1. **Service Interface (`api.ts`)**
   - Clear interface definition with JSDoc
   - Type-safe method signatures
   - Example usage in documentation

2. **Error Types (`errors.ts`)**
   - Hierarchical error structure
   - Tagged errors for pattern matching
   - Specific error types for different failure cases

3. **Service Implementation (`service.ts`)**
   - Uses `Effect.Service` pattern
   - Thread-safe state management with `Ref`
   - Error mapping and handling
   - Input validation

4. **Tests (`__tests__/service.test.ts`)**
   - Tests for all operations
   - Error case coverage
   - Clear test organization
   - Effect-based testing patterns

## Usage Example

```typescript
import { Effect } from "effect"
import { CounterService } from "./counter-service"

const program = Effect.gen(function* () {
  const counter = yield* CounterService
  
  // Increment counter
  yield* counter.increment(5)
  
  // Get current value
  const value = yield* counter.get()
  console.log(value) // 5
  
  // Decrement counter
  yield* counter.decrement(2)
  
  // Get new value
  const newValue = yield* counter.get()
  console.log(newValue) // 3
  
  // Reset counter
  yield* counter.reset()
})

// Run the program
Effect.runPromise(
  program.pipe(
    Effect.provide(CounterService)
  )
)
```

## Key Patterns Demonstrated

1. **State Management**
   - Using `Ref` for thread-safe state
   - Atomic operations
   - State validation

2. **Error Handling**
   - Tagged errors
   - Error mapping
   - Type-safe error handling
   - Error cause preservation

3. **Testing**
   - Unit tests
   - Error case testing
   - Effect-based assertions
   - Test organization

4. **Documentation**
   - JSDoc comments
   - Usage examples
   - Clear type definitions
   - Implementation notes

## Learning Points

1. **Service Pattern**
   - How to structure a service
   - Interface definition
   - Implementation details
   - Error handling patterns

2. **Effect Usage**
   - State management with `Ref`
   - Error handling with `Effect.fail`
   - Effect composition
   - Layer provision

3. **Testing Patterns**
   - How to test Effect-based code
   - Error testing strategies
   - State verification
   - Test organization

## Related Documentation

- See `reference/service-pattern.md` for core pattern documentation
- See `implementation.md` for implementation guidelines
- See `testing.md` for testing strategies 