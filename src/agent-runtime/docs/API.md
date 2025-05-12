# Agent Runtime Service API Documentation

## Service Interface

The Agent Runtime Service provides a type-safe API for managing agent runtimes through the `AgentRuntimeServiceApi` interface.

### Core Methods

#### create\<S\>
Creates a new agent runtime instance with initial state.

```typescript
create<S>(
    id: AgentRuntimeId, 
    initialState: S
): Effect.Effect<{
    id: AgentRuntimeId
    send: (activity: AgentActivity) => Effect.Effect<void>
    getState: () => Effect.Effect<AgentRuntimeState<S>>
    subscribe: () => Stream.Stream<AgentActivity>
}, AgentRuntimeError>
```

**Parameters:**
- `id`: Unique identifier for the runtime
- `initialState`: Initial state of type S

**Returns:**
- Effect containing runtime control interface
- May fail with `AgentRuntimeError` if runtime already exists

#### terminate
Gracefully shuts down an agent runtime.

```typescript
terminate(
    id: AgentRuntimeId
): Effect.Effect<void, AgentRuntimeNotFoundError>
```

**Parameters:**
- `id`: Runtime identifier to terminate

**Returns:**
- Effect for termination completion
- May fail with `AgentRuntimeNotFoundError` if runtime not found

#### send
Sends an activity to a runtime for processing.

```typescript
send(
    id: AgentRuntimeId, 
    activity: AgentActivity
): Effect.Effect<void, AgentRuntimeNotFoundError>
```

**Parameters:**
- `id`: Target runtime identifier
- `activity`: Activity to process

**Returns:**
- Effect for send completion
- May fail with `AgentRuntimeNotFoundError` if runtime not found

#### getState
Retrieves current state of a runtime.

```typescript
getState(
    id: AgentRuntimeId
): Effect.Effect<AgentRuntimeState<unknown>, AgentRuntimeNotFoundError>
```

**Parameters:**
- `id`: Runtime identifier

**Returns:**
- Effect containing runtime state
- May fail with `AgentRuntimeNotFoundError` if runtime not found

#### subscribe
Creates subscription stream for runtime activities.

```typescript
subscribe(
    id: AgentRuntimeId
): Stream.Stream<AgentActivity, AgentRuntimeNotFoundError>
```

**Parameters:**
- `id`: Runtime identifier

**Returns:**
- Stream of runtime activities
- May fail with `AgentRuntimeNotFoundError` if runtime not found

## Types

### AgentRuntimeState\<S\>
```typescript
interface AgentRuntimeState<S> {
    id: AgentRuntimeId
    state: S
    status: AgentRuntimeStatus
    lastUpdated: number
    error?: unknown
    processing?: {
        processed: number
        failures: number
        avgProcessingTime: number
        lastError?: unknown
    }
}
```

### AgentActivity
```typescript
interface AgentActivity {
    id: string
    type: AgentActivityType
    priority?: number
    payload?: unknown
    metadata?: Record<string, unknown>
}
```

### AgentRuntimeStatus
```typescript
enum AgentRuntimeStatus {
    IDLE = "IDLE",
    PROCESSING = "PROCESSING",
    ERROR = "ERROR"
}
```

### AgentActivityType
```typescript
enum AgentActivityType {
    STATE_CHANGE = "STATE_CHANGE",
    COMMAND = "COMMAND"
}
```

## Error Types

### AgentRuntimeError
Base error type for runtime operations.

```typescript
class AgentRuntimeError extends Error {
    readonly agentRuntimeId: AgentRuntimeId
    readonly _tag: "AgentRuntimeError"
}
```

### AgentRuntimeNotFoundError
Error for invalid runtime ID access.

```typescript
class AgentRuntimeNotFoundError extends AgentRuntimeError {
    readonly _tag: "AgentRuntimeNotFoundError"
}
```

### AgentRuntimeProcessingError
Error during activity processing.

```typescript
class AgentRuntimeProcessingError extends AgentRuntimeError {
    readonly activityId: string
    readonly _tag: "AgentRuntimeProcessingError"
}
```

## Usage Examples

### Creating and Managing a Runtime
```typescript
const program = Effect.gen(function* () {
    const runtime = yield* AgentRuntimeService.create("agent-1", { count: 0 })
    
    // Send activity
    yield* runtime.send({
        id: "increment",
        type: AgentActivityType.STATE_CHANGE,
        payload: { count: 1 }
    })
    
    // Get state
    const state = yield* runtime.getState()
    
    // Terminate
    yield* AgentRuntimeService.terminate(runtime.id)
})
```

### Subscribing to Activities
```typescript
const subscription = Effect.gen(function* () {
    const events = yield* AgentRuntimeService.subscribe("agent-1")
    yield* Stream.runForEach(
        event => Effect.log(`Received activity: ${event.id}`),
        events
    )
}) 