# Embedding Service

## Overview

The `EmbeddingService` is an AgentRuntime-based service for generating vector embeddings from text using AI models. It provides a robust, stateful, and monitored approach to embedding generation with comprehensive error handling and activity tracking.

## Architecture

### AgentRuntime Integration

The service is built on the `AgentRuntime` architecture, providing:

- **State Management**: Tracks embedding generation count, history, and last generation
- **Activity Tracking**: Logs all embedding commands and state changes  
- **Lifecycle Management**: Proper initialization and cleanup
- **Error Recovery**: Comprehensive error handling and reporting

### Agent State

```typescript
interface EmbeddingAgentState {
    readonly generationCount: number
    readonly lastGeneration: Option.Option<GenerateEmbeddingsResult>
    readonly lastUpdate: Option.Option<number>
    readonly generationHistory: ReadonlyArray<{
        readonly timestamp: number
        readonly modelId: string
        readonly textLength: number
        readonly dimensions: number
        readonly success: boolean
    }>
}
```

### Activity Types

The agent processes two types of activities:

1. **GenerateEmbeddingCommand**: Embedding generation requests
2. **StateUpdateCommand**: Agent state updates with generation results

## API

### Core Methods

#### `generate(options)`

Generates embeddings for the provided text using a specified model.

```typescript
const result = yield* embeddingService.generate({
    text: "The quick brown fox jumps over the lazy dog",
    modelId: "text-embedding-ada-002",
    parameters: {}
});
```

**Parameters:**
- `text`: The input text to generate embeddings for
- `modelId`: The model to use for generation
- `parameters`: Optional model-specific parameters

**Returns:** `GenerateEmbeddingsResult` containing:
- `embeddings`: Array of embedding vectors
- `dimensions`: Number of dimensions in each vector
- `texts`: Original input texts
- `model`: Model used for generation
- `timestamp`: Generation timestamp
- `usage`: Token usage statistics

### Agent Management Methods

#### `getAgentState()`

Returns the current agent state for monitoring and debugging.

```typescript
const state = yield* embeddingService.getAgentState();
console.log(`Generated ${state.generationCount} embeddings`);
```

#### `getRuntime()`

Returns the underlying `AgentRuntime` instance for advanced operations.

```typescript
const runtime = embeddingService.getRuntime();
const runtimeState = yield* runtime.getState();
```

#### `terminate()`

Terminates the embedding service agent and cleans up resources.

```typescript
yield* embeddingService.terminate();
```

## Usage Examples

### Basic Embedding Generation

```typescript
import { EmbeddingService } from "@/services/pipeline/producers/embedding";

const program = Effect.gen(function* () {
    const embeddingService = yield* EmbeddingService;
    
    const result = yield* embeddingService.generate({
        text: "Machine learning enables computers to learn from data",
        modelId: "text-embedding-ada-002"
    });
    
    console.log(`Generated ${result.dimensions}-dimensional embedding`);
    console.log(`Used ${result.usage.totalTokens} tokens`);
    
    yield* embeddingService.terminate();
});
```

### Concurrent Embedding Generation

```typescript
const program = Effect.gen(function* () {
    const embeddingService = yield* EmbeddingService;
    
    const texts = [
        "Artificial intelligence",
        "Machine learning",
        "Deep learning",
        "Natural language processing"
    ];
    
    const requests = texts.map(text =>
        embeddingService.generate({
            text,
            modelId: "text-embedding-ada-002"
        })
    );
    
    const results = yield* Effect.all(requests, { concurrency: "unbounded" });
    
    const state = yield* embeddingService.getAgentState();
    console.log(`Generated ${state.generationCount} embeddings concurrently`);
    
    yield* embeddingService.terminate();
});
```

### State Monitoring

```typescript
const program = Effect.gen(function* () {
    const embeddingService = yield* EmbeddingService;
    
    // Generate some embeddings
    yield* embeddingService.generate({
        text: "First embedding",
        modelId: "text-embedding-ada-002"
    });
    
    yield* embeddingService.generate({
        text: "Second embedding with much longer text content",
        modelId: "text-embedding-ada-002"
    });
    
    // Check agent state
    const state = yield* embeddingService.getAgentState();
    
    console.log(`Total generations: ${state.generationCount}`);
    console.log(`History entries: ${state.generationHistory.length}`);
    
    state.generationHistory.forEach((entry, index) => {
        console.log(`Generation ${index + 1}:`);
        console.log(`  Model: ${entry.modelId}`);
        console.log(`  Text length: ${entry.textLength}`);
        console.log(`  Dimensions: ${entry.dimensions}`);
        console.log(`  Success: ${entry.success}`);
    });
    
    yield* embeddingService.terminate();
});
```

## Error Handling

The service provides comprehensive error handling with specific error types:

- **`EmbeddingInputError`**: Invalid input text (empty or null)
- **`EmbeddingModelError`**: Model-related errors (invalid model ID)
- **`EmbeddingProviderError`**: Provider client errors
- **`EmbeddingGenerationError`**: General generation failures

```typescript
const program = Effect.gen(function* () {
    const embeddingService = yield* EmbeddingService;
    
    const result = yield* Effect.either(
        embeddingService.generate({
            text: "", // This will fail
            modelId: "text-embedding-ada-002"
        })
    );
    
    if (Either.isLeft(result)) {
        console.error(`Embedding failed: ${result.left.description}`);
    }
    
    yield* embeddingService.terminate();
});
```

## Performance and Monitoring

The agent automatically tracks:
- **Generation Count**: Total number of embeddings generated
- **Generation History**: Recent generation details (limited to last 20)
- **Text Metrics**: Input text length tracking
- **Timing**: Timestamp tracking for all operations
- **Success/Failure Rates**: Success tracking for reliability monitoring

## Dependencies

The service depends on:
- `AgentRuntimeService`: For agent runtime management
- `ModelService`: For model metadata and provider resolution
- `ProviderService`: For AI provider client access
- `ConfigurationService`: For configuration loading
- `NodeFileSystem`: For file system operations

## Testing

### Unit Tests
Located in `__tests__/embedding.service.test.ts`, covering:
- Basic embedding generation
- Concurrent operations
- Error handling
- Agent state management
- Lifecycle operations

### E2E Tests
Located in `__tests__/embedding-agent-e2e.test.ts`, covering:
- Real AI model integration
- Complex embedding scenarios
- Runtime state verification
- Performance validation

Run tests with:
```bash
bun test src/services/pipeline/producers/embedding
``` 