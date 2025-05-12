# Error Recovery Patterns

## Core Principles

* All errors should extend EffectiveError
* Recovery strategies should be explicit and configurable
* Prefer graceful degradation over complete failure
* Log all error recoveries for monitoring
* Use appropriate backoff strategies for retries

## Error Types

```typescript
// DO: Define specific error types
class DatabaseError extends EffectiveError {
  constructor(params: {
    description: string
    code: string
    retryable: boolean
    module: string
    method: string
    cause?: unknown
  }) {
    super({
      description: params.description,
      module: params.module,
      method: params.method,
      cause: params.cause
    })
  }
}

class NetworkError extends EffectiveError {
  readonly statusCode: number
  readonly retryable: boolean

  constructor(params: {
    description: string
    statusCode: number
    retryable: boolean
    module: string
    method: string
    cause?: unknown
  }) {
    super({
      description: params.description,
      module: params.module,
      method: params.method,
      cause: params.cause
    })
    this.statusCode = params.statusCode
    this.retryable = params.retryable
  }
}

class ValidationError extends EffectiveError {
  readonly field: string

  constructor(params: {
    description: string
    field: string
    module: string
    method: string
    cause?: unknown
  }) {
    super({
      description: params.description,
      module: params.module,
      method: params.method,
      cause: params.cause
    })
    this.field = params.field
  }
}

// DO: Compose error types
type ServiceError = DatabaseError | NetworkError | ValidationError
```

## Retry Strategies

1. Basic Retry
```typescript
// DO: Define retry policies
interface RetryPolicy {
  readonly maxAttempts: number
  readonly backoff: Schedule.Schedule<unknown, Duration>
  readonly shouldRetry: (error: EffectiveError) => boolean
}

// DO: Implement retry with backoff
const withRetry = <R, E extends EffectiveError, A>(
  effect: Effect.Effect<A, E, R>,
  policy: RetryPolicy
): Effect.Effect<A, E, R> =>
  Effect.retry(
    effect,
    Schedule.recurWhile((error: E) => 
      policy.shouldRetry(error) && 
      policy.maxAttempts > 0
    ).pipe(
      Schedule.compose(policy.backoff)
    )
  )

// DO: Use exponential backoff
const exponentialBackoff = Schedule.exponential(
  Duration.millis(100),
  2.0
).pipe(
  Schedule.compose(Schedule.elapsed),
  Schedule.whileOutput((duration) => 
    Duration.lessThan(duration, Duration.seconds(30))
  )
)
```

2. Circuit Breaker
```typescript
class CircuitBreakerError extends EffectiveError {
  constructor(message: string) {
    super({
      description: message,
      module: "circuit-breaker",
      method: "protect"
    })
  }
}

interface CircuitBreakerConfig {
  readonly failureThreshold: number
  readonly resetTimeout: Duration
  readonly halfOpenMaxAttempts: number
}

class CircuitBreaker<E extends EffectiveError> extends Effect.Service<CircuitBreaker<E>>() {
  private state: Ref.Ref<{
    readonly status: "CLOSED" | "OPEN" | "HALF_OPEN"
    readonly failures: number
    readonly lastFailure: number
  }>

  // DO: Implement circuit breaker logic
  readonly protect = <R, A>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | CircuitBreakerError, R> =>
    Effect.gen(function* (_) {
      const currentState = yield* Ref.get(this.state)
      
      switch (currentState.status) {
        case "OPEN":
          if (this.shouldReset(currentState)) {
            yield* this.transitionToHalfOpen()
            return yield* this.executeWithProtection(effect)
          }
          return yield* Effect.fail(new CircuitBreakerError("Circuit is open"))
          
        case "HALF_OPEN":
          return yield* this.executeWithProtection(effect)
          
        case "CLOSED":
          return yield* this.executeWithProtection(effect)
      }
    })
}
```

3. Fallback Strategies
```typescript
// DO: Implement fallback chains
const withFallback = <R, E extends EffectiveError, A>(
  primary: Effect.Effect<A, E, R>,
  fallback: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
  primary.pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* (_) {
        yield* LogError("Primary failed, using fallback", error)
        return yield* fallback
      })
    )
  )

// DO: Implement degraded operation
const withDegradedOperation = <R, E extends EffectiveError, A>(
  effect: Effect.Effect<A, E, R>,
  degraded: (error: E) => Effect.Effect<A, never, R>
): Effect.Effect<A, never, R> =>
  effect.pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* (_) {
        yield* LogWarning("Using degraded operation", error)
        return yield* degraded(error)
      })
    )
  )
```

## Recovery Patterns

1. Graceful Degradation
```typescript
// DO: Implement feature flags for degradation
interface FeatureFlags {
  readonly useCache: boolean
  readonly useRealtime: boolean
  readonly useFallbackApi: boolean
}

// DO: Implement degraded service
class DegradedUserService extends Effect.Service<UserServiceApi>() {
  constructor(
    private readonly flags: FeatureFlags,
    private readonly primary: UserServiceApi,
    private readonly fallback: UserServiceApi
  ) {
    super()
  }

  readonly getUser = (id: string) =>
    this.flags.useCache
      ? withFallback(
          this.primary.getUser(id),
          this.fallback.getUser(id)
        )
      : this.fallback.getUser(id)
}
```

2. Partial Recovery
```typescript
// DO: Handle partial data recovery
interface PartialUser {
  readonly id: string
  readonly basicInfo: UserBasicInfo
  readonly details?: UserDetails
  readonly preferences?: UserPreferences
}

const getUserWithPartialRecovery = (
  id: string
): Effect.Effect<PartialUser, never> =>
  Effect.gen(function* (_) {
    const basicInfo = yield* Effect.succeed(/* get basic info */)
    const details = yield* Effect.either(/* get details */)
    const preferences = yield* Effect.either(/* get preferences */)

    return {
      id,
      basicInfo,
      details: Effect.isRight(details) ? details.right : undefined,
      preferences: Effect.isRight(preferences) ? preferences.right : undefined
    }
  })
```

3. Compensating Actions
```typescript
class TransactionError extends EffectiveError {
  constructor(params: {
    description: string
    module: string
    method: string
    cause?: unknown
  }) {
    super(params)
  }
}

interface TransactionStep<A> {
  readonly execute: Effect.Effect<A, TransactionError>
  readonly compensate: (result: A) => Effect.Effect<void, never>
}

const executeTransaction = <A>(
  steps: ReadonlyArray<TransactionStep<A>>
): Effect.Effect<ReadonlyArray<A>, TransactionError> =>
  Effect.gen(function* (_) {
    const results: A[] = []
    
    for (const step of steps) {
      try {
        const result = yield* step.execute
        results.push(result)
      } catch (error) {
        // Compensate in reverse order
        for (let i = results.length - 1; i >= 0; i--) {
          yield* steps[i].compensate(results[i])
        }
        return yield* Effect.fail(error as TransactionError)
      }
    }
    
    return results
  })
```

## Best Practices

1. Error Classification
```typescript
// DO: Classify errors for appropriate handling
const isRetryable = (error: EffectiveError): boolean => {
  if (error instanceof DatabaseError) {
    return error.retryable
  }
  if (error instanceof NetworkError) {
    return error.statusCode >= 500
  }
  return false
}

// DO: Define error severity
const getErrorSeverity = (error: EffectiveError): "LOW" | "MEDIUM" | "HIGH" => {
  if (error instanceof ValidationError) return "LOW"
  if (error instanceof NetworkError) return "MEDIUM"
  return "HIGH"
}
```

2. Recovery Monitoring
```typescript
// DO: Track recovery attempts
interface RecoveryMetrics {
  readonly attempts: number
  readonly successes: number
  readonly failures: number
  readonly lastAttempt: Date
  readonly meanRecoveryTime: number
}

// DO: Monitor circuit breaker state
interface CircuitBreakerMetrics {
  readonly status: "CLOSED" | "OPEN" | "HALF_OPEN"
  readonly failureCount: number
  readonly lastStateChange: Date
  readonly tripCount: number
}
```

## Anti-patterns to Avoid

1. Blind Retries
```typescript
// DON'T: Retry without checking retryability
const badRetry = Effect.retry(
  effect,
  Schedule.recurs(3)
) // WRONG!

// DO: Check if error is retryable
const goodRetry = Effect.retry(
  effect,
  Schedule.recurWhile((error: EffectiveError) => isRetryable(error))
)
```

2. Silent Fallbacks
```typescript
// DON'T: Silently fall back
const badFallback = Effect.catchAll(
  effect,
  () => fallback // WRONG!
)

// DO: Log fallback usage
const goodFallback = Effect.catchAll(
  effect,
  (error: EffectiveError) => Effect.gen(function* (_) {
    yield* LogWarning("Using fallback due to error", error)
    return yield* fallback
  })
)
```

3. Inconsistent Error Handling
```typescript
// DON'T: Mix different error handling styles
const badErrorHandling = Effect.catch(
  effect,
  (error) => {
    if (isRetryable(error)) {
      return Effect.retry(effect, Schedule.recurs(3))
    }
    throw error // WRONG!
  }
)

// DO: Use consistent Effect-based error handling
const goodErrorHandling = Effect.catchAll(
  effect,
  (error: EffectiveError) => 
    isRetryable(error)
      ? Effect.retry(effect, Schedule.recurs(3))
      : Effect.fail(error)
)
```

## Implementation Checklist

- [ ] Error types extend EffectiveError
- [ ] Retry strategies are configured with appropriate backoff
- [ ] Circuit breakers are monitoring failure rates
- [ ] Fallback strategies are defined and logged
- [ ] Recovery metrics are being collected
- [ ] Compensating actions are implemented for critical operations
- [ ] Error severity levels are properly classified
- [ ] Recovery attempts are properly logged
- [ ] Feature flags are in place for degradation
- [ ] Partial recovery is handled gracefully 