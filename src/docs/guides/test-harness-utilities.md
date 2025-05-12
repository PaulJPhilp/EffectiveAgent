# Test Harness Utilities

This document describes the utilities available in the test harness for the EffectiveAgent project. These utilities are designed to make testing Effect-based code easier and more type-safe.

## Type-Safe Mock Utilities

Located in `src/services/test-harness/utils/typed-mocks.ts`, these utilities help create type-safe mocks for testing.

### `createTypedMock<T>`

Creates a strongly typed mock object that conforms to a specified interface.

```typescript
import { createTypedMock } from '@/services/test-harness/utils/typed-mocks';

interface UserService {
  getUser: (id: string) => Effect.Effect<User, Error>;
  createUser: (user: User) => Effect.Effect<void, Error>;
}

// Create a mock with default implementation
const mockUserService = createTypedMock<UserService>({
  getUser: (id) => Effect.succeed({ id, name: 'Test User' }),
  createUser: () => Effect.succeed(void 0)
});

// Create a mock with overrides
const mockUserServiceWithOverrides = createTypedMock<UserService>(
  mockUserService,
  {
    getUser: (id) => Effect.fail(new Error('User not found'))
  }
);
```

### `mockSuccess<A, E, R>`

Creates an Effect that succeeds with the provided value.

```typescript
import { mockSuccess } from '@/services/test-harness/utils/typed-mocks';

// Create a mock Effect that succeeds with a user
const mockUserEffect = mockSuccess({ id: 'user-123', name: 'Test User' });
```

### `mockFailure<E, A, R>`

Creates an Effect that fails with the provided error.

```typescript
import { mockFailure } from '@/services/test-harness/utils/typed-mocks';

// Create a mock Effect that fails with an error
const mockErrorEffect = mockFailure(new Error('User not found'));
```

### `createServiceError<T, Args>`

Creates a type-safe error instance.

```typescript
import { createServiceError } from '@/services/test-harness/utils/typed-mocks';

class UserNotFoundError extends Error {
  constructor(public readonly userId: string, message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

// Create a typed error
const error = createServiceError(UserNotFoundError, 'user-123', 'User not found');
```

### `hasRequiredProperties<T>`

Type guard to check if an object matches the expected structure.

```typescript
import { hasRequiredProperties } from '@/services/test-harness/utils/typed-mocks';

interface User {
  id: string;
  name: string;
  email?: string;
}

// Check if an object has the required properties
const isUser = hasRequiredProperties<User>(obj, ['id', 'name']);
```

### `createMinimalMock<T>`

Creates a mock object with the minimum required properties.

```typescript
import { createMinimalMock } from '@/services/test-harness/utils/typed-mocks';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create a minimal mock with only the properties needed for testing
const mockUser = createMinimalMock<User>({
  id: 'user-123',
  name: 'Test User'
});
```

## Context Management Utilities

Located in `src/services/test-harness/utils/context-management.ts`, these utilities help manage Effect context in tests.

### `mockService<I, A>`

Creates a Layer that provides a mock service.

```typescript
import { mockService } from '@/services/test-harness/utils/context-management';
import { Context, Effect, Layer, pipe } from 'effect';

// Define a service interface
interface LoggerService {
  log: (message: string) => Effect.Effect<void>;
}

// Create a Context.Tag for the service
const LoggerServiceTag = Context.Tag<'LoggerService', LoggerService>();

// Create a mock implementation
const mockLogger: LoggerService = {
  log: (message) => Effect.sync(() => { /* mock implementation */ })
};

// Create a Layer that provides the mock logger
const mockLoggerLayer = mockService(LoggerServiceTag, mockLogger);

// Use the mock layer
const program = pipe(
  Effect.gen(function* (_) {
    const logger = yield* LoggerServiceTag;
    yield* logger.log('Test message');
    return 'success';
  }),
  Layer.provide(mockLoggerLayer)
);
```

### `createMockLayer<I, A>`

Creates a Layer that provides a mock service from a factory function.

```typescript
import { createMockLayer } from '@/services/test-harness/utils/context-management';

// Create a factory function that returns a mock implementation
const mockLoggerFactory = () => ({
  log: (message: string) => Effect.sync(() => { /* mock implementation */ })
});

// Create a Layer that provides the mock logger
const mockLoggerLayer = createMockLayer(LoggerServiceTag, mockLoggerFactory);
```

### `provideMockService<A, E, R, I, S>`

Provides a mock service to an Effect.

```typescript
import { provideMockService } from '@/services/test-harness/utils/context-management';

// Create an Effect that uses the logger
const program = Effect.gen(function* (_) {
  const logger = yield* LoggerServiceTag;
  yield* logger.log('Test message');
  return 'success';
});

// Provide the mock logger to the program
const programWithMockLogger = provideMockService(
  program,
  LoggerServiceTag,
  mockLogger
);
```

### `provideMockServices<A, E, R>`

Provides multiple mock services to an Effect.

```typescript
import { provideMockServices } from '@/services/test-harness/utils/context-management';

// Create an Effect that uses multiple services
const program = Effect.gen(function* (_) {
  const logger = yield* LoggerServiceTag;
  const userService = yield* UserServiceTag;
  
  yield* logger.log('Getting user');
  const user = yield* userService.getUser('user-123');
  
  return user;
});

// Provide multiple mock services to the program
const programWithMocks = provideMockServices(
  program,
  [LoggerServiceTag, mockLogger],
  [UserServiceTag, mockUserService]
);
```

### `withResource<R, E, A, B>`

Manages resource lifecycle (setup, use, teardown).

```typescript
import { withResource } from '@/services/test-harness/utils/context-management';

// Define a resource
type TestResource = { id: string; value: number };

// Create setup, use, and teardown functions
const setup = Effect.sync(() => {
  console.log('Setting up resource');
  return { id: 'test', value: 42 } as TestResource;
});

const teardown = (resource: TestResource) => Effect.sync(() => {
  console.log(`Tearing down resource: ${resource.id}`);
});

const use = (resource: TestResource) => Effect.sync(() => {
  console.log(`Using resource: ${resource.id}`);
  return `Used resource: ${resource.id}`;
});

// Use the withResource utility
const program = withResource(setup, teardown)(use);

// Run the program
Effect.runPromise(program).then(console.log);
```

## Best Practices

1. **Use Type-Safe Mocks**: Always use the type-safe mock utilities to ensure your mocks conform to the expected interfaces.

2. **Manage Resources Properly**: Use the `withResource` utility to ensure resources are properly set up and torn down, even if the test fails.

3. **Isolate Tests**: Use the context management utilities to provide mock services to your tests, ensuring they are isolated from each other.

4. **Test Error Handling**: Use the `mockFailure` utility to test how your code handles errors.

5. **Verify Mock Interactions**: Use Vitest's spy functions to verify that your mocks are called with the expected arguments.

## Example Test

Here's a complete example of a test using the test harness utilities:

```typescript
import { Effect } from 'effect';
import { describe, it, expect, vi } from 'vitest';
import { withResource } from '@/services/test-harness/utils/context-management';
import { createTypedMock } from '@/services/test-harness/utils/typed-mocks';

describe('Resource Management', () => {
  it('should properly set up and tear down a resource', async () => {
    // Create spies to verify setup and teardown
    const setupSpy = vi.fn();
    const teardownSpy = vi.fn();
    const useSpy = vi.fn();
    
    // Define a resource
    type TestResource = { id: string; value: number };
    
    // Create setup, use, and teardown functions
    const setup = Effect.sync(() => {
      setupSpy();
      return { id: 'test', value: 42 } as TestResource;
    });
    
    const teardown = (resource: TestResource) => Effect.sync(() => {
      teardownSpy(resource);
    });
    
    const use = (resource: TestResource) => Effect.sync(() => {
      useSpy(resource);
      return `Used resource: ${resource.id}`;
    });
    
    // Use the withResource utility
    const program = withResource(setup, teardown)(use);
    
    // Run the program
    const result = await Effect.runPromise(program);
    
    // Verify the result and that setup, use, and teardown were called in order
    expect(result).toBe('Used resource: test');
    expect(setupSpy).toHaveBeenCalledTimes(1);
    expect(useSpy).toHaveBeenCalledTimes(1);
    expect(useSpy).toHaveBeenCalledWith({ id: 'test', value: 42 });
    expect(teardownSpy).toHaveBeenCalledTimes(1);
    expect(teardownSpy).toHaveBeenCalledWith({ id: 'test', value: 42 });
  });
});
```
