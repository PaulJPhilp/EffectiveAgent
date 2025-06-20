# Object Service Agent

The ObjectService has been refactored to use the AgentRuntime architecture, providing enhanced state management, activity tracking, and monitoring capabilities for AI structured object generation.

## Overview

The ObjectService is now implemented as an Agent that:
- Uses `AgentRuntime` for state management and activity processing
- Tracks object generation history and statistics
- Provides real-time monitoring of structured object generation operations
- Uses Effect's built-in logging instead of LoggingService
- Maintains backward compatibility with the existing API

## Architecture Changes

### Agent State
The service now maintains state via `ObjectAgentState`:
```typescript
interface ObjectAgentState {
    readonly generationCount: number
    readonly lastGeneration: Option.Option<any>
    readonly lastUpdate: Option.Option<number>
    readonly generationHistory: ReadonlyArray<{
        readonly timestamp: number
        readonly modelId: string
        readonly schemaName: string
        readonly promptLength: number
        readonly objectSize: number
        readonly success: boolean
    }>
}
```

### Activity Tracking
All object generation operations are tracked as activities:
- `GENERATE_OBJECT` commands for generation requests
- `STATE_CHANGE` activities for state updates
- Activity metadata includes timing, schema info, and success metrics

### New API Methods
Additional methods for agent management:
- `getAgentState()` - Returns current agent state for monitoring
- `getRuntime()` - Returns the AgentRuntime instance for advanced operations
- `terminate()` - Properly terminates the agent

## Usage

### Basic Object Generation
The primary `generate()` method remains functional but with enhanced monitoring:
```typescript
const objectService = yield* ObjectService;

// Define your schema
const UserSchema = Schema.Struct({
    name: Schema.String,
    age: Schema.Number,
    email: Schema.String
});

// Generate structured object
const result = yield* objectService.generate({
    modelId: "gpt-4o",
    prompt: "Generate a user profile for John Doe, 30 years old",
    schema: UserSchema,
    system: Option.some("You are a data generator"),
    parameters: {
        temperature: 0.3
    }
});
```

### State Monitoring
Access current agent state:
```typescript
const state = yield* objectService.getAgentState();
console.log(`Generated ${state.generationCount} objects`);
console.log(`Last generation: ${Option.getOrElse(state.lastGeneration, () => "none")}`);
```

### Activity Tracking
Get the runtime for advanced monitoring:
```typescript
const runtime = objectService.getRuntime();
const runtimeState = yield* runtime.getState();
console.log(`Agent status: ${runtimeState.status}`);
```

## Schema Support

The service works with Effect Schema for type-safe object generation:
- Automatic schema validation
- Enhanced prompts with schema descriptions
- Type-safe return values
- Comprehensive error handling for validation failures

## Benefits

1. **State Management**: Automatic tracking of generation history and statistics
2. **Activity Logging**: All operations logged as structured activities
3. **Monitoring**: Real-time visibility into service performance and object generation
4. **Debugging**: Enhanced debugging capabilities through activity tracking
5. **Scalability**: Built-in support for concurrent operations
6. **Effect Integration**: Uses Effect's built-in logging and error handling
7. **Object Analytics**: Tracks schema names, object sizes, and generation success rates
8. **Schema Safety**: Robust validation ensuring generated objects match schemas

## Migration Notes

- Existing code using `generate()` method requires no changes
- New monitoring capabilities available through `getAgentState()`
- Agent should be terminated when no longer needed using `terminate()`
- Tests may need updating to account for AgentRuntime dependencies
- Schema validation is now more robust with detailed error reporting

## Error Handling

Enhanced error handling for:
- **ObjectInputError**: Invalid prompts or parameters
- **ObjectModelError**: Model-related issues
- **ObjectProviderError**: Provider client problems
- **ObjectSchemaError**: Schema validation failures
- **ObjectGenerationError**: General generation failures

## Dependencies

- `AgentRuntimeService` - For agent lifecycle management
- `ModelService` - For model metadata and provider mapping
- `ProviderService` - For AI provider client access
- Effect's built-in logging system (no external LoggingService needed) 