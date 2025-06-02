---
trigger: model_decision
description: 
globs: 
---
# Effect
- Use Effect.flatMap for async operations.
- Use Effect.logDebug for debugging.
- Use Effect.logWarning for warnings.
- Use Effect.logError for errors.
- Use Effect version 3.16 or later.
- Avoid using the (_) pattern in Effect.gen.

# Effect Specifics

## Effect Rules

Effect is our core async and concurrency library.

## Basic Rules

- Use Effect version 3.16 or later.
- Always provide explicit types for Effect operations.
- Use Effect.gen for complex flows.
- Use pipe() for operation chaining.
- Handle errors explicitly with Effect.catchAll or Effect.mapError.
- Use Layer for dependency injection.

## Patterns

- Prefer Effect over Promise-based patterns.
- Use Service pattern for dependency injection.
- Use Effect.retry for retry logic.
- Use Effect.timeout for operation timeouts.
- Use Effect.scope for resource management.

## Testing

- Use Effect.runPromise for test execution.
- Provide mock layers for dependencies.
- Test both success and failure paths.
