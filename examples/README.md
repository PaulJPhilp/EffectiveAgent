# Effect AI SDK Examples

This directory contains examples demonstrating the effect-ai-sdk features.

## Prerequisites

- Node.js 18+
- API keys for providers you want to test:
  - `OPENAI_API_KEY` for OpenAI models
  - `ANTHROPIC_API_KEY` for Anthropic models

## Node Examples

Located in `examples/node/`, these are standalone TypeScript scripts that can be run directly.

### Running Node Examples

```bash
# Install dependencies (from repo root)
pnpm install

# Run a streaming text example
cd examples/node
npx tsx stream-text.ts
```

## Next.js Edge Examples

Located in `examples/next-edge/`, these demonstrate Edge Runtime compatibility.

### Running Next.js Examples

```bash
# Install dependencies
cd examples/next-edge
pnpm install

# Start development server
pnpm dev

# Test the streaming endpoint
curl -X POST http://localhost:3000/api/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, tell me a joke!"}
    ]
  }'
```

## Vercel Deployment

To deploy Edge examples to Vercel:

1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
3. Deploy from the `examples/next-edge` directory

## Available Examples

### Milestone 1: Text Streaming
- `examples/node/stream-text.ts` - Node CLI streaming demo
- `examples/next-edge/app/api/stream/route.ts` - Edge API streaming endpoint
