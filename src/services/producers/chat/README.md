# Chat Service

## Overview

The `ChatService` is an AgentRuntime-based service for generating AI chat completions using various AI models. It provides a robust, stateful, and monitored approach to chat generation with comprehensive error handling and activity tracking.

## Architecture

### AgentRuntime Integration

The service is built on the `AgentRuntime` architecture, providing:

- **State Management**: Tracks completion count, history, and last completion
- **Activity Tracking**: Logs all chat commands and state changes  
- **Lifecycle Management**: Proper initialization and cleanup
- **Error Recovery**: Comprehensive error handling and reporting

### Agent State

```typescript
interface ChatAgentState {
    readonly completionCount: number
    readonly lastCompletion: Option.Option<ChatCompletionResult>
    readonly lastUpdate: Option.Option<number>
    readonly completionHistory: ReadonlyArray<{
        readonly timestamp: number
        readonly modelId: string
        readonly inputLength: number
        readonly responseLength: number
        readonly success: boolean
        readonly finishReason: string
        readonly toolCallsCount: number
    }>
}
```

## Features

### Chat Completion Generation
- **Multi-model Support**: Works with any configured AI model
- **System Prompts**: Support for system-level instructions
- **Parameter Control**: Temperature, max tokens, and other generation parameters
- **Tool Calls**: Support for AI function calling
- **Abort Support**: Request cancellation via AbortSignal

### State Tracking
- **Completion History**: Tracks the last 20 completions with metadata
- **Usage Metrics**: Token usage and response timing
- **Success/Failure Tracking**: Monitors completion success rates
- **Model Usage**: Tracks which models are being used

### Error Handling
- **Typed Errors**: Specific error types for different failure modes
- **Provider Integration**: Handles provider-specific errors
- **Validation**: Input validation with clear error messages
- **Recovery**: Graceful degradation on failures

## Usage

### Basic Chat Completion

```typescript
import { ChatService } from "@/services/producers/chat";

const chatService = yield* ChatService;

const result = yield* chatService.generate({
    modelId: "gpt-4o",
    input: "Hello, how are you?",
    span: traceSpan,
    parameters: {
        temperature: 0.7,
        maxTokens: 1000
    }
});

console.log(result.data.content); // AI response
```

### With System Prompt

```typescript
const result = yield* chatService.generate({
    modelId: "gpt-4o",
    input: "What's the weather like?",
    system: "You are a helpful weather assistant.",
    span: traceSpan
});
```

### Legacy Create Method

```typescript
const result = yield* chatService.create({
    modelId: "gpt-4o",
    input: "Hello!",
    parameters: { temperature: 0.5 }
});
```

### Agent State Monitoring

```typescript
// Get current agent state
const state = yield* chatService.getAgentState();
console.log(state.completionCount);
console.log(state.completionHistory);

// Access agent runtime directly
const runtime = chatService.getRuntime();
const runtimeState = yield* runtime.getState();
```

### Cleanup

```typescript
// Terminate the agent when done
yield* chatService.terminate();
```

## Configuration

### Model Configuration

The service requires proper model configuration in `models.json`:

```json
{
    "models": [
        {
            "id": "gpt-4o",
            "name": "GPT-4 Omni",
            "provider": "openai",
            "capabilities": ["text-generation", "chat-completion"]
        }
    ]
}
```

### Provider Configuration

Provider settings in `providers.json`:

```json
{
    "providers": [
        {
            "name": "openai",
            "apiKeyEnvVar": "OPENAI_API_KEY",
            "baseUrl": "https://api.openai.com/v1"
        }
    ]
}
```

## Error Types

### `ChatInputError`
- **Cause**: Invalid or missing input text
- **Recovery**: Provide valid input text

### `ChatModelError`
- **Cause**: Model not found or inaccessible
- **Recovery**: Check model configuration and availability

### `ChatProviderError`
- **Cause**: Provider service issues
- **Recovery**: Check provider configuration and credentials

### `ChatCompletionError`
- **Cause**: General completion failures
- **Recovery**: Check input, model, and provider status

### `ChatParameterError`
- **Cause**: Invalid generation parameters
- **Recovery**: Use valid parameter ranges

## Testing

### Unit Tests
```bash
bun test src/services/pipeline/producers/chat/__tests__/service.test.ts
```

### E2E Tests (Real AI Models)
```bash
bun test src/services/pipeline/producers/chat/__tests__/chat-agent-e2e.test.ts
```

### Test Coverage
- Agent state management
- Concurrent completion handling
- Error scenarios
- Parameter validation
- Real model integration
- Abort signal handling

## Dependencies

### Required Services
- `AgentRuntimeService`: Agent lifecycle management
- `ModelService`: Model metadata and validation
- `ProviderService`: AI provider client access
- `ConfigurationService`: Configuration loading

### Layer Composition

```typescript
const ChatLayer = Layer.mergeAll(
    ChatService.Default,
    AgentRuntimeService.Default,
    ModelService.Default,
    ProviderService.Default,
    ConfigurationService.Default,
    NodeFileSystem.layer
);
```

## Performance Considerations

### State Management
- History limited to 20 entries to prevent memory growth
- State updates are atomic and consistent
- Activity tracking is asynchronous and non-blocking

### Concurrency
- Supports unlimited concurrent completions
- Each completion tracked independently
- State updates are thread-safe via AgentRuntime

### Resource Management
- Proper cleanup on termination
- AbortSignal support for request cancellation
- Automatic error recovery and logging

## Migration from Legacy Service

### Breaking Changes
1. Service now requires `AgentRuntimeService` dependency
2. Added agent state management methods
3. Enhanced error types with more context
4. Activity tracking for all operations

### Upgrade Steps
1. Add `AgentRuntimeService.Default` to layer dependencies
2. Update error handling to use new error types
3. Use agent state methods for monitoring
4. Call `terminate()` for proper cleanup

## Best Practices

1. **Always terminate agents** when done to prevent resource leaks
2. **Monitor agent state** for debugging and analytics
3. **Use proper error handling** with typed error checking
4. **Set appropriate timeouts** for long-running operations
5. **Use system prompts** for consistent AI behavior
6. **Validate inputs** before making completion requests
7. **Track usage metrics** for cost and performance monitoring

## Troubleshooting

### Common Issues

1. **Model not found**: Check model configuration and provider setup
2. **High latency**: Monitor agent state for performance patterns
3. **Memory growth**: Ensure proper agent termination
4. **Error rates**: Check completion history for failure patterns

### Debugging

```typescript
// Enable debug logging
const state = yield* chatService.getAgentState();
console.log("Completion count:", state.completionCount);
console.log("Recent completions:", state.completionHistory.slice(-5));

// Check runtime state
const runtime = chatService.getRuntime();
const runtimeState = yield* runtime.getState();
console.log("Agent runtime state:", runtimeState);
``` 