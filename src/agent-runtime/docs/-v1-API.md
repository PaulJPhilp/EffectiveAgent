# Agent Runtime Service API Documentation - v1

## Service Interface

The Agent Runtime Service provides a type-safe API for managing agent runtimes through the `AgentRuntimeService` Effect.Service Tag. The actual API is defined by `AgentRuntimeServiceApi`.

### Core Methods

#### create\<S\>
Creates a new agent runtime instance with the given initial state.

```typescript
create<S>(
    id: AgentRuntimeId, 
    initialState: S
): Effect.Effect<{
    // The unique ID of the created runtime.
    id: AgentRuntimeId;
    // Sends an activity to this specific runtime instance.
    // Returns an Effect that resolves when the activity is successfully offered to the runtime's mailbox.
    // May fail with MailboxError (e.g., if the mailbox is full and cannot accept more activities).
    send: (activity: AgentActivity) => Effect.Effect<void, MailboxError>;
    // Retrieves the current state of this specific runtime instance.
    // Returns an Effect that resolves with the AgentRuntimeState.
    // May fail if the runtime has been terminated or an error occurs during state retrieval.
    getState: () => Effect.Effect<AgentRuntimeState<S>>; 
    // Subscribes to the stream of activities processed by this specific runtime instance.
    // Each subscriber receives its own independent queue and stream.
    // Returns a Stream of AgentActivity. The stream may fail if the runtime is terminated.
    subscribe: () => Stream.Stream<AgentActivity, AgentRuntimeError>; 
}, AgentRuntimeError>;
```

**Parameters:**
- `id`: Unique identifier (`AgentRuntimeId`) for the new runtime.
- `initialState`: The initial state of type `S` for the runtime.

**Returns:**
- An `Effect.Effect` which resolves to an object containing:
    - `id`: The `AgentRuntimeId` of the created runtime.
    - `send`: A function to send an `AgentActivity` to this runtime. Returns `Effect<void, MailboxError>`.
    - `getState`: A function to get the current `AgentRuntimeState<S>`. Returns `Effect<AgentRuntimeState<S>>`.
    - `subscribe`: A function that returns a `Stream.Stream<AgentActivity, AgentRuntimeError>` for activities processed by this runtime.
- The effect may fail with `AgentRuntimeError` (e.g., if a runtime with the same ID already exists).

#### terminate
Gracefully shuts down an agent runtime and cleans up its resources (mailbox, processing fiber, subscriber queues).

```typescript
terminate(
    id: AgentRuntimeId
): Effect.Effect<void, AgentRuntimeError | AgentRuntimeNotFoundError>;
```

**Parameters:**
- `id`: The `AgentRuntimeId` of the runtime to terminate.

**Returns:**
- An `Effect.Effect` that completes when termination is done.
- May fail with `AgentRuntimeNotFoundError` if the runtime does not exist, or `AgentRuntimeError` for other termination issues.

#### send
Sends an activity to a specific runtime (identified by `id`) for processing.
This is a service-level method that looks up the runtime and then uses its internal send mechanism.

```typescript
send(
    id: AgentRuntimeId, 
    activity: AgentActivity
): Effect.Effect<void, AgentRuntimeError | AgentRuntimeNotFoundError | MailboxError>;
```

**Parameters:**
- `id`: The `AgentRuntimeId` of the target runtime.
- `activity`: The `AgentActivity` to process.

**Returns:**
- An `Effect.Effect` that completes when the activity is offered to the runtime's mailbox.
- May fail with `AgentRuntimeNotFoundError` if the runtime is not found, `MailboxError` if the runtime's mailbox is full, or `AgentRuntimeError` for other issues.

#### getState
Retrieves the current state of a specific runtime (identified by `id`).

```typescript
getState(
    id: AgentRuntimeId
): Effect.Effect<AgentRuntimeState<unknown>, AgentRuntimeError | AgentRuntimeNotFoundError>;
```

**Parameters:**
- `id`: The `AgentRuntimeId` of the runtime.

**Returns:**
- An `Effect.Effect` containing the `AgentRuntimeState<unknown>` (state is `unknown` at the service level because the specific type `S` is only known per runtime instance).
- May fail with `AgentRuntimeNotFoundError` if the runtime is not found or `AgentRuntimeError` for other issues.

#### subscribe
Creates a subscription stream for activities processed by a specific runtime (identified by `id`).
Each call to subscribe creates a new, independent stream for the caller.

```typescript
subscribe(
    id: AgentRuntimeId
): Stream.Stream<AgentActivity, AgentRuntimeError | AgentRuntimeNotFoundError>;
```

**Parameters:**
- `id`: The `AgentRuntimeId` of the runtime to subscribe to.

**Returns:**
- A `Stream.Stream` of `AgentActivity` objects.
- The stream may fail with `AgentRuntimeNotFoundError` if the runtime is not found, or `AgentRuntimeError` if the runtime is terminated during subscription.

## Types

### AgentRuntimeState\<S\>
Represents the state of an agent runtime.
```typescript
interface AgentRuntimeState<S> {
    id: AgentRuntimeId;
    state: S;
    status: AgentRuntimeStatus;
    lastUpdated: number;
    error?: AgentRuntimeError | AgentRuntimeProcessingError | EffectiveError; // More specific error typing
    processing?: {
        processed: number;
        failures: number;
        avgProcessingTime: number;
        lastError?: AgentRuntimeError | AgentRuntimeProcessingError | EffectiveError; // More specific error typing
    };
}
```

### AgentActivity
Represents an activity to be processed by a runtime.
```typescript
interface AgentActivity {
    id: string; // Unique ID for the activity itself
    agentRuntimeId: AgentRuntimeId; // ID of the target runtime
    timestamp: number; // Timestamp of when the activity was created/sent
    type: AgentActivityType;
    payload?: unknown; // Varies based on activity type
    metadata?: Record<string, unknown> & { priority?: number }; // For priority and other custom data
    sequence?: number; // Optional sequence number for ordering
}
```

### AgentRuntimeStatus
Possible statuses of an agent runtime.
```typescript
// Using a const object map instead of an enum as per project guidelines
export const AgentRuntimeStatus = {
    IDLE: "IDLE",
    PROCESSING: "PROCESSING", // This status might be transient if processing is very fast
    ERROR: "ERROR",
    TERMINATED: "TERMINATED" // Added for clarity, though not explicitly in AgentRuntimeState usually
} as const;
export type AgentRuntimeStatus = typeof AgentRuntimeStatus[keyof typeof AgentRuntimeStatus];
```

### AgentActivityType
Possible types of agent activities.
```typescript
// Using a const object map instead of an enum
export const AgentActivityType = {
    STATE_CHANGE: "STATE_CHANGE",
    COMMAND: "COMMAND" 
    // Other types can be added here
} as const;
export type AgentActivityType = typeof AgentActivityType[keyof typeof AgentActivityType];
```

## Error Types

All errors extend `EffectiveError` or are specific tagged errors from Effect (`Data.TaggedError`).

### AgentRuntimeError
Base error for issues originating from the AgentRuntimeService.
Extends `EffectiveError` (or `Data.TaggedError("AgentRuntimeError")`).
```typescript
class AgentRuntimeError extends Data.TaggedError("AgentRuntimeError")<{
    readonly agentRuntimeId?: AgentRuntimeId; // Optional, as some errors might not be specific to one runtime
    readonly message: string;
    readonly cause?: unknown;
}> {}
```

### AgentRuntimeNotFoundError
Error indicating that a specified AgentRuntimeId was not found.
Extends `AgentRuntimeError`.
```typescript
class AgentRuntimeNotFoundError extends Data.TaggedError("AgentRuntimeNotFoundError")<{
    readonly agentRuntimeId: AgentRuntimeId;
    readonly message: string;
    readonly cause?: unknown;
}> {}
// Typically: new AgentRuntimeNotFoundError({ agentRuntimeId: id, message: `Runtime ${id} not found` })
```

### AgentRuntimeProcessingError
Error indicating an issue occurred during the processing of an activity within a runtime.
Extends `AgentRuntimeError`.
```typescript
class AgentRuntimeProcessingError extends Data.TaggedError("AgentRuntimeProcessingError")<{
    readonly agentRuntimeId: AgentRuntimeId;
    readonly activityId?: string; // ID of the activity that caused the error
    readonly message: string;
    readonly cause?: unknown;
}> {}
```

### MailboxError
Error related to mailbox operations (e.g., offering to a full queue).
This would typically be a `Data.TaggedError` specific to the mailbox implementation.
```typescript
class MailboxError extends Data.TaggedError("MailboxError")<{
    readonly message: string;
    readonly cause?: unknown;
}> {}
// Example: new MailboxError({ message: "Mailbox full" })
```

## Usage Examples

### Creating, Using, and Terminating a Runtime
```typescript
import { AgentRuntimeService, makeAgentRuntimeId, AgentActivityType, AgentRuntimeStatus } from "@/agent-runtime"; // Adjust import path
import { Effect, Exit } from "effect";

const program = Effect.gen(function*() {
    const service = yield* AgentRuntimeService;
    const runtimeId = makeAgentRuntimeId("example-agent-1");
    const initialState = { value: 10, active: true };

    // 1. Create a runtime
    const runtimeControls = yield* service.create(runtimeId, initialState);
    console.log(`Runtime ${runtimeControls.id} created.`);

    // 2. Get initial state via runtime controls
    let state = yield* runtimeControls.getState();
    console.log("Initial state:", state.state, "Status:", state.status);
    expect(state.state).toEqual(initialState);
    expect(state.status).toBe(AgentRuntimeStatus.IDLE);

    // 3. Send an activity via runtime controls
    const activity1: AgentActivity = {
        id: "act-1",
        agentRuntimeId: runtimeId,
        timestamp: Date.now(),
        type: AgentActivityType.STATE_CHANGE,
        payload: { value: state.state.value + 5 },
        metadata: { priority: 1 }
    };
    yield* runtimeControls.send(activity1);
    console.log(`Activity ${activity1.id} sent.`);
    
    // Allow time for processing (in real apps, use subscriptions or other sync mechanisms)
    yield* Effect.sleep("50 millis"); 

    // 4. Get updated state via service-level method
    const updatedState = yield* service.getState(runtimeId);
    console.log("Updated state:", updatedState.state, "Status:", updatedState.status);
    expect((updatedState.state as any).value).toBe(15);

    // 5. Terminate the runtime
    yield* service.terminate(runtimeId);
    console.log(`Runtime ${runtimeId} terminated.`);

    // 6. Verify termination (attempt to get state should fail)
    const postTerminationState = yield* Effect.either(service.getState(runtimeId));
    expect(Exit.isLeft(postTerminationState)).toBe(true);
    if (Exit.isLeft(postTerminationState)) {
        console.log("State after termination (should fail):", postTerminationState.left);
        expect(postTerminationState.left._tag).toBe("AgentRuntimeNotFoundError");
    }
});

// To run (assuming serviceHarness or similar setup providing AgentRuntimeService.Live)
// serviceHarness.runTest(program);
```

### Subscribing to Activities from a Runtime
```typescript
import { AgentRuntimeService, makeAgentRuntimeId, AgentActivityType } from "@/agent-runtime"; // Adjust import path
import { Effect, Stream } from "effect";

const subscriptionProgram = Effect.gen(function*() {
    const service = yield* AgentRuntimeService;
    const runtimeId = makeAgentRuntimeId("subscriber-agent");
    const initialState = { messageLog: [] as string[] };

    // 1. Create runtime
    const runtimeControls = yield* service.create(runtimeId, initialState);

    // 2. Subscribe to its activities (using runtimeControls.subscribe for instance-specific stream)
    const activityStream = runtimeControls.subscribe();

    // Fork the stream processing so it runs in the background
    const streamFiber = yield* Stream.runForEach(
        activityStream,
        (activity) => Effect.sync(() => console.log(`[${runtimeId}] Received activity: ${activity.id}, Payload:`, activity.payload))
    ).pipe(Effect.fork);

    // 3. Send some activities
    yield* runtimeControls.send({
        id: "msg-1", agentRuntimeId: runtimeId, timestamp: Date.now(), 
        type: AgentActivityType.STATE_CHANGE, payload: { messageLog: ["Hello"] }
    });
    yield* service.send(runtimeId, { // Can also use service.send
        id: "cmd-1", agentRuntimeId: runtimeId, timestamp: Date.now(),
        type: AgentActivityType.COMMAND, payload: { command: "DO_SOMETHING" }
    });

    // Allow time for activities to be processed and logged by the stream
    yield* Effect.sleep("100 millis");

    // 4. Clean up: Interrupt the stream fiber and terminate runtime
    yield* streamFiber.interrupt();
    yield* service.terminate(runtimeId);
    console.log(`Subscription test for ${runtimeId} finished and cleaned up.`);
});

// To run (assuming serviceHarness or similar setup providing AgentRuntimeService.Live)
// serviceHarness.runTest(subscriptionProgram);
``` 