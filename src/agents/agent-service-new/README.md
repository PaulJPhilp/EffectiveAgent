# Agent Graph with Dependency Injection

This module provides an implementation of agent execution graphs with dependency injection support for TypeScript applications.

## Overview

The agent service allows you to create and execute graphs of agent nodes. Each node in the graph represents an agent that performs a specific task, and the graph defines the execution flow between nodes.

The implementation follows these design principles:

1.  **Dependency Injection:** The graph execution engine can be swapped out (e.g., default runner, LangGraph) without changing the client code interacting with the graph interface.
2.  **Factory Pattern:** Factories are used to create specific graph implementations, promoting loose coupling.
3.  **Interface-based Design:** All implementations adhere to common interfaces (`AgentGraphImplementation`, `AgentGraphFactory`), ensuring consistency.

## Available Implementations

### Default Implementation

The default implementation (`AgentGraph`) provides a straightforward execution flow.

*   **Execution:** Nodes are typically executed sequentially based on the predefined `next` edges in the graph definition. It's well-suited for linear workflows or simple fan-out scenarios.
*   **Conditional Logic:** Complex conditional branching based on node output typically needs to be handled within the logic of the agent node itself or by designing the graph structure accordingly. The runner primarily follows the static `next` array.

### LangGraph Implementation

The LangGraph implementation (`LangGraphAgentGraph`) leverages the powerful [LangGraph](https://github.com/langchain-ai/langgraphjs) library.

*   **Execution:** Executes nodes and manages state using LangGraph's primitives.
*   **State Management:** Provides robust state management capabilities inherent to LangGraph.
*   **Conditional Logic:** Natively supports conditional edges, allowing the graph to dynamically route execution based on the current state after a node runs. This is ideal for complex, stateful workflows with branching logic.
*   **Cycles:** Supports cycles in the graph, enabling iterative processes.
*   **Debugging:** Can potentially integrate with LangSmith for enhanced tracing and visualization (see Advanced Considerations).

## Usage

### Creating a Graph

```typescript
import { createAgentGraph } from './AgentGraph.js';
// Or for LangGraph implementation:
// import { createLangGraphAgentGraph } from './LangGraphAgentGraph.js';

// Assume YourAgentNode and AnotherAgentNode implement a common interface
// and are instantiated with necessary services (taskService, etc.)
const node1 = new YourAgentNode(/* ...services */);
const node2 = new AnotherAgentNode(/* ...services */);

// Define graph structure
// The keys ('node1', 'node2') are node identifiers.
// 'next' specifies the identifiers of the subsequent node(s). 'END' signifies termination.
const graphDefinition = {
  node1: {
    node: node1, // The actual agent node instance
    next: ['node2'],
  },
  node2: {
    node: node2,
    next: ['END'],
  },
};

// Create the graph using the default implementation
const agentGraph = createAgentGraph(
  graphDefinition,
  'node1', // Start node identifier
  taskService,
  providerService,
  modelService,
  promptService,
);

// --- OR ---

// Create the graph using the LangGraph implementation
const langGraphAgentGraph = createLangGraphAgentGraph(
  graphDefinition,
  'node1', // Start node identifier
  taskService,
  providerService,
  modelService,
  promptService,
);


// Define the initial state for the graph execution
const initialState = {
  config: {
    // Configuration specific to this run
  },
  agentRun: {
    runId: 'run-123',
    startTime: new Date().toISOString(),
    outputDir: '/path/to/output',
    inputDir: '/path/to/input',
    description: 'Running agent graph example',
    completedSteps: [], // Track completed node identifiers
  },
  status: 'running', // Initial status
  logs: { logs: [], logCount: 0 }, // For capturing execution logs
  errors: { errors: [], errorCount: 0 }, // For capturing errors
  input: {
    /* Initial input data for the graph */
  },
  output: {
    /* Field to store the final output */
  },
  agentState: {
    /* Arbitrary state shared across agent nodes */
    /* Careful state management and typing are needed here */
  },
};

// Get the runnable function from the graph instance
const runnable = agentGraph.runnable(); // Or langGraphAgentGraph.runnable()

// Execute the graph with the initial state
// The result will be the final state after execution completes or halts.
const finalState = await runnable(initialState);

console.log('Graph execution finished with status:', finalState.status);
console.log('Final output:', finalState.output);


import {
  AgentGraphFactory,
  AgentGraphImplementation,
  createAgentGraph,
  AgentGraphDefinition,
  AgentNode,
  // ... other necessary types
} from './AgentGraph.js'; // Assuming types are exported

// 1. Define your custom graph implementation
class CustomAgentGraph<T extends object>
  implements AgentGraphImplementation<T>
{
  // ... implementation details ...

  constructor(/* ...dependencies... */) {
    // ... constructor logic ...
  }

  runnable(): (state: T) => Promise<T> {
    return async (state: T): Promise<T> => {
      console.log('Running custom graph logic...');
      // Your custom execution logic here
      // Modify state based on graphDefinition, startNode, etc.
      return { ...state, status: 'completed', output: { message: 'Custom run complete' } };
    };
  }

  setDebug(debug: boolean): void {
    console.log(`Custom debugger set to: ${debug}`);
    // Implement debug logic if needed
  }
}

// 2. Create a custom factory
class CustomAgentGraphFactory implements AgentGraphFactory {
  createAgentGraph<T extends object>(
    graphDefinition: AgentGraphDefinition<AgentNode>,
    startNode: string,
    // Pass necessary services/dependencies
    taskService: any,
    providerService: any,
    modelService: any,
    promptService: any,
  ): AgentGraphImplementation<T> {
    // Instantiate and return your custom implementation
    // You might need to pass dependencies to your CustomAgentGraph constructor
    return new CustomAgentGraph<T>(/* ...dependencies... */);
  }
}

// 3. Use the custom factory
const customFactory = new CustomAgentGraphFactory();
const agentGraph = createAgentGraph(
  graphDefinition, // Your graph structure
  'node1', // Your start node
  taskService,
  providerService,
  modelService,
  promptService,
  customFactory, // Pass your custom factory instance
);

// Execute using the custom implementation
const result = await agentGraph.runnable()(initialState);
console.log(result);

Testing
Dependency injection makes testing straightforward. You can provide a mock factory that returns a mock implementation during tests.

import { AgentGraphFactory, AgentGraphImplementation } from './AgentGraph.js';

// Create a mock factory for testing purposes
const mockFactory: AgentGraphFactory = {
  createAgentGraph: <T extends object>(): AgentGraphImplementation<T> => ({
    runnable: () => async (state: T) => {
      // Mock execution logic for tests
      console.log('Mock graph execution');
      // Simulate successful completion or specific test scenarios
      return { ...state, status: 'completed', output: { mockData: 'test' } };
    },
    setDebug: (debug: boolean) => {
      console.log(`Mock debugger set to: ${debug}`);
    },
  }),
};

// Use the mock factory in your test setup
const agentGraphForTest = createAgentGraph(
  graphDefinition, // A test graph definition
  'node1',
  mockTaskService, // Mocked services
  mockProviderService,
  mockModelService,
  mockPromptService,
  mockFactory, // Inject the mock factory
);

// Now calls to agentGraphForTest.runnable() will use the mock implementation
// await agentGraphForTest.runnable()(testInitialState);
Advanced Considerations
State Management & Typing: The agentState field within the main state object is crucial for passing data between nodes. Ensuring type safety across node boundaries (where one node's output informs another's input via agentState) requires care. Consider using validation libraries like Zod within your agent nodes to parse and validate inputs from the agentState and to structure outputs, providing runtime safety and aiding static analysis.
Error Handling & Recovery: The current structure captures errors in the errors field of the state. The default execution might halt on the first unhandled error within a node. More sophisticated error handling (e.g., node-level retries, routing to specific error-handling nodes, graph-level recovery strategies) would typically need to be implemented either within the agent nodes themselves or by extending the chosen AgentGraphImplementation. LangGraph offers some mechanisms for state-based error handling.
Debugging & Visualization:
The setDebug(boolean) method on the AgentGraphImplementation interface is intended to enable more verbose logging or debugging features within the specific implementation.
The LangGraphAgentGraph implementation has the potential to integrate with LangSmith for detailed tracing and visualization of graph executions, which is highly beneficial for complex graphs.
Debugging the AgentGraph (default) implementation might rely more heavily on console logging or integrating with standard debugging tools.

Extensions
To create a new graph execution implementation (e.g., using a different underlying library):

Create a class that implements the AgentGraphImplementation<T> interface.
Implement the runnable(): (state: T) => Promise<T> method containing your execution logic.
Implement the setDebug(debug: boolean): void method.
Create a factory class that implements the AgentGraphFactory interface. Its createAgentGraph method should instantiate and return your new implementation.
Create a helper function (similar to createAgentGraph or createLangGraphAgentGraph) that simplifies the instantiation process for users, potentially accepting the necessary dependencies and the custom factory.