# @org_name/effect-ai-model-sdk

Effect-native AI SDK providing Vercel AI SDK v5 equivalent capabilities for the AI Platform.

This library provides a low-level, type-safe interface for AI model interactions using Effect-TS, equivalent to Vercel AI SDK v5.

## Features

- Chat completions with streaming
- Structured data generation  
- Embeddings
- Image generation
- Speech generation and transcription (planned)
- Tool calling support
- Provider-agnostic design
- Comprehensive error handling
- Telemetry integration

## Installation

```bash
bun add @org_name/effect-ai-model-sdk
```

## Usage

```typescript
import { generateText, createProvider } from "@org_name/effect-ai-model-sdk"
import { Effect } from "effect"

// Create provider
const provider = createProvider("openai", { apiKey: "your-key" })

// Generate text
const result = await Effect.runPromise(
  generateText(provider, { text: "Hello, AI!" })
)
```

## API

See the [API documentation](./docs/api.md) for detailed usage.

## Development

```bash
bun install
bun run build
bun run test
```

## License

MIT
