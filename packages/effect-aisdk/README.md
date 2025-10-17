# @effective-agent/ai-sdk

A standalone Effect-TS communication layer for AI operations, providing type-safe wrappers around the Vercel AI SDK.

## Features

- **Type-Safe AI Operations**: Effect wrappers for `generateText`, `generateObject`, `embedMany`
- **Streaming Support**: Unified streaming API for `streamText` and `streamObject`
- **Message Transformation**: Bidirectional conversion between `EffectiveMessage` and Vercel `CoreMessage`
- **Schema Conversion**: Utilities for Effect Schema ↔ Zod/Standard Schema
- **Provider Factory**: Create and manage AI provider instances (OpenAI, Anthropic, Google, etc.)
- **Error Handling**: Comprehensive error types with Effect integration

## Installation

```bash
pnpm add @effective-agent/ai-sdk
```

## Streaming

The package provides unified streaming APIs that work across providers and runtimes:

### streamText

```typescript
import { createProvider } from "@effective-agent/ai-sdk";
import { streamText } from "@effective-agent/ai-sdk";

const provider = createProvider("openai");
const model = provider.languageModel("gpt-4o-mini");

const streamHandle = streamText(model, {
  model: "gpt-4o-mini",
  temperature: 0.7,
  messages: [
    { role: "user", content: "Tell me a story" }
  ],
});

// Read from the stream
const reader = streamHandle.readable.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  if (value.type === "token-delta") {
    console.log(value.delta); // Stream tokens as they arrive
  }
}

// Or collect the final text
const fullText = await streamHandle.collectText();
```

### streamObject

```typescript
import { Schema } from "effect";
import { streamObject } from "@effective-agent/ai-sdk";

const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
});

const streamHandle = streamObject(model, {
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Create a person profile" }],
  schema: PersonSchema,
});

// Handle streaming object updates
await streamHandle.pipeToCallbacks({
  onMessagePart: (event) => {
    console.log("Partial object:", event.contentPart);
  },
  onFinalMessage: (event) => {
    console.log("Final result:", event.text);
  },
});
```

## Usage Examples

### Basic Text Generation

```typescript
import {
  createProvider,
  getLanguageModel,
  generateTextWithModel,
  type EffectiveInput,
} from "@effective-agent/ai-sdk";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  // Create provider
  const provider = yield* createProvider("openai", {
    apiKey: process.env.OPENAI_API_KEY!
  });

  // Get model
  const model = yield* getLanguageModel(provider, "gpt-4");

  // Generate text
  const input: EffectiveInput = {
    text: "Hello, AI!",
    messages: Chunk.empty()
  };

  const response = yield* generateTextWithModel(model, input);
  console.log(response.data.text);
});
```

### Structured Object Generation

```typescript
import { Schema } from "effect";
import { generateObjectWithModel } from "@effective-agent/ai-sdk";

const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
  email: Schema.String,
});

const program = Effect.gen(function* () {
  const response = yield* generateObjectWithModel(
    model,
    { text: "Create a person with name John, age 30" },
    PersonSchema
  );

  console.log(response.data.object); // { name: "John", age: 30, email: "..." }
});
```

## Tool Calling and Function Calling

The package provides unified APIs for defining and orchestrating tool calling across providers:

### Define Tools

```typescript
import { z } from "zod";
import { defineTool, defineToolWithDescription, runTools } from "@effective-agent/ai-sdk";
import { openai } from "@ai-sdk/openai";

// Simple tool definition
const addTool = defineTool(
  "add",
  z.object({ a: z.number(), b: z.number() }),
  async (args) => args.a + args.b
);

// Tool with description
const searchTool = defineToolWithDescription(
  "search",
  "Search the web for information",
  z.object({ query: z.string() }),
  async (args) => {
    // Your implementation
    return { results: [] };
  }
);
```

### Run Tools Orchestration

```typescript
const result = await runTools(
  openai("gpt-4o-mini"),
  [
    {
      role: "user",
      content: "What is 15 + 27? Then multiply the result by 3",
    },
  ],
  [addTool, multiplyTool],
  {
    maxTurns: 5,           // Max iterations
    toolTimeout: 30000,    // Timeout per tool
    continueOnError: true, // Continue if a tool fails
  }
);

// Access results
console.log(result.toolCalls);     // All tool calls
console.log(result.toolResults);   // All results
console.log(result.finalMessages); // Full conversation
console.log(result.turnCount);     // Number of turns
```

### Supported Schemas

Tools accept multiple schema formats:

- **Zod** (recommended): `z.object({ ... })`
- **Effect Schema**: `Schema.Struct({ ... })`
- **JSON Schema**: Raw objects with `type`, `properties`, `required`

### Advanced Options

```typescript
await runTools(model, messages, tools, {
  // Approve/deny tool calls
  onApproval: async (toolCall) => {
    console.log(`Execute ${toolCall.toolName}?`);
    return true; // User approved
  },
  
  // Other options
  maxTurns: 10,           // More turns for complex tasks
  toolTimeout: 5000,      // Shorter timeout for quick tools
  continueOnError: false, // Stop on first error
});
```

### Error Handling

```typescript
const result = await runTools(model, messages, tools);

// Check for errors
result.toolResults.forEach((result) => {
  if (result.isError) {
    console.error(`${result.toolName}: ${result.error}`);
  }
});

// Stop reason
if (result.reason === "max_turns") {
  console.log("Hit maximum turns limit");
}
```

## API Reference

### Core Functions

- `createProvider(name, config)` - Create an AI provider instance
- `getLanguageModel(provider, modelId)` - Get a language model instance
- `generateTextWithModel(model, input, options?)` - Generate text
- `generateObjectWithModel(model, input, schema, options?)` - Generate structured objects
- `generateEmbeddingsWithModel(model, texts)` - Generate embeddings
- `streamText(model, options)` - Stream text generation
- `streamObject(model, options)` - Stream object generation

### Tool Functions

- `defineTool(name, schema, handler)` - Create a tool
- `defineToolWithDescription(name, description, schema, handler)` - Create a tool with description
- `runTools(model, messages, tools, options?)` - Orchestrate tools with a model
- `runToolsWithMap(model, messages, toolsMap, options?)` - Alternative API using a tools map


### Types

- `EffectiveInput` - Input for AI operations
- `EffectiveResponse<T>` - Response wrapper with metadata
- `StreamHandle` - Streaming operation handle
- `UnifiedStreamEvent` - Normalized streaming event

## Supported Providers

- OpenAI (GPT models)
- Anthropic (Claude models)
- Google (Gemini models)
- Groq (fast inference)
- xAI (Grok models)
- DeepSeek
- Perplexity

## Error Handling

The package provides structured error types:

- `AiSdkOperationError` - Operation failures
- `AiSdkMessageTransformError` - Message conversion errors
- `AiSdkSchemaError` - Schema validation errors
- `AiSdkProviderError` - Provider configuration errors

All errors integrate with Effect's error handling system for composable error recovery.

## Examples

See the `examples/` directory for complete working examples:

- `examples/node/stream-text.ts` - Node.js streaming CLI
- `examples/next-edge/` - Vercel Edge Runtime examples
