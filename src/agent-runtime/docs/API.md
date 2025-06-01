# Agent Runtime Service API Documentation

## Overview

The Agent Runtime Service provides a comprehensive API for:
1. **Agent Management**: Creating, terminating, and managing agent actors
2. **Service Access**: Accessing configured AI services (ModelService, ProviderService, PolicyService)
3. **State Management**: Managing agent state and activity processing
4. **Message Handling**: Sending activities and subscribing to runtime events

## Service Interface

The `AgentRuntimeServiceApi` interface defines all available operations:

```typescript
interface AgentRuntimeServiceApi {
  // Agent Management
  readonly create: <S>(id: AgentRuntimeId, initialState: S) => Effect.Effect<RuntimeInterface<S>, AgentRuntimeError>
  readonly terminate: (id: AgentRuntimeId) => Effect.Effect<void, AgentRuntimeNotFoundError>
  readonly send: (id: AgentRuntimeId, activity: AgentActivity) => Effect.Effect<void, AgentRuntimeNotFoundError>
  readonly getState: (id: AgentRuntimeId) => Effect.Effect<AgentRuntimeState<unknown>, AgentRuntimeNotFoundError>
  readonly subscribe: (id: AgentRuntimeId) => Stream.Stream<AgentActivity, AgentRuntimeNotFoundError>
  
  // Service Access
  readonly getModelService: () => Effect.Effect<ModelServiceApi, never>
  readonly getProviderService: () => Effect.Effect<ProviderServiceApi, never>
  readonly getPolicyService: () => Effect.Effect<PolicyServiceApi, never>
}
```

## Agent Management API

### create\<S\>
Creates a new agent runtime with initial state and workflow processing.

```typescript
create<S>(
  id: AgentRuntimeId, 
  initialState: S
): Effect.Effect<RuntimeInterface<S>, AgentRuntimeError>
```

**Parameters:**
- `id`: Unique identifier for the agent runtime
- `initialState`: Initial state of generic type S

**Returns:**
- `RuntimeInterface<S>` containing:
  - `id`: Runtime identifier
  - `send`: Method to send activities
  - `getState`: Method to get current state
  - `subscribe`: Method to subscribe to activities

**Errors:**
- `AgentRuntimeError`: If runtime with same ID already exists

**Example:**
```typescript
const runtime = yield* agentRuntimeService.create("my-agent", { count: 0 });
console.log(runtime.id); // "my-agent"
```

### terminate
Gracefully terminates an agent runtime and cleans up resources.

```typescript
terminate(id: AgentRuntimeId): Effect.Effect<void, AgentRuntimeNotFoundError>
```

**Parameters:**
- `id`: Runtime identifier to terminate

**Returns:**
- `void` on successful termination

**Errors:**
- `AgentRuntimeNotFoundError`: If runtime doesn't exist

**Example:**
```typescript
yield* agentRuntimeService.terminate("my-agent");
```

### send
Sends an activity to a runtime for processing.

```typescript
send(
  id: AgentRuntimeId, 
  activity: AgentActivity
): Effect.Effect<void, AgentRuntimeNotFoundError>
```

**Parameters:**
- `id`: Target runtime identifier
- `activity`: Activity record to process

**Returns:**
- `void` when activity is queued

**Errors:**
- `AgentRuntimeNotFoundError`: If runtime doesn't exist

**Example:**
```typescript
yield* agentRuntimeService.send("my-agent", {
  id: "task-1",
  agentRuntimeId: "my-agent",
  timestamp: Date.now(),
  type: AgentRecordType.COMMAND,
  payload: { action: "increment" },
  metadata: {},
  sequence: 1
});
```

### getState
Retrieves the current state of a runtime.

```typescript
getState(id: AgentRuntimeId): Effect.Effect<AgentRuntimeState<unknown>, AgentRuntimeNotFoundError>
```

**Parameters:**
- `id`: Runtime identifier

**Returns:**
- `AgentRuntimeState<unknown>` containing current state and status

**Errors:**
- `AgentRuntimeNotFoundError`: If runtime doesn't exist

**Example:**
```typescript
const state = yield* agentRuntimeService.getState("my-agent");
console.log(state.status); // "IDLE" | "PROCESSING" | "ERROR" | "TERMINATED"
```

### subscribe
Creates a subscription to runtime activity events.

```typescript
subscribe(id: AgentRuntimeId): Stream.Stream<AgentActivity, AgentRuntimeNotFoundError>
```

**Parameters:**
- `id`: Runtime identifier

**Returns:**
- `Stream` of `AgentActivity` events

**Errors:**
- `AgentRuntimeNotFoundError`: If runtime doesn't exist

**Example:**
```typescript
const stream = agentRuntimeService.subscribe("my-agent");
yield* Stream.runForeach(stream, (activity) => 
  Effect.log(`Received activity: ${activity.type}`)
);
```

## Service Access API

### getModelService
Returns the configured ModelService instance.

```typescript
getModelService(): Effect.Effect<ModelServiceApi, never>
```

**Returns:**
- `ModelServiceApi` for model operations

**Example:**
```typescript
const modelService = yield* agentRuntimeService.getModelService();
const isValid = yield* modelService.validateModel("gpt-4o");
```

### getProviderService  
Returns the configured ProviderService instance.

```typescript
getProviderService(): Effect.Effect<ProviderServiceApi, never>
```

**Returns:**
- `ProviderServiceApi` for provider operations

**Example:**
```typescript
const providerService = yield* agentRuntimeService.getProviderService();
const client = yield* providerService.createClient("openai");
```

### getPolicyService
Returns the configured PolicyService instance.

```typescript
getPolicyService(): Effect.Effect<PolicyServiceApi, never>
```

**Returns:**
- `PolicyServiceApi` for policy operations

**Example:**
```typescript
const policyService = yield* agentRuntimeService.getPolicyService();
const result = yield* policyService.checkPolicy({
  auth: { userId: "user1" },
  requestedModel: "gpt-4o",
  operationType: "text:generate"
});
```

## Core Types

### AgentRuntimeState\<S\>
Represents the current state of an agent runtime.

```typescript
interface AgentRuntimeState<S> {
  readonly id: AgentRuntimeId
  readonly state: S
  readonly status: AgentRuntimeStatus
  readonly lastUpdated: number
  readonly processing?: {
    readonly processed: number
    readonly failures: number
    readonly avgProcessingTime: number
    readonly lastError?: unknown
  }
}
```

### AgentActivity
Base interface for all activities sent to agents.

```typescript
interface AgentActivity {
  readonly id: string
  readonly agentRuntimeId: AgentRuntimeId
  readonly timestamp: number
  readonly type: AgentRecordType
  readonly payload: unknown
  readonly metadata: Record<string, unknown>
  readonly sequence: number
}
```

### AgentRuntimeStatus
Enumeration of possible runtime states.

```typescript
enum AgentRuntimeStatus {
  IDLE = "IDLE",
  PROCESSING = "PROCESSING", 
  ERROR = "ERROR",
  TERMINATED = "TERMINATED"
}
```

### AgentRecordType
Types of activities that can be sent to agents.

```typescript
enum AgentRecordType {
  COMMAND = "COMMAND",
  STATE_CHANGE = "STATE_CHANGE"
}
```

## Error Types

### AgentRuntimeError
Base error for all runtime operations.

```typescript
class AgentRuntimeError extends Data.TaggedError("AgentRuntimeError")<{
  readonly agentRuntimeId: AgentRuntimeId
  readonly description: string
  readonly module: string
  readonly method: string
  readonly cause?: unknown
}> {}
```

### AgentRuntimeNotFoundError
Error when trying to access a non-existent runtime.

```typescript
class AgentRuntimeNotFoundError extends AgentRuntimeError {
  readonly _tag = "AgentRuntimeNotFoundError"
}
```

### AgentRuntimeProcessingError
Error during activity processing.

```typescript
class AgentRuntimeProcessingError extends AgentRuntimeError {
  readonly _tag = "AgentRuntimeProcessingError"
}
```

### AgentRuntimeTerminatedError
Error when trying to operate on a terminated runtime.

```typescript
class AgentRuntimeTerminatedError extends AgentRuntimeError {
  readonly _tag = "AgentRuntimeTerminatedError"
}
```

## Complete Usage Example

```typescript
const completeExample = Effect.gen(function* () {
  // Get the agent runtime service
  const agentRuntime = yield* AgentRuntimeService;
  
  // Get AI services
  const modelService = yield* agentRuntime.getModelService();
  const policyService = yield* agentRuntime.getPolicyService();
  
  // Validate model before creating agent
  const modelValid = yield* modelService.validateModel("gpt-4o");
  if (!modelValid) {
    return yield* Effect.fail(new Error("Invalid model"));
  }
  
  // Check policy
  const policyResult = yield* policyService.checkPolicy({
    auth: { userId: "user1" },
    requestedModel: "gpt-4o", 
    operationType: "text:generate"
  });
  
  if (!policyResult.allowed) {
    return yield* Effect.fail(new Error("Policy denied"));
  }
  
  // Create agent runtime
  const runtime = yield* agentRuntime.create("my-agent", { 
    userId: "user1",
    model: "gpt-4o",
    conversationHistory: []
  });
  
  // Subscribe to activities
  const subscription = agentRuntime.subscribe("my-agent");
  yield* Stream.runForeach(subscription, (activity) =>
    Effect.log(`Activity: ${activity.type}`)
  ).pipe(Effect.fork);
  
  // Send command
  yield* agentRuntime.send("my-agent", {
    id: "cmd-1",
    agentRuntimeId: "my-agent",
    timestamp: Date.now(),
    type: AgentRecordType.COMMAND,
    payload: { 
      action: "generate_text",
      prompt: "Hello world"
    },
    metadata: {},
    sequence: 1
  });
  
  // Get final state
  const finalState = yield* agentRuntime.getState("my-agent");
  yield* Effect.log(`Final status: ${finalState.status}`);
  
  // Cleanup
  yield* agentRuntime.terminate("my-agent");
});

// Run with proper dependencies
const program = Effect.provide(
  completeExample,
  Layer.mergeAll(
    ConfigurationService.Default,
    ModelService.Default,
    ProviderService.Default,
    PolicyService.Default,
    AgentRuntimeService.Default,
    NodeFileSystem.layer
  )
);
```

## Service Configuration

The AgentRuntimeService automatically loads configurations for all dependent services:

- **ModelService**: Loads from `master-config.agents.modelsConfigPath`
- **ProviderService**: Loads from `master-config.agents.providersConfigPath`  
- **PolicyService**: Loads from `master-config.agents.policiesConfigPath`

This provides a single entry point for accessing all configured AI services while maintaining clean separation of concerns. 