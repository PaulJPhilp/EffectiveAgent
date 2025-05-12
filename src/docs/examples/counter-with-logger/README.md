# Counter Service with Logger Example

This example demonstrates how to properly implement service dependencies using the Effect Service Pattern. It extends the basic counter service by adding logging capabilities through dependency injection.

## Key Features

- Service dependency management
- Proper dependency injection
- Logging integration
- Error handling with logging
- Configuration handling

## Implementation Details

1. **Service Dependencies**
   - Uses `Effect.service<LoggerServiceApi>()` to declare dependency
   - Properly lists dependencies in the service definition
   - Demonstrates dependency injection in practice

2. **Logging Integration**
   - Logs all operations with appropriate levels
   - Includes relevant context in log messages
   - Handles errors with proper logging

3. **Error Handling**
   - Maintains original error types
   - Adds logging for error cases
   - Preserves error context

## Usage Example

```typescript
import { Effect, Config } from "effect"
import { CounterWithLoggerService } from "./counter-with-logger"
import { LoggerService } from "../logger-service"

const program = Effect.gen(function* () {
  const counter = yield* CounterWithLoggerService
  
  // Operations will now log automatically
  yield* counter.increment(5)
  const value = yield* counter.get()
  yield* counter.decrement(2)
  
  // Error cases are logged automatically
  const result = yield* Effect.either(counter.decrement(10))
  if (result._tag === "Left") {
    console.log("Operation failed as expected")
  }
})

// Run with both services and configuration
await Effect.runPromise(
  program.pipe(
    Effect.provide(CounterWithLoggerService),
    Effect.provide(LoggerService),
    Effect.provideConfig(Config.from({ LOG_LEVEL: "info" }))
  )
)
```

## Key Patterns Demonstrated

1. **Service Dependencies**
   - How to declare dependencies
   - How to access dependent services
   - How to provide multiple services

2. **Configuration**
   - How to use Effect's Config system
   - How to provide configuration
   - Default configuration handling

3. **Logging Patterns**
   - Operation logging
   - Error logging
   - Context inclusion
   - Log level usage

## Learning Points

1. **Dependency Management**
   - Service dependency declaration
   - Dependency injection
   - Service composition

2. **Configuration**
   - Config integration
   - Default values
   - Runtime configuration

3. **Logging Best Practices**
   - Structured logging
   - Context inclusion
   - Error logging
   - Log levels

## Testing

The service can be tested using the following approaches:

1. **Unit Testing**
   ```typescript
   import { Effect } from "effect"
   import { expect, it } from "vitest"
   import { CounterWithLoggerService } from "./counter-with-logger"
   import { LoggerService } from "../logger-service"
   
   it("should log operations", async () => {
     const program = Effect.gen(function* () {
       const counter = yield* CounterWithLoggerService
       yield* counter.increment(5)
       const value = yield* counter.get()
       expect(value).toBe(5)
     })

     await Effect.runPromise(
       program.pipe(
         Effect.provide(CounterWithLoggerService),
         Effect.provide(LoggerService)
       )
     )
   })
   ```

2. **Mock Logger Testing**
   ```typescript
   const mockLogger = {
     info: vi.fn(() => Effect.unit),
     warn: vi.fn(() => Effect.unit),
     error: vi.fn(() => Effect.unit)
   }

   const program = Effect.gen(function* () {
     const counter = yield* CounterWithLoggerService
     yield* counter.increment(5)
     expect(mockLogger.info).toHaveBeenCalled()
   })
   ```

## Related Documentation

- See `reference/service-pattern.md` for core concepts
- See `implementation.md` for implementation details
- See `testing.md` for testing strategies 