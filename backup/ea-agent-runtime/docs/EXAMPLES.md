# Agent Runtime Service Examples

## Basic Usage Examples

### 1. Simple Counter Agent
```typescript
import { Effect, pipe } from "effect"
import { AgentRuntimeService } from "../service"
import { AgentActivityType } from "../types"

interface CounterState {
  count: number
  lastUpdated: number
}

const program = Effect.gen(function* () {
  // Create a new runtime with initial state
  const runtime = yield* AgentRuntimeService.create<CounterState>("counter-1", {
    count: 0,
    lastUpdated: Date.now()
  })

  // Increment counter
  yield* runtime.send({
    id: "increment-1",
    type: AgentActivityType.STATE_CHANGE,
    payload: { count: 1, lastUpdated: Date.now() }
  })

  // Get current state
  const state = yield* runtime.getState()
  console.log(`Counter value: ${state.state.count}`)

  // Cleanup
  yield* AgentRuntimeService.terminate(runtime.id)
})
```

### 2. Task Manager Agent
```typescript
interface Task {
  id: string
  title: string
  completed: boolean
}

interface TaskManagerState {
  tasks: Task[]
  stats: {
    total: number
    completed: number
  }
}

const taskManager = Effect.gen(function* () {
  // Initialize task manager
  const runtime = yield* AgentRuntimeService.create<TaskManagerState>("tasks-1", {
    tasks: [],
    stats: { total: 0, completed: 0 }
  })

  // Add a new task
  yield* runtime.send({
    id: "add-task-1",
    type: AgentActivityType.STATE_CHANGE,
    payload: {
      tasks: [{ id: "1", title: "New Task", completed: false }],
      stats: { total: 1, completed: 0 }
    }
  })

  // Mark task as completed
  const currentState = yield* runtime.getState()
  yield* runtime.send({
    id: "complete-task-1",
    type: AgentActivityType.STATE_CHANGE,
    payload: {
      tasks: currentState.state.tasks.map(task =>
        task.id === "1" ? { ...task, completed: true } : task
      ),
      stats: { total: 1, completed: 1 }
    }
  })
})
```

## Advanced Usage Examples

### 1. Priority-based Processing
```typescript
const priorityExample = Effect.gen(function* () {
  const runtime = yield* AgentRuntimeService.create("priority-1", { value: 0 })

  // Send low priority activity
  yield* runtime.send({
    id: "low-priority",
    type: AgentActivityType.STATE_CHANGE,
    priority: 0,
    payload: { value: 1 }
  })

  // Send high priority activity
  yield* runtime.send({
    id: "high-priority",
    type: AgentActivityType.STATE_CHANGE,
    priority: 1,
    payload: { value: 2 }
  })
})
```

### 2. Event Subscription with Processing
```typescript
const subscriptionExample = Effect.gen(function* () {
  const runtime = yield* AgentRuntimeService.create("subscriber-1", { events: [] })

  // Set up subscription
  const subscription = yield* pipe(
    AgentRuntimeService.subscribe(runtime.id),
    Stream.tap(activity =>
      Effect.log(`Received activity: ${activity.id}`)
    ),
    Stream.filter(activity => activity.type === AgentActivityType.STATE_CHANGE),
    Stream.runForEach(activity =>
      Effect.log(`Processing state change: ${JSON.stringify(activity.payload)}`)
    )
  )

  // Send some activities
  yield* runtime.send({
    id: "event-1",
    type: AgentActivityType.STATE_CHANGE,
    payload: { events: ["Event 1"] }
  })
})
```

### 3. Error Handling
```typescript
const errorHandlingExample = Effect.gen(function* () {
  const runtime = yield* AgentRuntimeService.create("error-1", { status: "ok" })

  // Handle potential errors
  yield* pipe(
    runtime.send({
      id: "invalid-activity",
      type: AgentActivityType.COMMAND, // Commands not implemented
      payload: {}
    }),
    Effect.catchTag("AgentRuntimeProcessingError", error =>
      Effect.log(`Error processing activity: ${error.message}`)
    )
  )

  // Check error state
  const state = yield* runtime.getState()
  if (state.status === "ERROR") {
    console.error("Runtime in error state:", state.error)
  }
})
```

### 4. Composite State Management
```typescript
interface CompositeState {
  data: {
    values: number[]
    metadata: Record<string, unknown>
  }
  config: {
    maxSize: number
    allowDuplicates: boolean
  }
}

const compositeExample = Effect.gen(function* () {
  // Initialize with composite state
  const runtime = yield* AgentRuntimeService.create<CompositeState>("composite-1", {
    data: {
      values: [],
      metadata: {}
    },
    config: {
      maxSize: 10,
      allowDuplicates: false
    }
  })

  // Update partial state
  yield* runtime.send({
    id: "update-config",
    type: AgentActivityType.STATE_CHANGE,
    payload: {
      config: {
        maxSize: 20,
        allowDuplicates: true
      }
    }
  })

  // Add data with metadata
  yield* runtime.send({
    id: "add-data",
    type: AgentActivityType.STATE_CHANGE,
    payload: {
      data: {
        values: [1, 2, 3],
        metadata: {
          timestamp: Date.now(),
          source: "user"
        }
      }
    }
  })
})
```

### 5. Multiple Runtime Coordination
```typescript
const coordinationExample = Effect.gen(function* () {
  // Create producer runtime
  const producer = yield* AgentRuntimeService.create("producer-1", {
    items: [] as string[]
  })

  // Create consumer runtime
  const consumer = yield* AgentRuntimeService.create("consumer-1", {
    processed: [] as string[]
  })

  // Set up producer-consumer pipeline
  yield* pipe(
    AgentRuntimeService.subscribe(producer.id),
    Stream.filter(activity => activity.type === AgentActivityType.STATE_CHANGE),
    Stream.tap(activity =>
      consumer.send({
        id: `consume-${activity.id}`,
        type: AgentActivityType.STATE_CHANGE,
        payload: {
          processed: [...(activity.payload as any).items]
        }
      })
    ),
    Stream.runForEach(() => Effect.unit)
  )

  // Produce items
  yield* producer.send({
    id: "produce-1",
    type: AgentActivityType.STATE_CHANGE,
    payload: {
      items: ["item1", "item2"]
    }
  })
})
```

## Running the Examples

To run these examples:

1. Import dependencies:
```typescript
import { Effect, Stream, pipe } from "effect"
import { AgentRuntimeService } from "./agent-runtime"
import { AgentActivityType } from "./types"
```

2. Execute a program:
```typescript
Effect.runPromise(program)
  .then(() => console.log("Program completed"))
  .catch(error => console.error("Program failed:", error))
```

3. For subscription examples, ensure proper cleanup:
```typescript
Effect.runPromise(
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(subscriptionExample)
    yield* Effect.sleep("5 seconds")
    yield* Effect.interrupt(fiber)
  })
)
``` 