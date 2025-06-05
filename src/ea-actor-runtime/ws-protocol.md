# WebSocket Protocol for Agent Runtime

## Overview
This document defines the WebSocket communication protocol used by the EffectiveAgent Runtime system. The protocol enables real-time, bidirectional communication between clients and agent runtime instances.

## Message Format

All WebSocket messages must be JSON-encoded objects with the following structure:

```typescript
interface WebSocketMessage {
  /** Unique message ID (UUID recommended) */
  id: string;
  
  /** Type of message/activity */
  type: "COMMAND" | "EVENT" | "QUERY" | "RESPONSE" | "ERROR" | "STATE_CHANGE" | "SYSTEM";
  
  /** The AgentRuntime ID this message is for */
  agentRuntimeId: string;
  
  /** When this message was created (Unix timestamp in milliseconds) */
  timestamp: number;
  
  /** The actual payload of the message (can be any JSON-serializable data) */
  payload: unknown;
  
  /** Sequence number for ordering messages */
  sequence: number;
  
  /** Additional metadata */
  metadata: {
    /** Source AgentRuntime ID (if different from agentRuntimeId) */
    sourceAgentRuntimeId?: string;
    
    /** Correlation ID for tracking related messages */
    correlationId?: string;
    
    /** Whether this message has been processed */
    processed?: boolean;
    
    /** Whether this message has been persisted */
    persisted?: boolean;
    
    /** Message priority (0=highest, 3=lowest) */
    priority?: 0 | 1 | 2 | 3;
    
    /** When the message should be processed (Unix timestamp in milliseconds) */
    scheduledFor?: number;
    
    /** Maximum time to wait for processing before failing (in milliseconds) */
    timeout?: number;
    
    /** Custom metadata fields */
    [key: string]: unknown;
  };
}
```

## Message Types

### 1. COMMAND
Instructs the agent to perform an action.

**Example:**
```json
{
  "id": "msg-123",
  "type": "COMMAND",
  "agentRuntimeId": "agent-1",
  "timestamp": 1717536747000,
  "sequence": 1,
  "payload": {
    "command": "process",
    "data": "Hello, world!"
  },
  "metadata": {
    "priority": 1,
    "timeout": 5000
  }
}
```

### 2. EVENT
Notifies the agent of an event.

**Example:**
```json
{
  "id": "evt-456",
  "type": "EVENT",
  "agentRuntimeId": "agent-1",
  "timestamp": 1717536747000,
  "sequence": 2,
  "payload": {
    "event": "userMessage",
    "text": "Hello, agent!"
  }
}
```

### 3. QUERY
Requests information from the agent.

**Example:**
```json
{
  "id": "qry-789",
  "type": "QUERY",
  "agentRuntimeId": "agent-1",
  "timestamp": 1717536747000,
  "sequence": 3,
  "payload": {
    "query": "getStatus"
  }
}
```

### 4. RESPONSE
Response to a previous message.

**Example:**
```json
{
  "id": "rsp-012",
  "type": "RESPONSE",
  "agentRuntimeId": "agent-1",
  "timestamp": 1717536747050,
  "sequence": 4,
  "payload": {
    "status": "processing",
    "taskId": "task-789"
  },
  "metadata": {
    "correlationId": "msg-123"
  }
}
```

### 5. ERROR
Indicates an error occurred.

**Example:**
```json
{
  "id": "err-345",
  "type": "ERROR",
  "agentRuntimeId": "agent-1",
  "timestamp": 1717536747100,
  "sequence": 5,
  "payload": {
    "code": "NOT_FOUND",
    "message": "Agent not found",
    "details": {}
  },
  "metadata": {
    "correlationId": "msg-123"
  }
}
```

### 6. STATE_CHANGE
Notifies of a state change.

**Example:**
```json
{
  "id": "st-678",
  "type": "STATE_CHANGE",
  "agentRuntimeId": "agent-1",
  "timestamp": 1717536747150,
  "sequence": 6,
  "payload": {
    "from": "IDLE",
    "to": "PROCESSING"
  }
}
```

### 7. SYSTEM
System-level messages.

**Example:**
```json
{
  "id": "sys-901",
  "type": "SYSTEM",
  "agentRuntimeId": "agent-1",
  "timestamp": 1717536747200,
  "sequence": 7,
  "payload": {
    "action": "ping"
  }
}
```

## Priority Levels

```typescript
const Priority = {
  HIGH: 0,        // Critical system messages
  NORMAL: 1,      // User-initiated actions
  LOW: 2,         // Background processing
  BACKGROUND: 3   // Non-urgent tasks
};
```

## Connection Flow

1. **Client Connects** to the WebSocket endpoint
2. **Authentication** (if required) should be done via query parameters or headers during connection
3. **Send Messages** using the format above
4. **Handle Responses** by matching the `correlationId` in the metadata

## Error Handling

- All errors will be sent as `ERROR` type messages
- Include the original message ID in the error metadata when responding to a specific message
- Timeouts should be handled based on the `timeout` field in the metadata

## Implementation Notes

1. **Message Ordering**: The `sequence` number should be used to ensure messages are processed in order.
2. **Idempotency**: Clients should be prepared to handle duplicate messages.
3. **Reconnection**: Clients should implement reconnection logic with exponential backoff.
4. **Heartbeats**: Implement a ping/pong mechanism to detect stale connections.
5. **Rate Limiting**: Be prepared to handle rate limiting responses.

## Example Exchange

**Client:**
```json
{
  "id": "msg-123",
  "type": "COMMAND",
  "agentRuntimeId": "agent-1",
  "timestamp": 1717536747000,
  "sequence": 1,
  "payload": {
    "command": "process",
    "data": "Hello, world!"
  },
  "metadata": {
    "priority": 1,
    "timeout": 5000
  }
}
```

**Server:**
```json
{
  "id": "msg-456",
  "type": "RESPONSE",
  "agentRuntimeId": "agent-1",
  "timestamp": 1717536747050,
  "sequence": 2,
  "payload": {
    "status": "processing",
    "taskId": "task-789"
  },
  "metadata": {
    "correlationId": "msg-123",
    "processed": true
  }
}
```

## Best Practices

1. **Message IDs**: Always generate unique IDs for each message.
2. **Correlation IDs**: Include correlation IDs in responses to match them with requests.
3. **Error Handling**: Implement comprehensive error handling and logging.
4. **Validation**: Validate all incoming messages against the expected schema.
5. **Timeouts**: Always set appropriate timeouts for operations.
6. **Logging**: Log important events and errors for debugging purposes.

## Versioning

The current protocol version is `1.0.0`. Any breaking changes to the protocol will result in a new version number.

## Security Considerations

1. **Authentication**: Implement proper authentication for WebSocket connections.
2. **Authorization**: Ensure clients are only authorized to access the resources they should.
3. **Input Validation**: Validate all incoming messages to prevent injection attacks.
4. **Rate Limiting**: Implement rate limiting to prevent abuse.
5. **TLS**: Always use WebSocket Secure (WSS) in production environments.
