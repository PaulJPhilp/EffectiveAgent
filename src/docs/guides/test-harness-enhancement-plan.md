# Test Harness Enhancement Plan

## Overview

This document outlines the plan for enhancing the test harness for the EffectiveAgent project. The goal is to improve type safety, add missing functionality, and provide better documentation without modifying the core project code.

## Goals

1. Improve type safety for mock objects and test utilities
2. Add utilities for creating isolated test contexts
3. Add utilities for providing dependencies to tests
4. Add utilities for managing the lifecycle of test resources
5. Add utilities for validating schemas in tests
6. Add utilities for simulating errors and edge cases
7. Add utilities for testing asynchronous code
8. Provide comprehensive documentation and examples

## Implementation Plan

### Phase 1: Type-Safe Mock Utilities (COMPLETED)

- Create a utility for creating type-safe mock objects (`createTypedMock`)
- Create a utility for creating type-safe mock Effects (`mockSuccess`, `mockFailure`)
- Create a utility for creating type-safe mock errors (`createServiceError`)
- Create a utility for creating minimal mock objects (`createMinimalMock`)
- Add tests for all utilities

### Phase 2: Context Management Utilities (COMPLETED)

- Create a utility for providing mock services to tests (`mockService`, `provideMockService`)
- Create a utility for providing multiple mock services (`provideMockServices`)
- Create a utility for managing the lifecycle of test resources (`withResource`)
- Add tests for all utilities

### Phase 3: Schema Validation Utilities (PLANNED)

- Create a utility for validating schemas in tests
- Create a utility for generating test data based on schemas
- Add tests for all utilities

### Phase 4: Error Simulation Utilities (PLANNED)

- Create a utility for simulating network errors
- Create a utility for simulating timeout errors
- Create a utility for simulating validation errors
- Add tests for all utilities

### Phase 5: Asynchronous Testing Utilities (PLANNED)

- Create a utility for testing asynchronous code
- Create a utility for testing timeouts and retries
- Add tests for all utilities

### Phase 6: Documentation and Examples (COMPLETED)

- Create comprehensive documentation for all utilities
- Create examples for common testing scenarios
- Create a guide for using the test harness utilities

## Completed Work

### Type-Safe Mock Utilities

Implemented in `src/services/test-harness/utils/typed-mocks.ts`:

- `createTypedMock<T>`: Creates a strongly typed mock object that conforms to a specified interface
- `mockSuccess<A, E, R>`: Creates an Effect that succeeds with the provided value
- `mockFailure<E, A, R>`: Creates an Effect that fails with the provided error
- `createServiceError<T, Args>`: Creates a type-safe error instance
- `hasRequiredProperties<T>`: Type guard to check if an object matches the expected structure
- `createMinimalMock<T>`: Creates a mock object with the minimum required properties
Usage example:

```typescript
const error = createServiceError(TextModelError, {
  description: "Model not found",
  module: "TextService",
  method: "validateModel"
});
```

#### 1.3 Type Guards for Response Objects

Add type guards to ensure response objects have the correct structure:

```typescript
export const isValidObjectResponse = <T>(
  response: unknown
): response is ObjectGenerationResult<T> => {
  return (
    typeof response === "object" &&
    response !== null &&
    "data" in response &&
    "model" in response &&
    "timestamp" in response &&
    "id" in response
  );
};
```

### 2. Enhanced Functionality

#### 2.1 Improved Context Management

Implement a proper context management system:

```typescript
export interface ContextManagerApi {
  // Create an isolated context for a test
  createIsolatedContext: <R, E, A>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, Exclude<R, TestHarnessApi>>;
  
  // Provide specific context for a test
  provideTestContext: <R, E, A>(
    effect: Effect.Effect<A, E, R>,
    context: Partial<R>
  ) => Effect.Effect<A, E, Exclude<R, keyof typeof context>>;
  
  // Get the current test context
  getContext: <R>() => Effect.Effect<R, never, never>;
}
```

#### 2.2 Schema Validation Helpers

Add utilities for validating objects against schemas:

```typescript
export interface SchemaValidationApi {
  // Validate an object against a schema
  validateObject: <T>(
    object: unknown,
    schema: Schema<T>
  ) => Effect.Effect<T, ValidationError>;
  
  // Create a validator function for a schema
  createValidator: <T>(
    schema: Schema<T>
  ) => (object: unknown) => Effect.Effect<T, ValidationError>;
  
  // Create a schema from a TypeScript interface
  createSchema: <T>(
    example: T
  ) => Schema<T>;
}
```

#### 2.3 Standardized Error Simulation

Create a library of common error scenarios:

```typescript
export interface ErrorSimulationApi {
  // Simulate network errors
  simulateNetworkError: () => Effect.Effect<never, NetworkError>;
  
  // Simulate timeouts
  simulateTimeout: (ms: number) => Effect.Effect<never, TimeoutError>;
  
  // Simulate rate limit errors
  simulateRateLimitError: () => Effect.Effect<never, RateLimitError>;
  
  // Simulate validation errors
  simulateValidationError: (
    field: string,
    message: string
  ) => Effect.Effect<never, ValidationError>;
}
```

#### 2.4 Test Lifecycle Management

Add utilities for managing test resources:

```typescript
export interface TestLifecycleApi {
  // Set up and tear down a resource for a test
  withResource: <R, A>(
    setup: Effect.Effect<A, never, R>,
    teardown: (resource: A) => Effect.Effect<void, never, R>
  ) => <E, B>(
    use: (resource: A) => Effect.Effect<B, E, R>
  ) => Effect.Effect<B, E, R>;
  
  // Run a test with a clean state
  withCleanState: <R, E, A>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, R>;
}
```

### 3. Documentation and Examples

#### 3.1 Comprehensive Documentation

Create detailed documentation for each component:

- Purpose and use cases
- API reference
- Usage examples
- Best practices

#### 3.2 Example Test Suite

Create a reference test suite that demonstrates all features:

- Basic test setup
- Mocking services
- Handling errors
- Testing complex scenarios
- Using fixtures

#### 3.3 Testing Patterns Guide

Document common testing patterns:

- How to test Effect-based code
- How to mock dependencies
- How to test error handling
- How to test asynchronous code

### 4. Integration with Testing Frameworks

#### 4.1 Vitest Integration

Add utilities for integrating with Vitest:

```typescript
export const setupVitestIntegration = () => {
  // Add custom matchers
  expect.extend({
    toSucceedWith(received, expected) {
      // Implementation
    },
    toFailWith(received, errorClass) {
      // Implementation
    }
  });
};
```

## Implementation Priorities

1. **Type Safety Improvements** - Highest priority
2. **Enhanced Context Management** - Critical for proper test isolation
3. **Schema Validation Helpers** - Important for testing object services
4. **Documentation and Examples** - Essential for adoption
5. **Error Simulation** - Helpful for testing error handling
6. **Test Lifecycle Management** - Useful for complex test scenarios
7. **Testing Framework Integration** - Nice to have

## Next Steps

1. Create a new branch for test harness enhancements
2. Implement the type safety improvements
3. Add the context management functionality
4. Develop schema validation helpers
5. Create comprehensive documentation and examples
6. Implement the remaining features based on priority
7. Create pull request for review

## Compatibility Considerations

All enhancements will be designed to be backward compatible with the existing test harness. This means:

- Existing tests will continue to work without modification
- New functionality will be added through extension, not modification
- Type improvements will be non-breaking

## Conclusion

This enhancement plan will significantly improve the test harness while maintaining compatibility with the existing codebase. The improvements will make tests more robust, easier to write, and less prone to errors.
