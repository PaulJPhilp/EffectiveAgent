# Text Service Agent

The TextService has been refactored to use the AgentRuntime architecture, providing enhanced state management, activity tracking, and monitoring capabilities.

## Overview

The TextService is now implemented as an Agent that:
- Uses `AgentRuntime` for state management and activity processing
- Tracks generation history and statistics
- Provides real-time monitoring of text generation operations
- Uses Effect's built-in logging instead of LoggingService
- Maintains backward compatibility with the existing API

## Architecture Changes

### Agent State
The service now maintains state via `TextAgentState`:
```typescript
interface TextAgentState {
    readonly generationCount: number
    readonly lastGeneration: Option.Option<string>
    readonly lastUpdate: Option.Option<number>
    readonly generationHistory: ReadonlyArray<{
        readonly timestamp: number
        readonly modelId: string
        readonly promptLength: number
        readonly outputLength: number
        readonly success: boolean
    }>
}
```

### Activity Tracking
All text generation operations are tracked as activities:
- `GENERATE_TEXT` commands for generation requests
- `STATE_CHANGE` activities for state updates
- Activity metadata includes timing and success metrics

### New API Methods
Additional methods for agent management:
- `getAgentState()` - Returns current agent state for monitoring
- `getRuntime()` - Returns the AgentRuntime instance for advanced operations
- `terminate()` - Properly terminates the agent

## Usage

### Basic Text Generation
The primary `generate()` method remains unchanged:
```typescript
const textService = yield* TextService;
const result = yield* textService.generate({
    modelId: "gpt-4o",
    prompt: "Tell me a story",
    system: Option.some("You are a helpful assistant")
});
```

### State Monitoring
Access current agent state:
```typescript
const state = yield* textService.getAgentState();
console.log(`Generated ${state.generationCount} texts`);
console.log(`Last generation: ${Option.getOrElse(state.lastGeneration, () => "none")}`);
```

### Activity Tracking
Get the runtime for advanced monitoring:
```typescript
const runtime = textService.getRuntime();
const runtimeState = yield* runtime.getState();
console.log(`Agent status: ${runtimeState.status}`);
```

## Benefits

1. **State Management**: Automatic tracking of generation history and statistics
2. **Activity Logging**: All operations logged as structured activities
3. **Monitoring**: Real-time visibility into service performance
4. **Debugging**: Enhanced debugging capabilities through activity tracking
5. **Scalability**: Built-in support for concurrent operations
6. **Effect Integration**: Uses Effect's built-in logging and error handling

## Migration Notes

- Existing code using `generate()` method requires no changes
- New monitoring capabilities available through `getAgentState()`
- Agent should be terminated when no longer needed using `terminate()`
- Tests may need updating to account for AgentRuntime dependencies

## Dependencies

- `AgentRuntimeService` - For agent lifecycle management
- `ModelService` - For model metadata and provider mapping
- `ProviderService` - For AI provider client access
- Effect's built-in logging system (no external LoggingService needed) 