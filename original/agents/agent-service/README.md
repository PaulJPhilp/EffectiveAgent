# Agent Graph with Dependency Injection

This module provides an implementation of agent execution graphs with dependency injection support.

## Overview

The agent service allows you to create and execute graphs of agent nodes. Each node in the graph represents an agent that performs a specific task, and the graph defines the execution flow between nodes.

The implementation follows these design principles:

1. **Dependency Injection** - The graph implementation can be swapped out without changing the client code
2. **Factory Pattern** - Factories are used to create graph implementations
3. **Interface-based Design** - All implementations adhere to common interfaces

## Available Implementations

### Default Implementation

The default implementation (`AgentGraph`) provides a simple execution flow where nodes are executed sequentially based on the graph definition.

### LangGraph Implementation

The LangGraph implementation (`LangGraphAgentGraph`) leverages the LangGraph library to execute nodes and manage state.

## Usage

### Creating a Graph

```typescript
import { createAgentGraph } from './AgentGraph.js'
// Or for LangGraph implementation:
// import { createLangGraphAgentGraph } from './LangGraphAgentGraph.js' 

// Create nodes
const node1 = new YourAgentNode(taskService, providerService, modelService, promptService)
const node2 = new AnotherAgentNode(taskService, providerService, modelService, promptService)

// Define graph structure
const graph = {
  'node1': {
    node: node1,
    next: ['node2']
  },
  'node2': {
    node: node2,
    next: ['END']
  }
}

// Create the graph
const agentGraph = createAgentGraph(
  graph,
  'node1', // Start node
  taskService,
  providerService,
  modelService,
  promptService
)

// For LangGraph implementation
const langGraphAgentGraph = createLangGraphAgentGraph(
  graph,
  'node1',
  taskService,
  providerService,
  modelService,
  promptService
)
```

### Executing a Graph

```typescript
// Define initial state
const initialState = {
  config: {},
  agentRun: {
    runId: 'run-123',
    startTime: new Date().toISOString(),
    outputDir: '/path/to/output',
    inputDir: '/path/to/input',
    description: 'Running agent graph',
    completedSteps: []
  },
  status: 'running',
  logs: { logs: [], logCount: 0 },
  errors: { errors: [], errorCount: 0 },
  input: { /* your input */ },
  output: {},
  agentState: {}
}

// Execute the graph
const result = await agentGraph.runnable()(initialState)
```

### Using Custom Implementation with Dependency Injection

You can create a custom implementation and inject it using the factory pattern:

```typescript
import { AgentGraphFactory, createAgentGraph } from './AgentGraph.js'

// Create custom factory
class CustomAgentGraphFactory implements AgentGraphFactory {
  createAgentGraph(...) {
    // Return your custom implementation
    return new CustomAgentGraph(...)
  }
}

// Use custom factory
const customFactory = new CustomAgentGraphFactory()
const agentGraph = createAgentGraph(
  graph,
  'startNode',
  taskService,
  providerService, 
  modelService,
  promptService,
  customFactory // Pass your custom factory
)
```

## Testing

For testing, you can create mock implementations of the AgentGraph interface:

```typescript
// Create a mock factory
const mockFactory = {
  createAgentGraph: () => ({
    runnable: () => async (state) => {
      // Mock implementation
      return { ...state, status: 'completed' }
    },
    setDebug: () => {}
  })
}

// Use mock factory in tests
const agentGraph = createAgentGraph(
  graph,
  'startNode',
  taskService,
  providerService,
  modelService,
  promptService,
  mockFactory
)
```

## Extensions

To create a new implementation:

1. Create a class that implements `AgentGraphImplementation<T>`
2. Create a factory that implements `AgentGraphFactory`
3. Create a helper function to instantiate your implementation 