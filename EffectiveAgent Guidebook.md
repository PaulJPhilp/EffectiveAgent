Okay, Paul. Here is the entire Guidebook draft consolidated into a single Markdown block.

```markdown
# The EffectiveAgent Guidebook (Draft v0.1)

## Introduction

Welcome to the EffectiveAgent Guidebook! This guide demonstrates how to build and run AI agents using the EffectiveAgent framework. We aim to provide a powerful and flexible environment for agent development, leveraging Effect-TS for robustness and developer experience.

A core concept in EffectiveAgent is the **Pipeline**: a reusable component that encapsulates the logic for a specific high-level task (like getting weather, summarizing text, etc.). Pipelines abstract away the complexities of model selection, tool usage, and output formatting.

Another key component is the **EffectiveAgent Runtime**, which provides a high-level API for executing agents and pipelines, hiding the underlying Effect-TS execution details and dependency management for common use cases.

This guide uses a **Simple Weather Agent** as a running example to illustrate different approaches:

1.  **Stage 1: Raw LangGraph:** Building the agent using standard LangGraph and TypeScript primitives as a baseline.
2.  **Stage 2: EA Pipelines:** Rebuilding the agent to use a dedicated `WeatherPipeline`, showcasing abstraction and reusability.
3.  **Stage 3: EA Runtime (Simple):** Running the pipeline-based agent with the simplest high-level runtime API.
4.  **Stage 4: EA Runtime (Controlled):** Running the pipeline-based agent with more options and richer output via the runtime API.

We will also touch upon the concept of **Agentic Systems**, where multiple specialized agents (often built using reusable Pipelines and hosted by Effectors) collaborate to achieve complex goals.

## Prerequisites

*   Node.js (Version recommended by Effect-TS)
*   An understanding of TypeScript.
*   Familiarity with basic LangChain/LangGraph concepts is helpful but not strictly required for using high-level EA abstractions.
*   Installation of necessary packages: `effect`, `@effect/schema`, `langchain`, `@langchain/core`, `@langchain/openai` (or other model provider), `langgraph`, `ulid`, and the hypothetical `@effectiveagent/*` packages.
*   API keys (e.g., OpenAI) configured appropriately for the chosen LLM providers.

## Example: Simple Weather Agent

Our goal is to create an agent that takes a location name and returns the current weather.

### Stage 1: Raw LangGraph Implementation

This stage shows how to build the agent using standard LangGraph and basic TypeScript, without high-level EffectiveAgent Pipelines.

**Goal:** Establish a baseline using familiar tools.

**Step 1.1: Define the Tool (Plain TypeScript)**

We need a function to get the weather. We'll use a simple async mock function and wrap it in a standard LangChain `Tool`.

```typescript
// src/tools/weather-tool.raw.ts

import { Tool } from "@langchain/core/tools";

// Simple interface (optional, for clarity)
interface WeatherToolImpl {
  getCurrentWeather: (location: string) => Promise<{ temperature: number; condition: string }>;
}

// Mock Data
const mockWeatherData: Record<string, { temperature: number; condition: string }> = {
  london: { temperature: 15, condition: "Cloudy" },
  paris: { temperature: 18, condition: "Sunny" },
  tokyo: { temperature: 22, condition: "Rainy" },
};

// Simple async function simulating the tool call
const getCurrentWeatherMock: WeatherToolImpl["getCurrentWeather"] = async (location) => {
  console.log(`MockWeatherTool (Raw): Getting weather for ${location}`);
  await new Promise(resolve => setTimeout(resolve, 150)); // Simulate delay
  const key = location.toLowerCase();
  if (mockWeatherData[key]) {
    return mockWeatherData[key];
  } else {
    throw new Error(`Location not found in mock data: ${location}`);
  }
};

// Standard LangChain Tool Wrapper
export class WeatherLangChainTool extends Tool {
  name = "get_current_weather";
  description = "Gets the current weather for a specified location. Input should be the location name (e.g., London).";

  async _call(input: string): Promise<string> {
    try {
      const result = await getCurrentWeatherMock(input);
      return JSON.stringify(result); // Tools return strings
    } catch (error: any) {
      console.error("Weather Tool Error:", error);
      return `Error: ${error.message || "Failed to get weather"}`;
    }
  }
}

export const weatherToolInstance = new WeatherLangChainTool();
```

**Step 1.2: Define LangGraph State & Nodes**

We use LangGraph's `StateGraph` and `MessagesState`.

```typescript
// src/agents/weather-agent/raw-graph.ts

import { BaseMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { StateGraph, END, MessagesState } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { ToolExecutor } from "@langchain/langgraph/prebuilt";
import { weatherToolInstance } from "../../tools/weather-tool.raw";

// --- Configuration ---
const llm = new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 });
const toolExecutor = new ToolExecutor({ tools: [weatherToolInstance] });

// --- Nodes ---
const callModel = async (state: MessagesState, config?: RunnableConfig): Promise<Partial<MessagesState>> => {
    console.log("--- Calling Model ---");
    const { messages } = state;
    const llmWithTools = llm.bindTools([weatherToolInstance]);
    const response: AIMessage = await llmWithTools.invoke(messages, config);
    console.log("Model Response:", response);
    return { messages: [response] };
};

const callTool = async (state: MessagesState): Promise<Partial<MessagesState>> => {
    console.log("--- Calling Tool ---");
    const { messages } = state;
    const lastMessage = messages[messages.length - 1] as AIMessage;
    if (!lastMessage?.tool_calls || lastMessage.tool_calls.length === 0) {
        throw new Error("Router decided to call tool, but no tool calls found.");
    }
    const toolInvocations = lastMessage.tool_calls.map((toolCall) => ({
        tool: toolCall.name,
        toolInput: toolCall.args,
        toolCallId: toolCall.id,
    }));
    const toolExecutorResult = await toolExecutor.batch(toolInvocations);
    const toolMessages: ToolMessage[] = toolExecutorResult.map(toolResult => new ToolMessage({
        content: toolResult.output,
        tool_call_id: toolResult.toolCallId!,
    }));
    console.log("Tool Results:", toolMessages);
    return { messages: toolMessages };
};

// --- Conditional Edge Logic ---
const shouldContinue = (state: MessagesState): "continue" | "end" => {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    return lastMessage?.tool_calls?.length ? "continue" : "end";
};

// --- Graph Definition ---
const workflow = new StateGraph({ channels: MessagesState });
workflow.addNode("agent", callModel);
workflow.addNode("action", callTool);
workflow.setEntryPoint("agent");
workflow.addConditionalEdges("agent", shouldContinue, { continue: "action", end: END });
workflow.addEdge("action", "agent");
export const rawWeatherAgentGraph = workflow.compile();

```

**Step 1.3: Compile & Run (Conceptual)**

At this point, the developer would typically run the graph using LangGraph's `invoke` or `stream` methods directly:

```typescript
// Example (Conceptual - Not using EA Runtime yet)
// import { HumanMessage } from "@langchain/core/messages";
// async function runRaw() {
//   const inputs = { messages: [new HumanMessage("What is the weather like in London?")] };
//   const finalState = await rawWeatherAgentGraph.invoke(inputs);
//   console.log(finalState.messages[finalState.messages.length - 1]?.content);
// }
// runRaw();
```

*Observation:* This requires manual setup of the LLM, tools, and graph structure. Error handling and state management are tied to LangGraph's mechanisms.

### Stage 2: Using an EffectiveAgent Pipeline

Now, let's encapsulate the weather-fetching logic into a reusable EA Pipeline service.

**Goal:** Simplify the agent logic by abstracting the weather task.

**Step 2.1: Define the Pipeline Contract**

```typescript
// src/ea/pipelines/weather/weather.contract.ts

import { Effect } from "effect";
import { PipelineError } from "../pipelines.errors"; // Assume a base PipelineError exists

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  unit: "celsius";
  forecast?: string;
}

export interface GetWeatherInput {
  location: string;
  query?: string;
  userId?: string;
}

export interface WeatherPipelineApi {
  readonly getWeather: (input: GetWeatherInput) => Effect.Effect<WeatherData, PipelineError>;
}

// Use GenericTag for the interface identifier
export const WeatherPipeline = Effect.GenericTag<WeatherPipelineApi>("WeatherPipeline");
```

**Step 2.2: Implement the Pipeline Service**

This service uses lower-level EA services (like `EaLlmProvider`, `WeatherTool`) and implements the contract. It adheres to the standard `Effect.Service` class pattern.

```typescript
// src/ea/pipelines/weather/weather.service.ts

import { Effect, Layer, pipe } from "effect";
import type { WeatherPipelineApi, WeatherData, GetWeatherInput } from "./weather.contract";
import { WeatherPipeline } from "./weather.contract";
import { PipelineError } from "../pipelines.errors";
import { EaLlmProvider } from "@/ea/llm-provider"; // Framework LLM Service Tag
import { WeatherTool, WeatherToolApi } from "@/tools/weather-tool"; // Framework Tool Service Tag (Effect version)

// Define the Environment needed by this pipeline's implementation
type WeatherPipelineEnv = EaLlmProvider | WeatherToolApi;

// Define the Service Class adhering to the standard pattern
export class WeatherPipelineService extends Effect.Service<WeatherPipelineApi>()(
  WeatherPipeline, // Use the Tag as the identifier for the service instance
  {
    // Effect factory for the service implementation
    effect: Effect.gen(function* (_) {
      // Get the dependencies needed by the pipeline logic
      const llmProvider = yield* _(EaLlmProvider);
      const weatherTool = yield* _(WeatherTool);

      // Implement the getWeather method
      const getWeather = (input: GetWeatherInput): Effect.Effect<WeatherData, PipelineError> =>
        Effect.gen(function* (_) {
          yield* _(Effect.logInfo(`WeatherPipeline: Processing request for ${input.location}`));

          // Call the Weather Tool service
          const toolResult = yield* _(
            weatherTool.getCurrentWeather(input.location),
            Effect.mapError((toolError) => new PipelineError({ message: `Weather tool failed for ${input.location}`, cause: toolError, pipelineName: "WeatherPipeline" })),
          );

          // Optional: Call LLM service for summary
          const summaryPrompt = `Summarize: temp=${toolResult.temperature}C, condition=${toolResult.condition}`;
          const summaryResult = yield* _(
            llmProvider.invoke([{ role: "user", content: summaryPrompt }]),
            Effect.map((msg) => msg.content),
            Effect.mapError((llmError) => new PipelineError({ message: "LLM summary failed", cause: llmError, pipelineName: "WeatherPipeline" })),
            Effect.orElseSucceed(() => undefined),
          );

          // Construct final output
          const outputData: WeatherData = {
            location: input.location,
            temperature: toolResult.temperature,
            condition: toolResult.condition,
            unit: "celsius",
            forecast: summaryResult,
          };
          return outputData;
        }).pipe(
            Effect.tapErrorCause(cause => Effect.logError("WeatherPipeline failed", cause))
        );

      return { getWeather }; // Return implementation matching WeatherPipelineApi
    }),
    // Declare dependencies needed by the service factory
    dependencies: [EaLlmProvider, WeatherTool],
  },
) {}

// Define the Layer using the Service Class itself
// This Layer requires Layers for EaLlmProvider and WeatherTool
export const WeatherPipelineLayer = WeatherPipelineService;
```

**Step 2.3: Update Agent Definition (LangGraph)**

The LangGraph agent now becomes much simpler, just calling the pipeline service.

```typescript
// src/agents/weather-agent/pipeline-graph.ts

import { Effect } from "effect";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { StateGraph, END, MessagesState } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { WeatherPipeline, GetWeatherInput, WeatherData } from "@/ea/pipelines/weather/weather.contract";
import { PipelineError } from "@/ea/pipelines/pipelines.errors";

// Node that calls the Weather Pipeline
// Returns an Effect requiring WeatherPipeline
const callWeatherPipelineNode = (state: MessagesState, config?: RunnableConfig): Effect.Effect<Partial<MessagesState>, PipelineError, WeatherPipeline> => {
    console.log("--- Calling Weather Pipeline Node ---");
    const lastMessage = state.messages[state.messages.length - 1];
    const query = lastMessage.content as string;
    const pipelineInput: GetWeatherInput = { location: query, query: query };

    return Effect.gen(function* (_) {
        const weatherPipeline = yield* _(WeatherPipeline); // Get pipeline service from context
        const weatherData = yield* _(weatherPipeline.getWeather(pipelineInput));
        const responseContent = `The weather in ${weatherData.location} is ${weatherData.temperature}°C and ${weatherData.condition}. ${weatherData.forecast ?? ''}`;
        return { messages: [new AIMessage(responseContent)] };
    }).pipe(
        Effect.catchAll((error) => {
            console.error("Pipeline Error:", error);
            const errorMessage = error instanceof PipelineError ? error.message : "Sorry, I couldn't get the weather.";
            return Effect.succeed({ messages: [new AIMessage(errorMessage)] });
        })
    );
};

// --- Graph Definition ---
const pipelineWorkflow = new StateGraph({ channels: MessagesState });
// Add the single node. Assumes runtime integration handles Effect nodes.
pipelineWorkflow.addNode("getWeather", callWeatherPipeline as any);
pipelineWorkflow.setEntryPoint("getWeather");
pipelineWorkflow.addEdge("getWeather", END);
export const pipelineWeatherAgentGraph = pipelineWorkflow.compile();
```

*Observation:* The agent graph is drastically simplified. All weather-specific logic is now in the reusable `WeatherPipeline`. The challenge shifts to how the runtime executes graph nodes that return Effects and provides their dependencies.

### Stage 3: Using the EA Runtime (Simple)

This stage shows the ideal simple developer experience for running the pipeline-based agent.

**Goal:** Abstract away Effect execution and Layer management.

**Step 3.1: Configure the Runtime (Conceptual)**

This happens once during application setup.

```typescript
// src/app/runtime-setup.ts (Conceptual)
import { EffectiveAgentRuntime } from "@/ea/runtime";
// Import configured Layer providers for services used by pipelines/agents
import { EaOpenAiProviderLayer } from "@/ea/providers/openai.layer"; // Example
import { WeatherToolLayer } from "@/tools/weather-tool.layer"; // Example
import { WeatherPipelineLayer } from "@/ea/pipelines/weather/weather.service"; // Our pipeline layer
import { AgentStoreLayer } from "@/agent-store/agent-store.service"; // Persistence layer
import { AgentRunnerLayer } from "@/agent-runner/agent-runner.service"; // Generic runner layer

// Developer configures the runtime, providing necessary layers/config
export const runtime = EffectiveAgentRuntime.configure({
    // Configuration tells the runtime how to build its internal combined Layer
    layers: [
        EaOpenAiProviderLayer, // Example LLM provider layer
        WeatherToolLayer,      // Tool layer needed by WeatherPipeline
        WeatherPipelineLayer,  // Our pipeline layer
        AgentStoreLayer,       // Persistence for runner's internal logging
        AgentRunnerLayer       // The generic agent runner
    ]
    // Or pass config objects instead of layers:
    // llmProviderConfig: { type: 'openai', apiKey: '...' },
    // toolConfigs: [ { type: 'weather', ... } ],
    // agentStoreConfig: { type: 'dexie', dbName: '...' }
});
```

**Step 3.2: Run the Agent**

The developer uses the configured `runtime` object.

```typescript
// src/app/features/weather-feature.ts (Example Usage - Stage 3)

import { HumanMessage } from "@langchain/core/messages";
import { runtime } from "@/app/runtime-setup"; // Import configured runtime
import { pipelineWeatherAgentGraph } from "@/agents/weather-agent/pipeline-graph"; // Agent from Stage 2
import type { WeatherData } from "@/ea/pipelines/weather/weather.contract";

async function getWeatherTheSimpleWay(location: string): Promise<void> {
  console.log(`--- Stage 3: Running Weather Agent via Runtime for: ${location} ---`);
  const agentInput = { messages: [new HumanMessage(location)] };

  try {
    // Call high-level runtime method - Effect details hidden
    const result = await runtime.invokeAgent<WeatherData>(
      pipelineWeatherAgentGraph,
      agentInput,
    );

    // Use the result (structured WeatherData or error message string)
    if (typeof result === "string") {
        console.log("Agent Response (Pipeline Error):", result);
    } else if (result && typeof result === 'object' && 'temperature' in result) {
        console.log("Structured Weather Result:", result);
        console.log(`Location: ${result.location}`);
        console.log(`Temperature: ${result.temperature}°C`);
        console.log(`Condition: ${result.condition}`);
        if (result.forecast) {
            console.log(`Forecast: ${result.forecast}`);
        }
    } else {
         console.log("Agent Response (Unexpected Format):", result);
    }
  } catch (error) {
    console.error("Runtime invokeAgent failed:", error);
  }
}

// getWeatherTheSimpleWay("Paris");
```

*Observation:* The developer experience is now very clean. They configure the runtime once and then simply call `runtime.invokeAgent`.

### Stage 4: Using the EA Runtime (Controlled)

This stage shows using the same runtime but accessing more features.

**Goal:** Demonstrate progressive disclosure for more control and richer output.

**Step 4.1: Define Richer API (Conceptual)**

The runtime API supports `AgentRunOptions` and returns `AgentRunResult`.

```typescript
// src/ea/runtime/runtime.contract.ts (Conceptual Snippets)
export interface AgentRunOptions {
    configurable?: Record<string, any>; // e.g., { thread_id: "..." }
    includeUsage?: boolean;
    includeMetadata?: boolean;
    // ... other options
}
export interface AgentRunResult<Output = any> {
    output: Output;
    usage?: { /* ... */ };
    metadata?: { runId?: string; /* ... */ };
    history?: any[];
}
```

**Step 4.2: Run with Options & Richer Result**

```typescript
// src/app/features/weather-feature.ts (Example Usage - Stage 4 Invoke)
import type { AgentRunOptions, AgentRunResult } from "@/ea/runtime/runtime.contract";
// ... other imports same as Stage 3 ...

async function getWeatherWithControl(location: string): Promise<void> {
  console.log(`--- Stage 4: Running Weather Agent via Runtime (Controlled) for: ${location} ---`);
  const agentInput = { messages: [new HumanMessage(location)] };
  const runOptions: AgentRunOptions = {
    configurable: { thread_id: `weather-thread-${Date.now()}` },
    includeUsage: true,
    includeMetadata: true,
  };

  try {
    // Call runtime method with options
    const { output, usage, metadata } = await runtime.invokeAgent<WeatherData>({
        agent: pipelineWeatherAgentGraph,
        input: agentInput,
        options: runOptions
    });

    // Process richer result
    console.log("Agent Output (Structured):", output);
    // ... display weather ...
    if (usage) console.log("Usage Stats:", usage);
    if (metadata) console.log("Run Metadata:", metadata);

  } catch (error) {
    console.error("Runtime invokeAgent failed:", error);
  }
}

// getWeatherWithControl("Tokyo");
```

**Step 4.3: Streaming Example**

```typescript
// src/app/features/weather-feature.ts (Example Usage - Stage 4 Stream)
// ... other imports same as Stage 3 ...

async function streamWeatherWithControl(location: string): Promise<void> {
    console.log(`--- Stage 4: Streaming Weather Agent via Runtime for: ${location} ---`);
    const agentInput = { messages: [new HumanMessage(location)] };
    const runOptions: AgentRunOptions = {
        configurable: { thread_id: `weather-stream-${Date.now()}` },
    };

    try {
        // Use streamAgent method
        const stream = await runtime.streamAgent({
            agent: pipelineWeatherAgentGraph,
            input: agentInput,
            options: runOptions
        });

        console.log("Streaming Response:");
        for await (const chunk of stream) {
            // Process stream chunks (format depends on AgentRunner implementation)
            console.log("Stream Chunk:", chunk);
            process.stdout.write(".");
        }
        console.log("\nStream finished.");

    } catch (error) {
        console.error("Runtime streamAgent failed:", error);
    }
}

// streamWeatherWithControl("London");
```

*Observation:* The same runtime object provides more advanced capabilities through options and dedicated streaming methods, without exposing Effect internals.

## Conclusion (Draft)

This guidebook demonstrated the progression from building an agent with raw LangGraph to leveraging EffectiveAgent Pipelines and the high-level Runtime API.

*   **Pipelines** encapsulate complex logic into reusable, task-focused services, simplifying agent definitions.
*   The **Runtime** provides a simple, high-level API (`invokeAgent`, `streamAgent`) for executing agents, hiding Effect-TS complexity and managing dependencies based on initial configuration.
*   This allows developers to choose the right level of abstraction – use the simple runtime API for common cases, or potentially interact with lower-level services and Effect primitives when maximum control is needed (though the goal is to minimize the latter).

The next step in the Guidebook would be to repeat this process for the more complex ReAct agent example.

Okay, Paul. Yes, I can generate the second example for the Guidebook, the **Realistic ReAct Agent**, following the same four-stage structure we used for the Weather Agent. I'll focus on demonstrating the core ReAct loop (Thought -> Action -> Observation) and how Pipelines and the Runtime simplify its implementation.

Here is the ReAct Agent example integrated into the Guidebook draft:

```markdown
# The EffectiveAgent Guidebook (Draft v0.2)

## Introduction

*(Same as previous version)*

## Prerequisites

*(Same as previous version)*

## Example 1: Simple Weather Agent

*(Content from previous version - Stages 1-4 for Weather Agent)*

---

## Example 2: Realistic ReAct Agent

This example demonstrates building a more complex agent that follows the ReAct (Reasoning + Acting) pattern. The agent needs to answer questions that might require looking up information (using a mock search tool) or performing calculations (using a mock calculator tool).

### Stage 1: Raw LangGraph Implementation

Building the ReAct loop using standard LangGraph components and plain TypeScript tools.

**Goal:** Show the manual implementation of the Thought -> Action -> Observation loop.

**Step 1.1: Define Tools (Plain TypeScript)**

We need a search tool and a calculator tool.

```typescript
// src/tools/react-tools.raw.ts

import { Tool } from "@langchain/core/tools";

// --- Search Tool ---
interface SearchToolImpl {
  search: (query: string) => Promise<string>; // Returns text snippet
}
const searchMock: SearchToolImpl["search"] = async (query) => {
  console.log(`MockSearchTool (Raw): Searching for "${query}"`);
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
  if (query.toLowerCase().includes("capital of france")) {
    return "The capital of France is Paris.";
  }
  if (query.toLowerCase().includes("elvis presley")) {
      return "Elvis Presley was born in Tupelo, Mississippi. His estimated age if alive today would depend on the current date.";
  }
  return `No search results found for "${query}".`;
};
export class SearchLangChainTool extends Tool {
  name = "search";
  description = "Searches for information online. Input should be the search query.";
  async _call(input: string): Promise<string> {
    try {
      return await searchMock(input);
    } catch (error: any) {
      return `Error: ${error.message || "Search failed"}`;
    }
  }
}
export const searchToolInstance = new SearchLangChainTool();


// --- Calculator Tool ---
interface CalculatorToolImpl {
  calculate: (expression: string) => Promise<string>; // Returns calculation result as string
}
const calculateMock: CalculatorToolImpl["calculate"] = async (expression) => {
  console.log(`MockCalculatorTool (Raw): Calculating "${expression}"`);
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
  try {
    // VERY basic calculator for demonstration
    if (expression.includes('+')) {
        const parts = expression.split('+');
        const result = parts.map(p => parseFloat(p.trim())).reduce((a, b) => a + b, 0);
        if (isNaN(result)) throw new Error("Invalid calculation input");
        return result.toString();
    }
     if (expression.includes('*')) {
        const parts = expression.split('*');
        const result = parts.map(p => parseFloat(p.trim())).reduce((a, b) => a * b, 1);
         if (isNaN(result)) throw new Error("Invalid calculation input");
        return result.toString();
    }
    throw new Error("Unsupported operation");
  } catch (error: any) {
    return `Error: ${error.message || "Calculation failed"}`;
  }
};
export class CalculatorLangChainTool extends Tool {
  name = "calculator";
  description = "Calculates mathematical expressions. Input should be a simple expression like '1 + 2' or '3 * 4'.";
  async _call(input: string): Promise<string> {
    return calculateMock(input); // Error handling is inside mock
  }
}
export const calculatorToolInstance = new CalculatorLangChainTool();

// --- All Tools ---
export const rawReactTools = [searchToolInstance, calculatorToolInstance];
```

**Step 1.2: Define LangGraph State & Nodes**

We need a state to hold intermediate steps and the final answer.

```typescript
// src/agents/react-agent/raw-graph.ts

import { BaseMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { StateGraph, END } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { ToolExecutor } from "@langchain/langgraph/prebuilt";
import { rawReactTools } from "../../tools/react-tools.raw";
import type { AgentAction, AgentFinish } from "@langchain/core/agents"; // For typing intermediate steps

// --- Agent State ---
// Extend MessagesState to hold intermediate steps and final outcome
interface ReActAgentState extends MessagesState {
  intermediateSteps: Array<[AgentAction, string]>; // Tuples of (Action, Observation)
  finalOutput?: AgentFinish; // LangChain's structure for final answer/stop
}

// --- Configuration ---
const llm = new ChatOpenAI({ modelName: "gpt-4-turbo", temperature: 0 }); // Use a capable model for ReAct
const toolExecutor = new ToolExecutor({ tools: rawReactTools });

// --- Nodes ---

// 1. Agent Node: Decides next action or finishes
const callReActAgent = async (state: ReActAgentState, config?: RunnableConfig): Promise<Partial<ReActAgentState>> => {
    console.log("--- Calling ReAct Agent Node ---");
    const { messages, intermediateSteps } = state;
    // A more complex ReAct prompt/agent setup would typically be used here.
    // For simplicity, we simulate the LLM deciding based on history.
    // This requires a prompt that encourages Thought -> Action -> Observation.
    // We'll use a basic LLM call and assume it follows the pattern.

    // Bind tools for the LLM
    const llmWithTools = llm.bindTools(rawReactTools);
    const response: AIMessage = await llmWithTools.invoke(messages, config);
    console.log("ReAct LLM Response:", response);

    // Check if the response signals the end or requests a tool call
    if (!response.tool_calls || response.tool_calls.length === 0) {
        // Finish: Parse final answer from response content
        const finalOutput: AgentFinish = { returnValues: { output: response.content }, log: response.content };
        return { messages: [response], finalOutput: finalOutput };
    } else {
        // Action: Prepare actions from tool calls
        const actions: AgentAction[] = response.tool_calls.map(tc => ({
            tool: tc.name,
            toolInput: tc.args,
            log: `Invoking tool ${tc.name} with input ${JSON.stringify(tc.args)}`, // Thought/Action Log
            toolCallId: tc.id,
        }));
        // Return the AI message and the parsed actions
        return { messages: [response], intermediateSteps: actions.map(a => [a, '']) }; // Store actions, observation is pending
    }
};

// 2. Tool Node: Executes tools
const runTools = async (state: ReActAgentState): Promise<Partial<ReActAgentState>> => {
    console.log("--- Running Tools ---");
    // Get the most recent actions added in the previous step
    const actions = state.intermediateSteps.slice(-1).map(step => step[0]); // Get only the last set of actions
    if (!actions || actions.length === 0) {
        throw new Error("Router decided to run tools, but no actions found in intermediate steps.");
    }

    const toolInvocations = actions.map(action => ({
        tool: action.tool,
        toolInput: action.toolInput,
        toolCallId: action.toolCallId,
    }));

    // Execute tools
    const toolExecutorResult = await toolExecutor.batch(toolInvocations);

    // Create ToolMessages with observations
    const observations: ToolMessage[] = toolExecutorResult.map((toolResult, idx) => {
         // Update the observation in the corresponding intermediate step
         state.intermediateSteps[state.intermediateSteps.length - actions.length + idx][1] = toolResult.output;
         return new ToolMessage({
            content: toolResult.output,
            tool_call_id: toolResult.toolCallId!,
        });
    });

    console.log("Tool Observations:", observations);
    // Return observations to be added to messages
    return { messages: observations };
};

// --- Conditional Edge Logic ---

// Decide whether to run tools or finish based on the agent's output
const routeAction = (state: ReActAgentState): "runTools" | "finish" => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1] as AIMessage;
    // If the last message from the agent has tool calls, run tools
    if (lastMessage?.tool_calls?.length) {
        return "runTools";
    }
    // Otherwise, finish
    return "finish";
};

// --- Graph Definition ---
const reactWorkflow = new StateGraph({
    channels: {
        messages: { value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y), default: () => [] },
        intermediateSteps: { value: (x: any[], y: any[]) => x.concat(y), default: () => [] },
        finalOutput: { value: (x?: AgentFinish, y?: AgentFinish) => y ?? x, default: () => undefined },
    }
});

reactWorkflow.addNode("agent", callReActAgent);
reactWorkflow.addNode("tools", runTools);

reactWorkflow.setEntryPoint("agent");

reactWorkflow.addConditionalEdges(
    "agent",
    routeAction,
    {
        runTools: "tools",
        finish: END,
    }
);

reactWorkflow.addEdge("tools", "agent"); // Loop back to agent after running tools

export const rawReActAgentGraph = reactWorkflow.compile();

```

**Step 1.3: Compile & Run (Conceptual)**

```typescript
// Example (Conceptual)
// import { HumanMessage } from "@langchain/core/messages";
// async function runRawReAct() {
//   const inputs = { messages: [new HumanMessage("What was the birth place of Elvis Presley and what is 5 * 13?")] };
//   console.log("--- Starting Raw ReAct Agent ---");
//   const finalState = await rawReActAgentGraph.invoke(inputs);
//   console.log("--- Raw ReAct Agent Finished ---");
//   console.log("Final Output:", finalState.finalOutput?.returnValues.output);
// }
// runRawReAct();
```

*Observation:* Implementing the ReAct loop manually involves defining state, nodes for agent decision and tool execution, and conditional logic for routing. It requires careful state management (`intermediateSteps`).

### Stage 2: Using EffectiveAgent Pipelines

Let's abstract the core ReAct step logic into a pipeline.

**Goal:** Simplify the agent graph by using a reusable ReAct step pipeline.

**Step 2.1: Define the Pipeline Contract (Conceptual)**

We could define a pipeline that takes the current agent state and returns the *next* step (either a tool call request or the final answer).

```typescript
// src/ea/pipelines/react-step/react-step.contract.ts (Conceptual)

import { Effect } from "effect";
import { PipelineError } from "../pipelines.errors";
import type { BaseMessage } from "@langchain/core/messages";
import type { AgentAction, AgentFinish } from "@langchain/core/agents";

// Input includes current messages and potentially intermediate steps
export interface ReActStepInput {
  messages: ReadonlyArray<BaseMessage>;
  intermediateSteps?: ReadonlyArray<[AgentAction, string]>;
}

// Output is either a request for tool actions or the final answer
export type ReActStepOutput =
  | { type: "actions"; actions: AgentAction[]; aiMessage: BaseMessage }
  | { type: "finish"; result: AgentFinish; aiMessage: BaseMessage };

export interface ReActStepPipelineApi {
  readonly executeStep: (
    input: ReActStepInput,
  ) => Effect.Effect<ReActStepOutput, PipelineError>;
}

export const ReActStepPipeline = Effect.GenericTag<ReActStepPipelineApi>("ReActStepPipeline");
```

**Step 2.2: Implement the Pipeline Service (Conceptual)**

This service would encapsulate the logic currently in the `callReActAgent` node (calling LLM with tools, parsing output).

```typescript
// src/ea/pipelines/react-step/react-step.service.ts (Conceptual)

import { Effect, Layer } from "effect";
import type { ReActStepPipelineApi, ReActStepInput, ReActStepOutput } from "./react-step.contract";
import { ReActStepPipeline } from "./react-step.contract";
import { PipelineError } from "../pipelines.errors";
import { EaLlmProvider } from "@/ea/llm-provider"; // Needs LLM
import { EaToolProvider } from "@/ea/tool-provider"; // Needs Tool Info/Provider
import type { AIMessage } from "@langchain/core/messages";
import type { AgentAction, AgentFinish } from "@langchain/core/agents";

type ReActStepPipelineEnv = EaLlmProvider | EaToolProvider;

export class ReActStepPipelineService extends Effect.Service<ReActStepPipelineApi>()(
  ReActStepPipeline,
  {
    effect: Effect.gen(function* (_) {
      const llmProvider = yield* _(EaLlmProvider);
      const toolProvider = yield* _(EaToolProvider); // Get available tools

      const executeStep = (input: ReActStepInput): Effect.Effect<ReActStepOutput, PipelineError> =>
        Effect.gen(function* (_) {
          const availableTools = yield* _(toolProvider.getLangChainTools()); // Get tools for LLM binding
          const llmWithTools = llmProvider.bindTools(availableTools); // Assumes provider has bindTools method

          // Call LLM with current messages
          const response = yield* _(
            llmProvider.invoke(input.messages), // Assumes invoke returns AIMessage structure
            Effect.mapError((llmError) => new PipelineError({ message: "ReAct LLM call failed", cause: llmError }))
          );

          // Parse response for actions or finish
          if (response.tool_calls && response.tool_calls.length > 0) {
            const actions: AgentAction[] = response.tool_calls.map(tc => ({
                tool: tc.name, toolInput: tc.args, log: `Action: ${tc.name}`, toolCallId: tc.id
            }));
            return { type: "actions", actions: actions, aiMessage: response } satisfies ReActStepOutput;
          } else {
            const finalOutput: AgentFinish = { returnValues: { output: response.content }, log: response.content };
            return { type: "finish", result: finalOutput, aiMessage: response } satisfies ReActStepOutput;
          }
        });

      return { executeStep };
    }),
    dependencies: [EaLlmProvider, EaToolProvider],
  }
) {}

export const ReActStepPipelineLayer = ReActStepPipelineService;
```

**Step 2.3: Update Agent Definition (LangGraph)**

The graph now uses the `ReActStepPipeline` and a separate tool execution node.

```typescript
// src/agents/react-agent/pipeline-graph.ts

import { Effect } from "effect";
import { BaseMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { StateGraph, END } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { ReActStepPipeline, ReActStepInput, ReActStepOutput } from "@/ea/pipelines/react-step/react-step.contract";
import { PipelineError } from "@/ea/pipelines/pipelines.errors";
import { EaToolExecutor } from "@/ea/tool-executor"; // Assume a framework Tool Executor service
import type { AgentAction, AgentFinish } from "@langchain/core/agents";

// --- Agent State ---
interface ReActAgentState extends MessagesState {
  intermediateSteps: Array<[AgentAction, string]>;
  pendingActions?: AgentAction[]; // Store actions requested by pipeline
  finalOutput?: AgentFinish;
}

// --- Nodes ---

// 1. Call ReAct Step Pipeline Node
// Returns Effect requiring ReActStepPipeline
const callReActStep = (state: ReActAgentState, config?: RunnableConfig): Effect.Effect<Partial<ReActAgentState>, PipelineError, ReActStepPipeline> => {
    console.log("--- Calling ReAct Step Pipeline Node ---");
    const pipelineInput: ReActStepInput = {
        messages: state.messages,
        intermediateSteps: state.intermediateSteps
    };
    return Effect.gen(function* (_) {
        const pipeline = yield* _(ReActStepPipeline);
        const result = yield* _(pipeline.executeStep(pipelineInput));

        if (result.type === "actions") {
            // Store pending actions and the AI message
            return { messages: [result.aiMessage], pendingActions: result.actions };
        } else {
            // Store final output and the AI message
            return { messages: [result.aiMessage], finalOutput: result.result, pendingActions: [] }; // Clear pending actions
        }
    }).pipe(
         Effect.catchAll((error) => {
            console.error("ReAct Step Pipeline Error:", error);
            const errorMessage = error instanceof PipelineError ? error.message : "Agent step failed.";
            // Return error state update
            return Effect.succeed({ messages: [new AIMessage(errorMessage)], finalOutput: { returnValues: { output: errorMessage }, log: errorMessage } });
        })
    );
};

// 2. Execute Tools Node
// Returns Effect requiring EaToolExecutor
const executeTools = (state: ReActAgentState, config?: RunnableConfig): Effect.Effect<Partial<ReActAgentState>, Error, EaToolExecutor> => {
    console.log("--- Executing Tools Node ---");
    const actions = state.pendingActions;
    if (!actions || actions.length === 0) {
        return Effect.succeed({ messages: [new AIMessage("No tools to execute.")] }); // Should not happen if routed correctly
    }

    return Effect.gen(function* (_) {
        const toolExecutor = yield* _(EaToolExecutor); // Use framework tool executor
        const toolMessages = yield* _(toolExecutor.batch(actions)); // Assumes batch returns ToolMessage[]

        // Add observations to intermediate steps (matching action to observation)
        const updatedSteps = state.intermediateSteps.map(step => {
            const action = step[0];
            const observation = toolMessages.find(tm => tm.tool_call_id === action.toolCallId)?.content ?? "Error: Tool result not found";
            return [action, observation] as [AgentAction, string];
        });

        return {
            messages: toolMessages,
            intermediateSteps: updatedSteps, // Update steps with observations
            pendingActions: [] // Clear pending actions
        };
    });
};

// --- Conditional Edge Logic ---
const routeAfterReActStep = (state: ReActAgentState): "executeTools" | "finish" => {
    if (state.pendingActions && state.pendingActions.length > 0) {
        return "executeTools";
    }
    return "finish";
};

// --- Graph Definition ---
const reactPipelineWorkflow = new StateGraph({
    channels: { /* Define channels for ReActAgentState */
        messages: { value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y), default: () => [] },
        intermediateSteps: { value: (x: any[], y: any[]) => x.concat(y), default: () => [] },
        pendingActions: { value: (x?: AgentAction[], y?: AgentAction[]) => y ?? x, default: () => undefined },
        finalOutput: { value: (x?: AgentFinish, y?: AgentFinish) => y ?? x, default: () => undefined },
    }
});

// Add nodes (assuming runtime handles Effect nodes)
reactPipelineWorkflow.addNode("agentStep", callReActStep as any);
reactPipelineWorkflow.addNode("executeTools", executeTools as any);

reactPipelineWorkflow.setEntryPoint("agentStep");

reactPipelineWorkflow.addConditionalEdges("agentStep", routeAfterReActStep, {
    executeTools: "executeTools",
    finish: END,
});

reactPipelineWorkflow.addEdge("executeTools", "agentStep"); // Loop back

export const pipelineReActAgentGraph = reactPipelineWorkflow.compile();
```

*Observation:* The graph structure remains similar (agent -> tools -> agent), but the "agent" node's logic is now simpler, delegating the complex reasoning/action decision to the `ReActStepPipeline`. Tool execution is also delegated to a framework service (`EaToolExecutor`).

### Stage 3: Using the EA Runtime (Simple)

Running the pipeline-based ReAct agent.

**Goal:** Show simple execution via the runtime.

**Step 3.1: Configure the Runtime (Conceptual)**

```typescript
// src/app/runtime-setup.ts (Conceptual)
import { EffectiveAgentRuntime } from "@/ea/runtime";
// Import Layers needed by the ReActStepPipeline and EaToolExecutor
import { EaOpenAiProviderLayer } from "@/ea/providers/openai.layer";
import { EaToolProviderLayer } from "@/ea/tool-provider.layer"; // Provides tool info
import { WeatherToolLayer } from "@/tools/weather-tool.layer"; // Specific tool layer
import { CalculatorToolLayer } from "@/tools/calculator-tool.layer"; // Specific tool layer
import { ReActStepPipelineLayer } from "@/ea/pipelines/react-step/react-step.service"; // Our pipeline
import { EaToolExecutorLayer } from "@/ea/tool-executor.layer"; // Tool executor service
import { AgentStoreLayer } from "@/agent-store/agent-store.service";
import { AgentRunnerLayer } from "@/agent-runner/agent-runner.service";

export const runtime = EffectiveAgentRuntime.configure({
    layers: [
        EaOpenAiProviderLayer,
        WeatherToolLayer,
        CalculatorToolLayer,
        EaToolProviderLayer, // Provides tools to pipeline/executor
        ReActStepPipelineLayer, // Our pipeline layer
        EaToolExecutorLayer, // Tool executor layer
        AgentStoreLayer,
        AgentRunnerLayer
    ]
});
```

**Step 3.2: Run the Agent**

```typescript
// src/app/features/react-feature.ts (Example Usage - Stage 3)

import { HumanMessage } from "@langchain/core/messages";
import { runtime } from "@/app/runtime-setup";
import { pipelineReActAgentGraph } from "@/agents/react-agent/pipeline-graph"; // Agent from Stage 2
import type { AgentFinish } from "@langchain/core/agents";

async function runReActAgentSimple(query: string): Promise<void> {
  console.log(`--- Stage 3: Running ReAct Agent via Runtime for: "${query}" ---`);
  // Input format for MessagesState
  const agentInput = { messages: [new HumanMessage(query)] };

  try {
    // Call high-level runtime method
    // The final output structure depends on how the graph state is defined
    // Here we expect the final state object containing the AgentFinish
    const finalState = await runtime.invokeAgent<ReActAgentState>( // Expecting full state
      pipelineReActAgentGraph,
      agentInput,
    );

    // Extract final answer
    const finalOutput = finalState?.finalOutput?.returnValues?.output;
    console.log("ReAct Agent Final Output:", finalOutput ?? "No output found.");

  } catch (error) {
    console.error("Runtime invokeAgent failed:", error);
  }
}

// runReActAgentSimple("What is the capital of France?");
// runReActAgentSimple("What is 15 plus 37?");
```

*Observation:* Again, the developer uses the simple `runtime.invokeAgent` call, hiding the complexity of the ReAct loop and pipeline execution.

### Stage 4: Using the EA Runtime (Controlled)

Showing streaming for the ReAct agent to observe thoughts/actions.

**Goal:** Demonstrate observing intermediate steps via streaming.

**Step 4.1: Define Richer API (Conceptual)**

*(Assume `AgentRunOptions` and `streamAgent` exist as defined previously)*

**Step 4.2: Stream the Agent Run**

```typescript
// src/app/features/react-feature.ts (Example Usage - Stage 4 Stream)
import { HumanMessage } from "@langchain/core/messages";
import { runtime } from "@/app/runtime-setup";
import { pipelineReActAgentGraph } from "@/agents/react-agent/pipeline-graph";
import type { AgentRunOptions } from "@/ea/runtime/runtime.contract";

async function streamReActAgentWithControl(query: string): Promise<void> {
    console.log(`--- Stage 4: Streaming ReAct Agent via Runtime for: "${query}" ---`);
    const agentInput = { messages: [new HumanMessage(query)] };
    const runOptions: AgentRunOptions = {
        configurable: { thread_id: `react-stream-${Date.now()}` },
    };

    try {
        // Use streamAgent method
        const stream = await runtime.streamAgent({
            agent: pipelineReActAgentGraph,
            input: agentInput,
            options: runOptions
        });

        console.log("Streaming ReAct Agent Steps:");
        for await (const chunk of stream) {
            // Process stream chunks - format depends on AgentRunner/LangGraph stream output
            // Ideally, chunks represent thoughts, actions, observations, final answer
            // Example pseudo-processing:
            if (chunk?.agentStep?.messages) { // Check if it's the output of the agentStep node
                const lastMsg = chunk.agentStep.messages[chunk.agentStep.messages.length - 1];
                if (lastMsg?._getType() === 'ai' && lastMsg.tool_calls?.length) {
                    console.log(`Thought/Action: ${lastMsg.content} -> Tools: ${lastMsg.tool_calls.map(tc => tc.name).join(', ')}`);
                } else if (lastMsg?._getType() === 'ai') {
                     console.log(`Final Answer Chunk: ${lastMsg.content}`);
                }
            } else if (chunk?.executeTools?.messages) { // Check if it's the output of the executeTools node
                 const observations = chunk.executeTools.messages.map((m: any) => m.content).join('\n');
                 console.log(`Observation: ${observations}`);
            } else {
                 // console.log("Unknown Chunk:", chunk); // Log other chunk types
            }
        }
        console.log("\nReAct Stream finished.");

    } catch (error) {
        console.error("Runtime streamAgent failed:", error);
    }
}

// streamReActAgentWithControl("Search for Elvis Presley's birthplace then calculate 11 * 12");
```

*Observation:* The `streamAgent` method allows observing the intermediate steps (thoughts, actions, observations) generated during the ReAct process, providing more visibility than the simple `invokeAgent`. The exact structure of the stream chunks needs to be well-defined by the `AgentRunner` implementation.

## Conclusion (Draft)

*(Same as previous version, now reinforced by the ReAct example)*

---

This completes the ReAct agent example across the four stages within the Guidebook draft. Let me know your thoughts!
```
```

