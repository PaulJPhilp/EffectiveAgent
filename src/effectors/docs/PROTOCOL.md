# Effector Communication Protocol

## Overview

The Effector Communication Protocol is a message-based system that enables communication between effectors in the EffectiveAgent framework. It uses the `AgentRecord` as its primary unit of communication, providing a standardized way for effectors to exchange messages, commands, events, and state changes.

## Message Format: AgentRecord

Every message in the protocol is an `AgentRecord` with the following structure:

```typescript
interface AgentRecord {
    /** Unique identifier for this record */
    readonly id: string
    /** The Effector this record is associated with */
    readonly effectorId: EffectorId
    /** When this record was created */
    readonly timestamp: number
    /** The type of record */
    readonly type: AgentRecordType
    /** The actual data being conveyed */
    readonly payload: unknown
    /** Additional context about this record */
    readonly metadata: {
        /** The Effector that created this record (if different from effectorId) */
        readonly sourceEffectorId?: EffectorId
        /** The correlation ID for tracking related records */
        readonly correlationId?: string
        /** Whether this record has been processed */
        readonly processed?: boolean
        /** Whether this record has been persisted */
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

### Record Types

Messages can be of the following types (`AgentRecordType`):
- `COMMAND`: Instructions to perform an action
- `EVENT`: Notifications of something that happened
- `QUERY`: Requests for information
- `RESPONSE`: Replies to queries
- `ERROR`: Error notifications
- `STATE_CHANGE`: Updates to an effector's state
- `SYSTEM`: System-level messages

### Message Priority

Messages can be assigned different priority levels:
- `HIGH`: Urgent messages that should be processed first
- `NORMAL`: Standard priority (default)
- `LOW`: Non-urgent messages
- `BACKGROUND`: Background tasks

## Communication Service

The `EffectorService` manages all communication between effectors. It provides three main operations:

### 1. Sending Messages

To send a message to an effector:

```typescript
const record: AgentRecord = {
    id: crypto.randomUUID(),
    effectorId: targetId,
    timestamp: Date.now(),
    type: AgentRecordType.COMMAND,
    payload: { type: "DO_SOMETHING", data: {} },
    metadata: {}
};

yield* service.send(targetId, record);
```

### 2. Getting State

To get the current state of an effector:

```typescript
const state = yield* service.getState<MyStateType>(effectorId);
```

### 3. Subscribing to Messages

To subscribe to messages from an effector:

```typescript
yield* pipe(
    service.subscribe(effectorId),
    Stream.filter(record => record.type === AgentRecordType.EVENT),
    Stream.forEach(event => handleEvent(event))
);
```

## Example: Counter Effector Communication

Here's a complete example showing communication between a controller and a counter effector:

```typescript
// Create a counter
yield* controller.send({
    id: crypto.randomUUID(),
    effectorId: controllerId,
    timestamp: Date.now(),
    type: AgentRecordType.COMMAND,
    payload: { type: ControllerCommand.CREATE_COUNTER },
    metadata: {}
});

// Subscribe to state changes
yield* pipe(
    counter.subscribe(),
    Stream.filter(record => record.type === AgentRecordType.STATE_CHANGE),
    Stream.forEach(state => console.log("Counter state:", state.payload))
);

// Send increment command
yield* counter.send({
    id: crypto.randomUUID(),
    effectorId: counterId,
    timestamp: Date.now(),
    type: AgentRecordType.COMMAND,
    payload: { type: CounterCommand.INCREMENT },
    metadata: {}
});
```

## Message Processing

Each effector processes messages through its `processingLogic` function:

```typescript
type ProcessingLogic<S, E = never, R = never> = (
    record: AgentRecord,
    state: S
) => Effect.Effect<S, E, R>
```

The processing logic:
1. Receives an AgentRecord and current state
2. Processes the message based on its type and payload
3. Returns a new state
4. Can produce side effects using the Effect type

## Error Handling

The protocol handles several types of errors:
- `EffectorNotFoundError`: When sending to a non-existent effector
- `EffectorTerminatedError`: When sending to a terminated effector
- `EffectorProcessingError`: When message processing fails
- `EffectorSendError`: When message delivery fails

Each error includes:
- The effector ID
- A descriptive message
- Additional context (e.g., termination timestamp)

## Persistence

The `AgentStore` service provides persistence for all AgentRecords:
- Messages are automatically stored
- Records can be queried by effector ID, time range, and sync state
- Supports live queries for real-time updates
- Handles both local storage and synchronization with remote servers

## Best Practices

1. **Message Design**
   - Use specific record types for different purposes
   - Include correlation IDs for related messages
   - Set appropriate priorities for time-sensitive operations
   - Add meaningful metadata for debugging and tracking

2. **State Management**
   - Use STATE_CHANGE records to notify of state updates
   - Include the full state or delta in the payload
   - Add operation context in metadata

3. **Error Handling**
   - Always handle potential errors in send/receive operations
   - Use ERROR records to propagate failures
   - Include sufficient context in error messages

4. **Performance**
   - Use message priorities for time-critical operations
   - Implement backpressure handling for high-volume scenarios
   - Clean up subscriptions when no longer needed

5. **Testing**
   - Test message flows end-to-end
   - Verify error handling scenarios
   - Test performance under load
   - Validate state consistency

## Example Implementation

For a complete example of how to implement an effector using this protocol, see:
- `src/effectors/examples/counter/counter.ts` - Simple counter effector
- `src/effectors/examples/controller/controller.ts` - Controller managing multiple effectors
- `src/effectors/examples/async/async-effector.ts` - Asynchronous operation example