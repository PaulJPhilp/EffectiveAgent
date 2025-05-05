# AgentRuntime Communication Protocol

## Overview

The AgentRuntime Communication Protocol is a message-based system that enables communication between `AgentRuntime` instances in the EffectiveAgent framework. It uses the `AgentActivity` as its primary unit of communication, providing a standardized way for runtime instances to exchange messages, commands, events, and state changes.

## Message Format: AgentActivity

Every message in the protocol is an `AgentActivity` with the following structure:

```typescript
interface AgentActivity {
    /** Unique identifier for this activity record */
    readonly id: string
    /** The AgentRuntime this activity is associated with */
    readonly agentRuntimeId: AgentRuntimeId
    /** When this activity occurred or was created */
    readonly timestamp: number
    /** The type of activity */
    readonly type: AgentActivityType
    /** The actual data being conveyed */
    readonly payload: unknown
    /** Additional context about this activity */
    readonly metadata: {
        /** The AgentRuntime that created this activity (if different) */
        readonly sourceAgentRuntimeId?: AgentRuntimeId
        /** The correlation ID for tracking related activities */
        readonly correlationId?: string
        /** Whether this activity has been processed */
        readonly processed?: boolean
        /** Whether this activity has been persisted */
        readonly persisted?: boolean
        /** Message priority for processing order */
        readonly priority?: MessagePriority
        /** When the message should be processed (timestamp) */
        readonly scheduledFor?: number
        /** Maximum time to wait for processing before failing */
        readonly timeout?: number
        /** Custom metadata fields */
        readonly [key: string]: unknown
    }
}
```

### Activity Types

Messages can be of the following types (`AgentActivityType`):
- `COMMAND`: Instructions to perform an action
- `EVENT`: Notifications of something that happened
- `QUERY`: Requests for information
- `RESPONSE`: Replies to queries
- `ERROR`: Error notifications
- `STATE_CHANGE`: Updates to an AgentRuntime's managed state
- `SYSTEM`: System-level messages

### Message Priority

Messages can be assigned different priority levels:
- `HIGH`: Urgent messages that should be processed first
- `NORMAL`: Standard priority (default)
- `LOW`: Non-urgent messages
- `BACKGROUND`: Background tasks

## Communication Service (`AgentRuntimeService`)

The `AgentRuntimeService` manages all communication between `AgentRuntime` instances. It provides three main operations:

### 1. Sending Activities

To send an activity to an AgentRuntime instance:

```typescript
const activity: AgentActivity = {
    id: crypto.randomUUID(),
    agentRuntimeId: targetId,
    timestamp: Date.now(),
    type: AgentActivityType.COMMAND,
    payload: { type: "DO_SOMETHING", data: {} },
    metadata: {}
};

yield* service.send(targetId, activity);
```

### 2. Getting State

To get the current state managed by an AgentRuntime instance:

```typescript
const state = yield* service.getState<MyStateType>(runtimeId);
```

### 3. Subscribing to Activities

To subscribe to activities processed or emitted by an AgentRuntime instance:

```typescript
yield* pipe(
    service.subscribe(runtimeId),
    Stream.filter(activity => activity.type === AgentActivityType.EVENT),
    Stream.forEach(event => handleEvent(event))
);
```

## Example: Counter AgentRuntime Communication

Here's a complete example showing communication between a supervisor and a counter runtime:

```typescript
// Create a counter
yield* supervisor.send({
    id: crypto.randomUUID(),
    agentRuntimeId: supervisorId,
    timestamp: Date.now(),
    type: AgentActivityType.COMMAND,
    payload: { type: SupervisorCommand.CREATE_COUNTER },
    metadata: {}
});

// Subscribe to state changes
yield* pipe(
    counter.subscribe(),
    Stream.filter(activity => activity.type === AgentActivityType.STATE_CHANGE),
    Stream.forEach(state => console.log("Counter state:", state.payload))
);

// Send increment command
yield* counter.send({
    id: crypto.randomUUID(),
    agentRuntimeId: counterId,
    timestamp: Date.now(),
    type: AgentActivityType.COMMAND,
    payload: { type: CounterCommand.INCREMENT },
    metadata: {}
});
```

## Activity Processing (`agentWorkflow`)

Each AgentRuntime processes activities through its `agentWorkflow` function:

```typescript
type AgentWorkflow<S, E = never, R = never> = (
    activity: AgentActivity,
    state: S
) => Effect.Effect<S, E, R>
```

The agentWorkflow:
1. Receives an AgentActivity and current state
2. Processes the activity based on its type and payload
3. Returns a new state
4. Can produce side effects using the Effect type

## Error Handling

The protocol handles several types of errors:
- `AgentRuntimeNotFoundError`: When sending to a non-existent runtime ID
- `AgentRuntimeTerminatedError`: When sending to a terminated runtime instance
- `AgentRuntimeProcessingError`: When activity processing fails
- `AgentRuntimeSendError`: When activity delivery fails

Each error includes:
- The runtime ID
- A descriptive message
- Additional context (e.g., termination timestamp)

## Persistence

The `AgentStore` service provides persistence for all AgentActivities:
- Activities are explicitly logged by agentWorkflow logic
- Records can be queried by runtime ID, time range, and sync state
- Supports live queries via streamRecords
- Handles both local storage and synchronization with remote servers

## Best Practices

1. **Activity Design**
   - Use specific activity types for different purposes
   - Include correlation IDs for related activities
   - Set appropriate priorities for time-sensitive operations
   - Add meaningful metadata for debugging and tracking

2. **State Management**
   - Use STATE_CHANGE activities to notify of state updates
   - Include the relevant state delta or full state in the payload
   - Add operation context in metadata

3. **Error Handling**
   - Always handle potential errors in send/receive operations
   - Use ERROR activities to propagate failures
   - Include sufficient context in error messages

4. **Performance**
   - Use message priorities for time-critical operations
   - Be mindful of potential backpressure when sending activities
   - Clean up subscriptions when no longer needed

5. **Testing**
   - Test activity flows end-to-end
   - Verify error handling scenarios
   - Test performance under load
   - Validate state consistency

## Example Implementation

For a complete example of how to implement an AgentRuntime using this protocol, see:
- `src/agent-runtime/examples/counter/counter.workflow.ts` - Simple counter workflow
- `src/agent-runtime/examples/supervisor/supervisor.workflow.ts` - Orchestrator managing other runtimes
- `src/agent-runtime/examples/async/async-task.workflow.ts` - Asynchronous operation example