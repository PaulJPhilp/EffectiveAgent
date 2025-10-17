# Tool Calling Examples

This directory contains examples demonstrating the tool/function calling capabilities of effect-ai-sdk.

## Quick Start

### Prerequisites

```bash
export OPENAI_API_KEY=your_key_here
export ANTHROPIC_API_KEY=your_key_here  # Optional, for Anthropic examples
```

### Run Examples

```bash
# Multi-tool orchestration (calculator + web search)
npx tsx tools-multitool.ts

# Tool calling with OpenAI
npx tsx stream-text.ts  # Also streams text, which uses tools

# Single tool usage (coming in examples)
npx tsx tools-single.ts
```

## Examples

### tools-multitool.ts

Demonstrates multiple tools working together:

- **Calculator Tools**: add, subtract, multiply
- **Web Search Tool**: Mock search implementation
- **Orchestration**: Model chooses which tools to use and when

The example shows how the model can:
1. Break down a complex task into multiple steps
2. Call multiple tools in sequence
3. Use results from one tool call in the next

Output example:
```
🔧 Multi-Tool Orchestration Example

Test 1: Simple Calculation
──────────────────────────────────────
  ✖️  Computing 42 × 7
✅ Completed in 1 turn(s), reason: completed
   Tool calls made: 1
   Final result: 294
```

## Tool Definition

Use `defineTool` or `defineToolWithDescription` to create tools:

```typescript
import { z } from "zod";
import { defineTool, runTools } from "@effective-agent/ai-sdk";
import { openai } from "@ai-sdk/openai";

// Define a tool
const addTool = defineTool(
  "add",
  z.object({
    a: z.number(),
    b: z.number(),
  }),
  async (args) => args.a + args.b
);

// Or with description
const searchTool = defineToolWithDescription(
  "search",
  "Search the web for information",
  z.object({ query: z.string() }),
  async (args) => {
    // Your search logic
  }
);

// Run tools orchestration
const result = await runTools(
  openai("gpt-4o-mini"),
  [{ role: "user", content: "What is 5 plus 3?" }],
  [addTool],
  {
    maxTurns: 5,
    toolTimeout: 5000,
  }
);

console.log(result.toolCalls);     // All tool calls made
console.log(result.toolResults);   // All results
console.log(result.turnCount);     // Number of turns
```

## API Reference

### `defineTool(name, schema, handler)`

Creates a tool definition with handler.

- **name**: Tool name (used by the model)
- **schema**: Zod schema for tool arguments
- **handler**: Async function that executes the tool

Returns: `Tool`

### `defineToolWithDescription(name, description, schema, handler)`

Same as `defineTool` but with a description for the model.

### `runTools(model, messages, tools, options?)`

Orchestrate tools with a model.

**Parameters:**
- **model**: LanguageModelV1 from ai SDK
- **messages**: CoreMessage[] conversation history
- **tools**: Tool[] available tools
- **options?**: ToolCallingOptions
  - `maxTurns`: Max iterations (default: 5)
  - `toolTimeout`: Timeout per tool in ms (default: 30000)
  - `continueOnError`: Continue despite errors (default: true)
  - `onApproval`: Optional approval callback `(toolCall) => boolean`

**Returns:** `Promise<ToolOrchestrationResult>`

Result contains:
- `toolCalls`: All tool calls made
- `toolResults`: All results with errors if any
- `finalMessages`: Complete conversation history
- `turnCount`: Number of turns taken
- `reason`: "completed" | "max_turns" | "error" | "abort"

## Supported Schemas

Tools support multiple schema formats:

```typescript
import { z } from "zod";
import { Schema } from "effect";

// Zod schema
const zodSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
});

// Effect Schema
const effectSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
});

// JSON Schema object
const jsonSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "number" },
  },
  required: ["name"],
};

defineTool("example", zodSchema, handler);
defineTool("example", effectSchema, handler);
defineTool("example", jsonSchema, handler);
```

## Provider Support

### OpenAI
- ✅ Tool calling (function_call, tool_calls)
- ✅ Multi-tool support
- ✅ Streaming with tools

### Anthropic
- ✅ Tool use (tool_use, tool_result)
- ✅ Multi-tool support
- ✅ Streaming with tools (partial implementation)

## Error Handling

Tools handle errors gracefully:

```typescript
const result = await runTools(model, messages, tools, {
  continueOnError: true,  // Try next tool even if one fails
});

// Check for errors
result.toolResults.forEach((result) => {
  if (result.isError) {
    console.log(`Error in ${result.toolName}: ${result.error}`);
  }
});
```

## Advanced Patterns

### Approval Callback

Request user approval before executing tools:

```typescript
const result = await runTools(model, messages, tools, {
  onApproval: async (toolCall) => {
    console.log(`Execute tool: ${toolCall.toolName}?`);
    return true; // User approved
  },
});
```

### Tool Timeout

Set per-tool execution timeout:

```typescript
const result = await runTools(model, messages, tools, {
  toolTimeout: 10000, // 10 seconds per tool
});
```

### Max Turns

Limit the number of tool calling iterations:

```typescript
const result = await runTools(model, messages, tools, {
  maxTurns: 3, // Max 3 rounds of tool calls
});
```

## Testing

Run the test suite:

```bash
cd packages/effect-aisdk
pnpm test tools
```

## Known Limitations

- Tool streaming partial args (Milestone 3)
- Agent state management (Milestone 5)
- Vision/multimodal tool inputs (not yet implemented)
- Tool result compression for long outputs

## See Also

- [Streaming Examples](./stream-text.ts)
- [Agent Examples](./agent-basic.ts) - Coming in Milestone 5
- [Main README](../../packages/effect-aisdk/README.md)
