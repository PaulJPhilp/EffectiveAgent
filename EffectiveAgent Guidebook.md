Below is the entire guidebook saved as a single Markdown block. You can copy and paste this block into your Markdown file (for example, `effectiveagent-guidebook.md`):

```markdown
# The EffectiveAgent Guidebook (Draft v0.2 Updated)

## Table of Contents
- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Example 1: Simple Weather Agent](#example-1-simple-weather-agent)
  - [Stage 1: Raw LangGraph Implementation](#stage-1-raw-langgraph-implementation)
  - [Stage 2: Using an EffectiveAgent Pipeline](#stage-2-using-an-effectiveagent-pipeline)
  - [Stage 3: Using the EA Runtime (Simple)](#stage-3-using-the-ea-runtime-simple)
  - [Stage 4: Using the EA Runtime (Controlled)](#stage-4-using-the-ea-runtime-controlled)
- [Example 2: Realistic ReAct Agent](#example-2-realistic-react-agent)
  - [Stage 1: Raw LangGraph Implementation](#stage-1-raw-langgraph-implementation-1)
  - [Stage 2: Using EffectiveAgent Pipelines](#stage-2-using-effectiveagent-pipelines)
  - [Stage 3: Using the EA Runtime (Simple)](#stage-3-using-the-ea-runtime-simple-1)
  - [Stage 4: Using the EA Runtime (Controlled)](#stage-4-using-the-ea-runtime-controlled-1)
- [Reference: Hypothetical Components](#reference-hypothetical-components)
  - [PipelineError](#pipelineerror)
  - [EaLlmProvider](#eallmprovider)
  - [EaToolExecutor](#eatoolexecutor)
- [Glossary and External Links](#glossary-and-external-links)
- [Conclusion](#conclusion)

---

## Introduction

Welcome to the EffectiveAgent Guidebook! This document demonstrates how to build and run AI agents using the EffectiveAgent framework. Our library leverages [Effect‑TS](https://github.com/effect-ts/core) for robust asynchronous programming and [LangGraph](https://github.com/langchain-ai/langgraph) for structuring agent graphs. The guide shows developers—from low‑level raw implementations to high‑level pipeline abstractions and runtime APIs—how to construct intelligent agents with a focus on modularity and reusability.

A central concept is the **Pipeline**—a reusable component that encapsulates the logic for specific tasks (e.g., getting weather data or executing a ReAct loop). The **EffectiveAgent Runtime** then provides an intuitive API to execute these agents while abstracting away the underlying Effect‑TS operations and dependency management.

---

## Prerequisites

- Node.js (minimum version as recommended by Effect‑TS)
- Familiarity with TypeScript
- Basic understanding of LangChain/LangGraph (helpful but not required)
- Installation of packages including:
  - `effect`
  - `@effect/schema`
  - `langchain`
  - `@langchain/core`
  - `@langchain/openai` (or other LLM provider)
  - `langgraph`
  - `ulid`
  - Hypothetical packages such as `@effectiveagent/*`
- Appropriate configuration for any required API keys (e.g., OpenAI)

---

## Example 1: Simple Weather Agent

Our first example builds an agent that takes a location as input and returns the current weather.

### Stage 1: Raw LangGraph Implementation

In this stage, we build the agent using a plain LangGraph implementation and TypeScript primitives without any high-level abstractions.

**Step 1.1: Define the Tool (Plain TypeScript)**

```typescript
// src/tools/weather-tool.raw.ts

import { Tool } from "@langchain/core/tools";

interface WeatherToolImpl {
  getCurrentWeather: (
    location: string
  ) => Promise<{ temperature: number; condition: string }>;
}

const mockWeatherData: Record<
  string,
  { temperature: number; condition: string }
> = {
  london: { temperature: 15, condition: "Cloudy" },
  paris: { temperature: 18, condition: "Sunny" },
  tokyo: { temperature: 22, condition: "Rainy" },
};

const getCurrentWeatherMock: WeatherToolImpl["getCurrentWeather"] = async (
  location
) => {
  console.log(`MockWeatherTool (Raw): Getting weather for ${location}`);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const key = location.toLowerCase();
  if (mockWeatherData[key]) {
    return mockWeatherData[key];
  } else {
    throw new Error(`Location not found in mock data: ${location}`);
  }
};

export class WeatherLangChainTool extends Tool {
  name = "get_current_weather";
  description =
    "Gets the current weather for a specified location. Input should be the location name (e.g., London).";

  async _call(input: string): Promise<string> {
    try {
      const result = await getCurrentWeatherMock(input);
      return JSON.stringify(result);
    } catch (error: any) {
      console.error("Weather Tool Error:", error);
      return `Error: ${error.message || "Failed to get weather"}`;
    }
  }
}

export const weatherToolInstance = new WeatherLangChainTool();
```

**Step 1.2: Define LangGraph State & Nodes**

```typescript
// src/agents/weather-agent/raw-graph.ts

import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { StateGraph, END, MessagesState } from "@langgraph/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { ToolExecutor } from "@langchain/langgraph/prebuilt";
import { weatherToolInstance } from "../../tools/weather-tool.raw";

const llm = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0,
});
const toolExecutor = new ToolExecutor({ tools: [weatherToolInstance] });

const callModel = async (
  state: MessagesState,
  config?: RunnableConfig
): Promise<Partial<MessagesState>> => {
  console.log("--- Calling Model ---");
  const { messages } = state;
  const llmWithTools = llm.bindTools([weatherToolInstance]);
  const response: AIMessage = await llmWithTools.invoke(messages, config);
  console.log("Model Response:", response);
  return { messages: [response] };
};

const callTool = async (
  state: MessagesState
): Promise<Partial<MessagesState>> => {
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
  const toolMessages: ToolMessage[] = toolExecutorResult.map(
    (toolResult) =>
      new ToolMessage({
        content: toolResult.output,
        tool_call_id: toolResult.toolCallId!,
      })
  );
  console.log("Tool Results:", toolMessages);
  return { messages: toolMessages };
};

const shouldContinue = (state: MessagesState): "continue" | "end" => {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  return lastMessage?.tool_calls?.length ? "continue" : "end";
};

const workflow = new StateGraph({ channels: MessagesState });
workflow.addNode("agent", callModel);
workflow.addNode("action", callTool);
workflow.setEntryPoint("agent");
workflow.addConditionalEdges("agent", shouldContinue, {
  continue: "action",
  end: END,
});
workflow.addEdge("action", "agent");

export const rawWeatherAgentGraph = workflow.compile();
```

**Step 1.3: Compile & Run (Conceptual)**

```typescript
// Example (Conceptual - Not using EA Runtime yet)
// import { HumanMessage } from "@langchain/core/messages";
// async function runRaw() {
//   const inputs = {
//     messages: [new HumanMessage("What is the weather like in London?")],
//   };
//   const finalState = await rawWeatherAgentGraph.invoke(inputs);
//   console.log(
//     finalState.messages[finalState.messages.length - 1]?.content
//   );
// }
// runRaw();
```

---

### Stage 2: Using an EffectiveAgent Pipeline

Now we encapsulate the weather-fetching logic into a reusable EA Pipeline.

**Step 2.1: Define the Pipeline Contract**

```typescript
// src/ea/pipelines/weather/weather.contract.ts

import { Effect } from "effect";
import { PipelineError } from "../pipelines.errors"; // See Reference section
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
  readonly getWeather: (
    input: GetWeatherInput
  ) => Effect.Effect<WeatherData, PipelineError>;
}

export const WeatherPipeline = Effect.GenericTag<WeatherPipelineApi>(
  "WeatherPipeline"
);
```

**Step 2.2: Implement the Pipeline Service**

```typescript
// src/ea/pipelines/weather/weather.service.ts

import { Effect, Layer, pipe } from "effect";
import type {
  WeatherPipelineApi,
  WeatherData,
  GetWeatherInput,
} from "./weather.contract";
import { WeatherPipeline } from "./weather.contract";
import { PipelineError } from "../pipelines.errors";
import { EaLlmProvider } from "@/ea/llm-provider"; // See Reference section
import { WeatherTool, WeatherToolApi } from "@/tools/weather-tool"; // Assume Effect-compatible version

type WeatherPipelineEnv = EaLlmProvider | WeatherToolApi;

export class WeatherPipelineService extends Effect.Service<WeatherPipelineApi>()(
  WeatherPipeline,
  {
    effect: Effect.gen(function* (_) {
      const llmProvider = yield* _(EaLlmProvider);
      const weatherTool = yield* _(WeatherTool);

      const getWeather = (
        input: GetWeatherInput
      ): Effect.Effect<WeatherData, PipelineError> =>
        Effect.gen(function* (_) {
          yield* _(
            Effect.logInfo(
              `WeatherPipeline: Processing request for ${input.location}`
            )
          );

          const toolResult = yield* _(
            weatherTool.getCurrentWeather(input.location),
            Effect.mapError(
              (toolError) =>
                new PipelineError({
                  message: `Weather tool failed for ${input.location}`,
                  cause: toolError,
                  pipelineName: "WeatherPipeline",
                })
            )
          );

          const summaryPrompt = `Summarize: temp=${toolResult.temperature}C, condition=${toolResult.condition}`;
          const summaryResult = yield* _(
            llmProvider.invoke([{ role: "user", content: summaryPrompt }]),
            Effect.map((msg) => msg.content),
            Effect.mapError(
              (llmError) =>
                new PipelineError({
                  message: "LLM summary failed",
                  cause: llmError,
                  pipelineName: "WeatherPipeline",
                })
            ),
            Effect.orElseSucceed(() => undefined)
          );

          const outputData: WeatherData = {
            location: input.location,
            temperature: toolResult.temperature,
            condition: toolResult.condition,
            unit: "celsius",
            forecast: summaryResult,
          };
          return outputData;
        }).pipe(
          Effect.tapErrorCause((cause) =>
            Effect.logError("WeatherPipeline failed", cause)
          )
        );

      return { getWeather };
    }),
    dependencies: [EaLlmProvider, WeatherTool],
  }
) { }

export const WeatherPipelineLayer = WeatherPipelineService;
```

**Step 2.3: Update Agent Definition (LangGraph)**

```typescript
// src/agents/weather-agent/pipeline-graph.ts

import { Effect } from "effect";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { StateGraph, END, MessagesState } from "@langgraph/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { WeatherPipeline, GetWeatherInput, WeatherData } from "@/ea/pipelines/weather/weather.contract";
import { PipelineError } from "@/ea/pipelines/pipelines.errors";

const callWeatherPipelineNode = (
  state: MessagesState,
  config?: RunnableConfig
): Effect.Effect<Partial<MessagesState>, PipelineError, WeatherPipeline> =>
  Effect.gen(function* (_) {
    console.log("--- Calling Weather Pipeline Node ---");
    const lastMessage = state.messages[state.messages.length - 1];
    const query = lastMessage.content as string;
    const pipelineInput: GetWeatherInput = { location: query, query: query };

    const weatherPipeline = yield* _(WeatherPipeline);
    const weatherData = yield* _(weatherPipeline.getWeather(pipelineInput));
    const responseContent = `The weather in ${weatherData.location} is ${weatherData.temperature}°C and ${weatherData.condition}. ${weatherData.forecast ?? ''}`;
    return { messages: [new AIMessage(responseContent)] };
  }).pipe(
    Effect.catchAll((error) => {
      console.error("Pipeline Error:", error);
      const errorMessage =
        error instanceof PipelineError ? error.message : "Sorry, I couldn't get the weather.";
      return Effect.succeed({ messages: [new AIMessage(errorMessage)] });
    })
  );

const pipelineWorkflow = new StateGraph({ channels: MessagesState });
pipelineWorkflow.addNode("getWeather", callWeatherPipelineNode as any);
pipelineWorkflow.setEntryPoint("getWeather");
pipelineWorkflow.addEdge("getWeather", END);

export const pipelineWeatherAgentGraph = pipelineWorkflow.compile();
```

---

### Stage 3: Using the EA Runtime (Simple)

At this stage, developers utilize the configured runtime to invoke the agent without worrying about the underlying Effect‑TS details.

**Step 3.1: Configure the Runtime (Conceptual)**

```typescript
// src/app/runtime-setup.ts (Conceptual)
import { EffectiveAgentRuntime } from "@/ea/runtime";
import { EaOpenAiProviderLayer } from "@/ea/providers/openai.layer";
import { WeatherToolLayer } from "@/tools/weather-tool.layer";
import { WeatherPipelineLayer } from "@/ea/pipelines/weather/weather.service";
import { AgentStoreLayer } from "@/agent-store/agent-store.service";
import { AgentRunnerLayer } from "@/agent-runner/agent-runner.service";

export const runtime = EffectiveAgentRuntime.configure({
  layers: [
    EaOpenAiProviderLayer,
    WeatherToolLayer,
    WeatherPipelineLayer,
    AgentStoreLayer,
    AgentRunnerLayer,
  ],
});
```

**Step 3.2: Run the Agent**

```typescript
// src/app/features/weather-feature.ts (Example Usage - Stage 3)

import { HumanMessage } from "@langchain/core/messages";
import { runtime } from "@/app/runtime-setup";
import { pipelineWeatherAgentGraph } from "@/agents/weather-agent/pipeline-graph";
import type { WeatherData } from "@/ea/pipelines/weather/weather.contract";

async function getWeatherTheSimpleWay(location: string): Promise<void> {
  console.log(`--- Stage 3: Running Weather Agent via Runtime for: ${location} ---`);
  const agentInput = { messages: [new HumanMessage(location)] };

  try {
    const result = await runtime.invokeAgent<WeatherData>(
      pipelineWeatherAgentGraph,
      agentInput
    );

    if (typeof result === "string") {
      console.log("Agent Response (Pipeline Error):", result);
    } else if (result && typeof result === "object" && "temperature" in result) {
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

---

### Stage 4: Using the EA Runtime (Controlled)

This stage adds additional options such as usage statistics and metadata, as well as streaming support.

**Step 4.1: Define Richer API (Conceptual)**

*Assume that the following interfaces exist for a richer agent run response:*

```typescript
// src/ea/runtime/runtime.contract.ts (Conceptual Snippets)
export interface AgentRunOptions {
  configurable?: Record<string, any>;
  includeUsage?: boolean;
  includeMetadata?: boolean;
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
import { HumanMessage } from "@langchain/core/messages";
import { runtime } from "@/app/runtime-setup";
import { pipelineWeatherAgentGraph } from "@/agents/weather-agent/pipeline-graph";
import type { WeatherData } from "@/ea/pipelines/weather/weather.contract";

async function getWeatherWithControl(location: string): Promise<void> {
  console.log(`--- Stage 4: Running Weather Agent via Runtime (Controlled) for: ${location} ---`);
  const agentInput = { messages: [new HumanMessage(location)] };
  const runOptions: AgentRunOptions = {
    configurable: { thread_id: `weather-thread-${Date.now()}` },
    includeUsage: true,
    includeMetadata: true,
  };

  try {
    const { output, usage, metadata } = await runtime.invokeAgent<WeatherData>({
      agent: pipelineWeatherAgentGraph,
      input: agentInput,
      options: runOptions,
    });

    console.log("Agent Output (Structured):", output);
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
import { HumanMessage } from "@langchain/core/messages";
import { runtime } from "@/app/runtime-setup";
import { pipelineWeatherAgentGraph } from "@/agents/weather-agent/pipeline-graph";
import type { AgentRunOptions } from "@/ea/runtime/runtime.contract";

async function streamWeatherWithControl(location: string): Promise<void> {
  console.log(`--- Stage 4: Streaming Weather Agent via Runtime for: ${location} ---`);
  const agentInput = { messages: [new HumanMessage(location)] };
  const runOptions: AgentRunOptions = {
    configurable: { thread_id: `weather-stream-${Date.now()}` },
  };

  try {
    const stream = await runtime.streamAgent({
      agent: pipelineWeatherAgentGraph,
      input: agentInput,
      options: runOptions,
    });

    console.log("Streaming Response:");
    for await (const chunk of stream) {
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

---

## Example 2: Realistic ReAct Agent

This example demonstrates a more complex agent that follows the ReAct (Reasoning + Acting) pattern. It may perform tasks like information lookup via a search tool or calculations via a calculator tool.

### Stage 1: Raw LangGraph Implementation

**Step 1.1: Define Tools (Plain TypeScript)**

```typescript
// src/tools/react-tools.raw.ts

import { Tool } from "@langchain/core/tools";

// --- Search Tool ---
interface SearchToolImpl {
  search: (query: string) => Promise<string>;
}
const searchMock: SearchToolImpl["search"] = async (query) => {
  console.log(`MockSearchTool (Raw): Searching for "${query}"`);
  await new Promise(resolve => setTimeout(resolve, 200));
  if (query.toLowerCase().includes("capital of france")) {
    return "The capital of France is Paris.";
  }
  if (query.toLowerCase().includes("elvis presley")) {
    return "Elvis Presley was born in Tupelo, Mississippi.";
  }
  return `No search results found for "${query}".`;
};
export class SearchLangChainTool extends Tool {
  name = "search";
  description = "Searches for information online. Input should be the search query.";
  async _call(input: string): Promise<string> {
    return await searchMock(input);
  }
}
export const searchToolInstance = new SearchLangChainTool();

// --- Calculator Tool ---
interface CalculatorToolImpl {
  calculate: (expression: string) => Promise<string>;
}
const calculateMock: CalculatorToolImpl["calculate"] = async (expression) => {
  console.log(`MockCalculatorTool (Raw): Calculating "${expression}"`);
  await new Promise(resolve => setTimeout(resolve, 100));
  try {
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
    return await calculateMock(input);
  }
}
export const calculatorToolInstance = new CalculatorLangChainTool();

export const rawReactTools = [searchToolInstance, calculatorToolInstance];
```

**Step 1.2: Define LangGraph State & Nodes**

_(The implementation for the raw ReAct agent follows a similar structure to the Weather Agent, extended to support intermediate steps and final answer parsing. Refer to the full example in your original draft for details.)_

---

*(Stages 2–4 for the ReAct agent follow a similar progressive abstraction via pipelines and runtime usage. See the original document for detailed implementations.)*

---

## Reference: Hypothetical Components

### PipelineError

```typescript
// src/ea/pipelines/pipelines.errors.ts

export interface PipelineErrorParams {
  message: string;
  cause?: unknown;
  pipelineName: string;
}

export class PipelineError extends Error {
  pipelineName: string;
  cause?: unknown;

  constructor({ message, cause, pipelineName }: PipelineErrorParams) {
    super(message);
    this.pipelineName = pipelineName;
    this.cause = cause;
    this.name = "PipelineError";
  }
}
```

### EaLlmProvider

```typescript
// src/ea/llm-provider.ts

import { Effect } from "effect";

export interface EaLlmProviderApi {
  invoke: (messages: any[]) => Promise<{ content: string; tool_calls?: any[] }>;
  bindTools: (tools: any[]) => EaLlmProviderApi;
}

export const EaLlmProvider = Effect.GenericTag<EaLlmProviderApi>("EaLlmProvider");

// Minimal stub implementation
export class DefaultEaLlmProvider implements EaLlmProviderApi {
  async invoke(messages: any[]) {
    // Replace with actual LLM invocation logic
    return { content: "Mock LLM response", tool_calls: [] };
  }
  bindTools(tools: any[]): EaLlmProviderApi {
    // Returns self for simplicity; real implementations may combine tool logic
    return this;
  }
}
```

### EaToolExecutor

```typescript
// src/ea/tool-executor.ts

import { Effect } from "effect";

export interface EaToolExecutorApi {
  batch: (actions: any[]) => Promise<any[]>;
}

export const EaToolExecutor = Effect.GenericTag<EaToolExecutorApi>("EaToolExecutor");

// Minimal stub implementation
export class DefaultEaToolExecutor implements EaToolExecutorApi {
  async batch(actions: any[]): Promise<any[]> {
    // For each action, return a mock result; replace with real tool execution
    return actions.map((action) => ({
      output: `Mock result for ${action.tool}`,
      toolCallId: action.toolCallId,
    }));
  }
}
```

---

## Glossary and External Links

- **Effect‑TS:**  
  A TypeScript library for handling asynchronous and concurrent programming using functional effects.  
  [GitHub repository](https://github.com/effect-ts/core)

- **LangGraph:**  
  A library for constructing agent graphs or state machines that bind together LLMs, tools, and other asynchronous components.  
  [LangGraph Documentation](https://github.com/langchain-ai/langgraph)

- **Pipeline:**  
  A reusable component that encapsulates the logic for a specific high-level task (e.g., weather lookup or ReAct loop).

- **ReAct:**  
  Stands for Reasoning + Acting. A design pattern where an agent alternates between internal reasoning and taking actions (such as tool invocations) based on observations.

- **Agent:**  
  A system that uses an LLM in combination with tools to perform a complex task.

- **LLM:**  
  Language Model—used for generating text, reasoning, and determining tool usage.

---

## Conclusion

This updated guidebook now includes a navigable table of contents, a glossary with external links to key resources, and a dedicated reference section for hypothetical components. These additions should further help developers understand the framework structure and get up to speed with building robust AI agents using EffectiveAgent.

Happy coding!
``` 

You can now copy this entire block as a single Markdown file. Enjoy building your agents with EffectiveAgent!
```

