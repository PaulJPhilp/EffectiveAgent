# Service Pattern Examples

This document provides examples of implementing the Effect service pattern in TypeScript.

## Logger Service Example

### API Definition
```typescript
import { Effect } from "effect"

interface LoggerServiceApi {
    readonly info: (message: string, context?: Record<string, unknown>) => Effect.Effect<void, LoggerError>
    readonly warn: (message: string, context?: Record<string, unknown>) => Effect.Effect<void, LoggerError>
    readonly error: (message: string, error?: Error, context?: Record<string, unknown>) => Effect.Effect<void, LoggerError>
}
```

### Error Types
```typescript
import { Data } from "effect"

export class LoggerError extends Data.TaggedError("LoggerError")<{
    readonly message: string
    readonly cause?: unknown
}> {}
```

### Service Implementation
```typescript
import { Effect } from "effect"

export class LoggerService extends Effect.Service<LoggerServiceApi>()("LoggerService", {
    info: (message, context) => Effect.succeed(void 0),
    warn: (message, context) => Effect.succeed(void 0),
    error: (message, error, context) => Effect.succeed(void 0)
})
```

## Counter Service Example

### API Definition
```typescript
import { Effect } from "effect"

interface CounterServiceApi {
    readonly increment: () => Effect.Effect<number, never>
    readonly decrement: () => Effect.Effect<number, never>
    readonly getCount: () => Effect.Effect<number, never>
}
```

### Service Implementation
```typescript
import { Effect, Ref } from "effect"

export class CounterService extends Effect.Service<CounterServiceApi>()("CounterService", {
    effect: Effect.gen(function* () {
        const count = yield* Ref.make(0)
        
        return {
            increment: () => Ref.updateAndGet(count, n => n + 1),
            decrement: () => Ref.updateAndGet(count, n => n - 1),
            getCount: () => Ref.get(count)
        }
    })
})
```

## Usage Example

```typescript
const program = Effect.gen(function* () {
    const logger = yield* LoggerService
    const counter = yield* CounterService
    
    const count = yield* counter.increment()
    yield* logger.info("Counter incremented", { count })
})
``` 