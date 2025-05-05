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

Okay, great! I'm glad we're on the same page with that interpretation of the image and the developer experience it represents. The framework (`AgentRuntime`) empowers the developer's core agent logic (the small robot).

Now, let's get back to the **EffectiveAgent Guidebook** plan.

We've completed the four stages for the **Simple Weather Agent**. The next major step is to do the same for the **Realistic ReAct Agent** example.

We'll start with **Stage 1: ReAct Agent using Raw LangGraph**.

I'll provide the code for the tools and the LangGraph definition again, ensuring it uses only plain TypeScript and standard LangGraph components, consistent with Stage 1 of the weather example.

**Stage 1: ReAct Agent using Raw LangGraph**

**Step 1.1: Define Tools (Plain TypeScript)**

*(This is the same `react-tools.raw.ts` content as before)*
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

*(This is the same `raw-graph.ts` content for the ReAct agent as before)*
```typescript
// src/agents/react-agent/raw-graph.ts

import { BaseMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { StateGraph, END } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { ToolExecutor } from "@langchain/langgraph/prebuilt";
import { rawReactTools } from "../../tools/react-tools.raw";
import type { AgentAction, AgentFinish } from "@langchain/core/agents";

// --- Agent State ---
interface ReActAgentState extends MessagesState {
  intermediateSteps: Array<[AgentAction, string]>;
  finalOutput?: AgentFinish;
}

// --- Configuration ---
const llm = new ChatOpenAI({ modelName: "gpt-4-turbo", temperature: 0 }); // Use a capable model
const toolExecutor = new ToolExecutor({ tools: rawReactTools });

// --- Nodes ---
const callReActAgent = async (state: ReActAgentState, config?: RunnableConfig): Promise<Partial<ReActAgentState>> => {
    console.log("--- Calling ReAct Agent Node ---");
    const { messages } = state; // intermediateSteps are implicitly handled by some agent executors/prompts, but we pass messages
    const llmWithTools = llm.bindTools(rawReactTools);
    const response: AIMessage = await llmWithTools.invoke(messages, config);
    console.log("ReAct LLM Response:", response);

    if (!response.tool_calls || response.tool_calls.length === 0) {
        const finalOutput: AgentFinish = { returnValues: { output: response.content }, log: response.content };
        return { messages: [response], finalOutput: finalOutput };
    } else {
        const actions: AgentAction[] = response.tool_calls.map(tc => ({
            tool: tc.name,
            toolInput: tc.args,
            log: `Invoking tool ${tc.name} with input ${JSON.stringify(tc.args)}`,
            toolCallId: tc.id,
        }));
        // Add actions to intermediate steps *before* returning
        const currentSteps = state.intermediateSteps ?? [];
        const newSteps = actions.map(a => [a, ''] as [AgentAction, string]); // Add placeholders for observations
        return { messages: [response], intermediateSteps: currentSteps.concat(newSteps) };
    }
};

const runTools = async (state: ReActAgentState): Promise<Partial<ReActAgentState>> => {
    console.log("--- Running Tools ---");
    // Get actions from the *last* set added to intermediateSteps
    const lastStepActions = state.intermediateSteps.filter(step => step[1] === ''); // Find steps needing observation
    if (!lastStepActions || lastStepActions.length === 0) {
         console.warn("Tool node called but no pending actions found in intermediate steps.");
         return {}; // No change if no actions are pending
    }
    const actions = lastStepActions.map(step => step[0]);

    const toolInvocations = actions.map(action => ({
        tool: action.tool,
        toolInput: action.toolInput,
        toolCallId: action.toolCallId,
    }));

    const toolExecutorResult = await toolExecutor.batch(toolInvocations);

    const observations: ToolMessage[] = toolExecutorResult.map((toolResult, idx) => {
         // Find the original action this result corresponds to
         const correspondingAction = actions[idx];
         // Update the observation in the *correct* intermediate step
         const stepIndex = state.intermediateSteps.findIndex(step => step[0].toolCallId === correspondingAction.toolCallId);
         if (stepIndex !== -1) {
             state.intermediateSteps[stepIndex][1] = toolResult.output; // Update observation
         }
         return new ToolMessage({
            content: toolResult.output,
            tool_call_id: toolResult.toolCallId!,
        });
    });

    console.log("Tool Observations:", observations);
    // Return observations and the updated intermediateSteps
    return { messages: observations, intermediateSteps: state.intermediateSteps };
};


// --- Conditional Edge Logic ---
const routeAction = (state: ReActAgentState): "runTools" | "finish" => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1] as AIMessage;
    if (lastMessage?.tool_calls?.length) {
        return "runTools";
    }
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
reactWorkflow.addConditionalEdges("agent", routeAction, { runTools: "tools", finish: END });
reactWorkflow.addEdge("tools", "agent");
export const rawReActAgentGraph = reactWorkflow.compile();

```

**Step 1.3: Compile & Run (Conceptual)**

*(Same conceptual execution as the weather agent's Stage 1)*

```typescript
// Example (Conceptual)
// import { HumanMessage } from "@langchain/core/messages";
// async function runRawReAct() {
//   const inputs = { messages: [new HumanMessage("What was the birth place of Elvis Presley and what is 5 * 13?")] };
//   const finalState = await rawReActAgentGraph.invoke(inputs);
//   console.log("Final Output:", finalState.finalOutput?.returnValues.output);
// }
// runRawReAct();
```

Okay, Paul. Let's move on to **Stage 2: ReAct Agent using EffectiveAgent Pipelines**.

We'll define and implement the `ReActStepPipeline` we conceptualized earlier. This pipeline will encapsulate the core reasoning step: taking the current conversation state and deciding whether to call a tool or provide the final answer.

**Step 2.1: Define the Pipeline Contract**

```typescript
// src/ea/pipelines/react-step/react-step.contract.ts

import { Effect } from "effect";
import { PipelineError } from "../pipelines.errors"; // Assume base error exists
import type { BaseMessage, AIMessage } from "@langchain/core/messages";
// Use LangChain's AgentAction/AgentFinish types for compatibility if desired,
// or define framework-specific types. Let's use LC types for now.
import type { AgentAction, AgentFinish } from "@langchain/core/agents";

/** Input for a single step of the ReAct loop. */
export interface ReActStepInput {
  messages: ReadonlyArray<BaseMessage>;
  // Intermediate steps might be needed for more complex ReAct prompts
  // intermediateSteps?: ReadonlyArray<[AgentAction, string]>;
}

/** Output indicating the need to execute tool actions. */
export interface ReActActionsOutput {
  readonly type: "actions";
  readonly actions: ReadonlyArray<AgentAction>; // Actions to execute
  readonly aiMessage: AIMessage; // The AI message containing thought/action request
}

/** Output indicating the agent has finished. */
export interface ReActFinishOutput {
  readonly type: "finish";
  readonly result: AgentFinish; // Final result structure
  readonly aiMessage: AIMessage; // The final AI message
}

/** Union type for the possible outcomes of a ReAct step. */
export type ReActStepOutput = ReActActionsOutput | ReActFinishOutput;

/**
 * Defines the API for a reusable ReAct Step Pipeline service.
 * Encapsulates the LLM call and logic to determine the next step
 * in a ReAct loop (request tool actions or provide final answer).
 */
export interface ReActStepPipelineApi {
  /**
   * Executes one step of the ReAct reasoning process.
   *
   * @param input The current state (messages) of the ReAct loop.
   * @returns An Effect yielding a ReActStepOutput indicating whether to
   *          execute actions or finish, or failing with PipelineError.
   */
  readonly executeStep: (
    input: ReActStepInput,
  ) => Effect.Effect<ReActStepOutput, PipelineError>;
}

// Define the Service Tag for DI
export const ReActStepPipeline = Effect.GenericTag<ReActStepPipelineApi>("ReActStepPipeline");

```

**Step 2.2: Implement the Pipeline Service**

This service uses `EaLlmProvider` and `EaToolProvider` (to get tool schemas for the LLM).

```typescript
// src/ea/pipelines/react-step/react-step.service.ts

import { Effect, Layer, pipe } from "effect";
import type { ReActStepPipelineApi, ReActStepInput, ReActStepOutput, ReActActionsOutput, ReActFinishOutput } from "./react-step.contract";
import { ReActStepPipeline } from "./react-step.contract";
import { PipelineError } from "../pipelines.errors";
import { EaLlmProvider } from "@/ea/llm-provider"; // Framework LLM Service Tag
import { EaToolProvider } from "@/ea/tool-provider"; // Framework Tool Service Tag
import type { AIMessage } from "@langchain/core/messages";
import type { AgentAction, AgentFinish } from "@langchain/core/agents";

// Define the Environment needed by this pipeline's implementation
type ReActStepPipelineEnv = EaLlmProvider | EaToolProvider;

// Define the Service Class adhering to the standard pattern
export class ReActStepPipelineService extends Effect.Service<ReActStepPipelineApi>()(
  ReActStepPipeline, // Use Tag as identifier
  {
    // Effect factory for the service implementation
    effect: Effect.gen(function* (_) {
      // Get dependencies from context
      const llmProvider = yield* _(EaLlmProvider);
      const toolProvider = yield* _(EaToolProvider);

      // Implement the executeStep method
      const executeStep = (input: ReActStepInput): Effect.Effect<ReActStepOutput, PipelineError> =>
        Effect.gen(function* (_) {
          yield* _(Effect.logDebug("ReActStepPipeline: Executing step..."));

          // 1. Get available tools (schemas) to bind to the LLM
          const availableTools = yield* _(
              toolProvider.getLangChainTools(), // Assumes tool provider has this method
              Effect.mapError((err) => new PipelineError({ message: "Failed to get tools", cause: err }))
          );

          // 2. Get LLM instance and bind tools
          // Assumes llmProvider has a method like 'getChatModel' or similar
          // and a 'bindTools' capability. This depends on EaLlmProvider's API.
          const llmWithTools = llmProvider.bindTools(availableTools); // Simplified conceptual call

          // 3. Call the LLM with the current messages
          const response = yield* _(
            llmProvider.invoke(input.messages), // Use the bound LLM if invoke doesn't handle it
            Effect.mapError((llmError) => new PipelineError({ message: "ReAct LLM call failed", cause: llmError }))
          );

          // Ensure response is AIMessage (or handle other types if necessary)
          if (response._getType() !== 'ai') {
              return yield* _(Effect.fail(new PipelineError({ message: `Unexpected LLM response type: ${response._getType()}` })));
          }
          const aiMessage = response as AIMessage; // Type assertion

          // 4. Parse response for actions or finish signal
          if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
            yield* _(Effect.logDebug("ReActStepPipeline: Actions requested", { count: aiMessage.tool_calls.length }));
            // Map LangChain tool_calls to AgentAction structure
            const actions: AgentAction[] = aiMessage.tool_calls.map(tc => ({
                tool: tc.name,
                toolInput: tc.args,
                log: `Action: ${tc.name} with args ${JSON.stringify(tc.args)}`, // Log can be improved
                toolCallId: tc.id,
            }));
            return { type: "actions", actions: actions, aiMessage: aiMessage } satisfies ReActActionsOutput;
          } else {
            yield* _(Effect.logDebug("ReActStepPipeline: Finishing"));
            // Assume content is the final answer
            const finalOutput: AgentFinish = { returnValues: { output: aiMessage.content }, log: aiMessage.content };
            return { type: "finish", result: finalOutput, aiMessage: aiMessage } satisfies ReActFinishOutput;
          }
        });

      // Return the implementation object matching the API
      return { executeStep };
    }),
    // Declare dependencies needed by the service factory
    dependencies: [EaLlmProvider, EaToolProvider],
  },
) {}

// Define the Layer using the Service Class itself
// This Layer requires Layers for EaLlmProvider and EaToolProvider
export const ReActStepPipelineLayer = ReActStepPipelineService;
```

**Step 2.3: Update Agent Definition (LangGraph)**

The graph uses the `ReActStepPipeline` for the agent logic node and an `EaToolExecutor` service (assuming one exists) for the tool execution node.

```typescript
// src/agents/react-agent/pipeline-graph.ts (Revised)

import { Effect } from "effect";
import { BaseMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { StateGraph, END } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { ReActStepPipeline, ReActStepInput, ReActStepOutput } from "@/ea/pipelines/react-step/react-step.contract";
import { PipelineError } from "@/ea/pipelines/pipelines.errors";
import { EaToolExecutor } from "@/ea/tool-executor"; // Assume a framework Tool Executor service Tag
import type { AgentAction, AgentFinish } from "@langchain/core/agents";

// --- Agent State ---
interface ReActAgentState extends MessagesState {
  // intermediateSteps might not be needed if pipeline handles history/context
  pendingActions?: ReadonlyArray<AgentAction>; // Store actions requested by pipeline
  finalOutput?: AgentFinish;
}

// --- Environment for Nodes ---
type AgentNodeEnv = ReActStepPipeline;
type ToolNodeEnv = EaToolExecutor;

// --- Nodes ---

// 1. Call ReAct Step Pipeline Node
// Returns Effect requiring ReActStepPipeline
const callReActStepNode = (state: ReActAgentState, config?: RunnableConfig): Effect.Effect<Partial<ReActAgentState>, PipelineError, AgentNodeEnv> => {
    console.log("--- Calling ReAct Step Pipeline Node ---");
    const pipelineInput: ReActStepInput = { messages: state.messages };

    return Effect.gen(function* (_) {
        const pipeline = yield* _(ReActStepPipeline);
        const result = yield* _(pipeline.executeStep(pipelineInput));

        if (result.type === "actions") {
            return { messages: [result.aiMessage], pendingActions: result.actions };
        } else { // result.type === "finish"
            return { messages: [result.aiMessage], finalOutput: result.result, pendingActions: [] };
        }
    }).pipe(
         Effect.catchAll((error) => {
            console.error("ReAct Step Pipeline Error:", error);
            const errorMessage = error instanceof PipelineError ? error.message : "Agent step failed.";
            return Effect.succeed({ messages: [new AIMessage(errorMessage)], finalOutput: { returnValues: { output: errorMessage }, log: errorMessage } });
        })
    );
};

// 2. Execute Tools Node
// Returns Effect requiring EaToolExecutor
const executeToolsNode = (state: ReActAgentState, config?: RunnableConfig): Effect.Effect<Partial<ReActAgentState>, Error, ToolNodeEnv> => {
    console.log("--- Executing Tools Node ---");
    const actions = state.pendingActions;
    if (!actions || actions.length === 0) {
        return Effect.succeed({ messages: [new AIMessage("No tools to execute.")] });
    }

    return Effect.gen(function* (_) {
        const toolExecutor = yield* _(EaToolExecutor);
        // Assumes EaToolExecutor takes AgentAction[] and returns ToolMessage[]
        const toolMessages = yield* _(toolExecutor.batch(actions));
        return { messages: toolMessages, pendingActions: [] }; // Clear pending actions
    });
};

// --- Conditional Edge Logic ---
const routeAfterAgentStep = (state: ReActAgentState): "executeTools" | "finish" => {
    // Route based on whether pendingActions were set by the pipeline step
    if (state.pendingActions && state.pendingActions.length > 0) {
        return "executeTools";
    }
    return "finish";
};

// --- Graph Definition ---
const reactPipelineWorkflow = new StateGraph({
    channels: { /* Define channels for ReActAgentState */
        messages: { value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y), default: () => [] },
        pendingActions: { value: (x?: ReadonlyArray<AgentAction>, y?: ReadonlyArray<AgentAction>) => y ?? x, default: () => undefined },
        finalOutput: { value: (x?: AgentFinish, y?: AgentFinish) => y ?? x, default: () => undefined },
    }
});

// Add nodes (assuming runtime handles Effect nodes)
reactPipelineWorkflow.addNode("agentStep", callReActStepNode as any);
reactPipelineWorkflow.addNode("executeTools", executeToolsNode as any);

reactPipelineWorkflow.setEntryPoint("agentStep");

reactPipelineWorkflow.addConditionalEdges("agentStep", routeAfterAgentStep, {
    executeTools: "executeTools",
    finish: END,
});

reactPipelineWorkflow.addEdge("executeTools", "agentStep"); // Loop back

export const pipelineReActAgentGraph = reactPipelineWorkflow.compile();
```

Okay, Paul. Let's proceed with **Stage 3: EA Runtime (Simple)** for the ReAct Agent.

**Goal:** Show the simplest way a developer runs the pipeline-based ReAct agent (`pipelineReActAgentGraph`) using the high-level `EffectiveAgentRuntime`.

**Step 3.1: Configure the Runtime (Conceptual)**

This happens once during application setup and needs to include all layers required directly or indirectly by the `pipelineReActAgentGraph` (which includes `ReActStepPipelineLayer` and `EaToolExecutorLayer`, plus their dependencies like `EaLlmProviderLayer`, `EaToolProviderLayer`, and the specific tool layers like `WeatherToolLayer`, `CalculatorToolLayer`).

```typescript
// src/app/runtime-setup.ts (Conceptual - Extended)
import { EffectiveAgentRuntime } from "@/ea/runtime";
// Import Layers for services used by pipelines/agents
import { EaOpenAiProviderLayer } from "@/ea/providers/openai.layer"; // LLM Provider
import { EaToolProviderLayer } from "@/ea/tool-provider.layer"; // Tool Provider (provides tool schemas/list)
import { WeatherToolLayer } from "@/tools/weather-tool.layer"; // Specific Tool
import { CalculatorToolLayer } from "@/tools/calculator-tool.layer"; // Specific Tool
import { ReActStepPipelineLayer } from "@/ea/pipelines/react-step/react-step.service"; // ReAct Pipeline
import { EaToolExecutorLayer } from "@/ea/tool-executor.layer"; // Tool Executor
import { AgentStoreLayer } from "@/agent-store/agent-store.service"; // Persistence
import { AgentRunnerLayer } from "@/agent-runner/agent-runner.service"; // Generic runner

// Developer configures the runtime, providing necessary layers/config
export const runtime = EffectiveAgentRuntime.configure({
    layers: [
        // Base providers needed by tools/pipelines
        EaOpenAiProviderLayer,
        WeatherToolLayer,
        CalculatorToolLayer,
        EaToolProviderLayer, // Provides info about available tools
        // Pipelines and Executors
        ReActStepPipelineLayer, // Depends on LLM & Tool Providers
        EaToolExecutorLayer, // Depends on specific Tool Layers
        // Core Runtime Services
        AgentStoreLayer,
        AgentRunnerLayer
    ]
    // Or use config objects...
});
```

**Step 3.2: Run the Agent**

The developer uses the configured `runtime` object with `invokeAgent`.

```typescript
// src/app/features/react-feature.ts (Example Usage - Stage 3)

import { HumanMessage } from "@langchain/core/messages";
import { runtime } from "@/app/runtime-setup"; // Import configured runtime
import { pipelineReActAgentGraph } from "@/agents/react-agent/pipeline-graph"; // Agent from Stage 2
import type { ReActAgentState } from "@/agents/react-agent/pipeline-graph"; // Import state type if needed

/**
 * Example function showing how to invoke the pipeline-based ReAct agent
 * using the simplified EffectiveAgentRuntime API.
 */
async function runReActAgentSimple(query: string): Promise<void> {
  console.log(`--- Stage 3: Running ReAct Agent via Runtime for: "${query}" ---`);
  const agentInput = { messages: [new HumanMessage(query)] };

  try {
    // Call the high-level runtime method.
    // The runtime handles Effect execution, Layer provision, AgentRunner interaction.
    // We expect the final state containing the result.
    const finalState = await runtime.invokeAgent<ReActAgentState>(
      pipelineReActAgentGraph,
      agentInput,
    );

    // Extract the final answer from the returned state object
    const finalOutput = finalState?.finalOutput?.returnValues?.output;

    if (finalOutput) {
        console.log("ReAct Agent Final Output:", finalOutput);
        // Update UI with the final answer
    } else {
        console.log("ReAct Agent did not produce a final output.", finalState);
        // Handle cases where the agent might have finished unexpectedly or errored
    }

  } catch (error) {
    // Handle errors thrown by the runtime's invokeAgent method
    console.error("Runtime invokeAgent failed:", error);
    // Update UI to show error
  }
}

// --- Example of calling this function ---
// runReActAgentSimple("What is the capital of France?");
// runReActAgentSimple("What is 15 plus 37?");
// runReActAgentSimple("Search for Elvis Presley's birthplace then calculate 11 * 12");

```

Okay, Paul. Let's proceed with **Stage 4: EA Runtime (Controlled)** for the ReAct Agent.

**Goal:** Demonstrate running the pipeline-based ReAct agent (`pipelineReActAgentGraph`) using the `EffectiveAgentRuntime` API with options for more control and using the `streamAgent` method to observe intermediate steps.

**Step 4.1: Define Richer API (Conceptual)**

*(Assume `AgentRunOptions` and `AgentRunResult` interfaces exist, and `streamAgent` yields structured chunks representing graph node outputs or specific events, as defined previously)*

**Step 4.2: Run with Options & Richer Result (Invoke)**

```typescript
// src/app/features/react-feature.ts (Example Usage - Stage 4 Invoke)

import { HumanMessage } from "@langchain/core/messages";
import { runtime } from "@/app/runtime-setup";
import { pipelineReActAgentGraph } from "@/agents/react-agent/pipeline-graph";
import type { ReActAgentState } from "@/agents/react-agent/pipeline-graph";
import type { AgentRunOptions, AgentRunResult } from "@/ea/runtime/runtime.contract";

/**
 * Example function showing invoking the ReAct agent with options
 * and processing a richer result object.
 */
async function runReActAgentWithControl(query: string): Promise<void> {
  console.log(`--- Stage 4: Running ReAct Agent via Runtime (Controlled) for: "${query}" ---`);
  const agentInput = { messages: [new HumanMessage(query)] };

  // Define options for this specific run
  const runOptions: AgentRunOptions = {
    configurable: { thread_id: `react-run-${Date.now()}` }, // Pass thread_id
    includeUsage: true,
    includeMetadata: true,
    includeHistory: true, // Request message history if runtime supports it
    // llmOptions: { modelName: "gpt-4" } // Example: Override model for this run
  };

  try {
    // Call runtime method with agent, input, and options
    // Expect the richer AgentRunResult containing the final ReActAgentState as output
    const { output, usage, metadata, history } = await runtime.invokeAgent<ReActAgentState>({
        agent: pipelineReActAgentGraph,
        input: agentInput,
        options: runOptions
    });

    // Process the richer result object
    const finalAnswer = output?.finalOutput?.returnValues?.output;
    console.log("ReAct Agent Final Output:", finalAnswer ?? "No output found.");

    if (usage) console.log("Usage Stats:", usage);
    if (metadata) console.log("Run Metadata:", metadata);
    if (history) console.log("Message History:", history); // Display steps if returned

  } catch (error) {
    console.error("Runtime invokeAgent failed:", error);
  }
}

// --- Example of calling this function ---
// runReActAgentWithControl("What is the capital of France and its current population?");

```

**Step 4.3: Streaming Example**

This is where the value is clearer for ReAct, as we can see the thought/action/observation steps.

```typescript
// src/app/features/react-feature.ts (Example Usage - Stage 4 Stream)

import { HumanMessage } from "@langchain/core/messages";
import { runtime } from "@/app/runtime-setup";
import { pipelineReActAgentGraph } from "@/agents/react-agent/pipeline-graph";
import type { AgentRunOptions } from "@/ea/runtime/runtime.contract";

/**
 * Example function showing streaming the ReAct agent execution
 * to observe intermediate steps.
 */
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
            // Process stream chunks - format depends heavily on AgentRunner implementation
            // Ideally, chunks identify the node and its output/state update
            // Example pseudo-processing based on node names:
            if (chunk?.agentStep) { // Output from the 'agentStep' node
                const aiMessage = chunk.agentStep.messages?.[0];
                if (aiMessage?._getType() === 'ai') {
                    if (aiMessage.tool_calls?.length) {
                        console.log(`\n🤖 Thought/Action: ${aiMessage.content} -> Tools: ${aiMessage.tool_calls.map((tc: any) => tc.name).join(', ')}`);
                    } else {
                        // Might be the final answer chunk from this node if finish was decided
                        console.log(`\n🤖 Final Answer Chunk: ${aiMessage.content}`);
                    }
                }
            } else if (chunk?.executeTools) { // Output from the 'executeTools' node
                 const observations = chunk.executeTools.messages?.map((m: any) => `[${m.tool_call_id}]: ${m.content}`).join('\n');
                 if (observations) {
                    console.log(`\n🛠️ Observation:\n${observations}`);
                 }
            } else {
                 // Log other chunk types or raw chunk for debugging
                 // console.log("\nRaw Chunk:", chunk);
                 process.stdout.write("."); // Generic progress
            }
        }
        console.log("\nReAct Stream finished.");

    } catch (error) {
        console.error("Runtime streamAgent failed:", error);
    }
}

// --- Example of calling this function ---
// streamReActAgentWithControl("Search for Elvis Presley's birthplace then calculate 11 * 12");
// streamReActAgentWithControl("What is the weather in Paris?");

```

**Key Takeaways for the Developer (Guidebook Explanation):**

*   **Control & Visibility:** The `options` parameter in `invokeAgent` and `streamAgent` allows fine-tuning execution (e.g., `thread_id`, potentially LLM params). `invokeAgent` can return richer metadata and usage stats when requested.
*   **Streaming for Insight:** `streamAgent` is particularly useful for complex processes like ReAct, allowing the developer to observe the agent's intermediate thoughts, actions (tool calls), and observations (tool results) as they happen.
*   **Structured Chunks (Ideal):** For streaming to be truly useful, the `AgentRunner`'s stream implementation should yield structured chunks that identify the source (e.g., which graph node produced it) and the relevant data (AI message, tool call, tool result, final state update).
*   **Abstraction Intact:** Even with more control and streaming, the developer still interacts with the high-level `runtime` API, avoiding direct Effect/Layer management.

This completes the four stages for the ReAct Agent example in the Guidebook draft. We've shown the progression from raw implementation to using EA Pipelines and finally interacting via the simplified EA Runtime API at two levels of detail.



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

