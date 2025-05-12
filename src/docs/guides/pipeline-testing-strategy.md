# Pipeline Testing Strategy

This document outlines the testing strategy for pipelines in the EffectiveAgent project. The weather pipeline in `ea/pipelines/weather` serves as an exemplar for this approach.

## Overview

The pipeline testing strategy follows a multi-layered approach:

1. **Unit Tests**: Testing individual functions and services in isolation
2. **Integration Tests**: Testing how components work together with dependencies
3. **End-to-End (E2E) Tests**: Testing complete flows through the pipeline

## Test Structure

For each pipeline, create a `__tests__` directory containing at least three test files:

- `service.test.ts` - Unit tests for service implementation
- `integration.test.ts` - Integration tests for pipeline components
- `e2e.test.ts` - End-to-end tests for the complete pipeline

## Test Patterns

### Unit Tests

Unit tests focus on testing individual functions and methods in isolation:

```typescript
// Example unit test for a service method
describe("getWeather", () => {
  it("should return weather data for a valid location", async () => {
    // Arrange
    const input = { location: "New York" };
    
    // Act
    const result = await Effect.runPromise(service.getWeather(input));
    
    // Assert
    expect(result).toBeDefined();
    expect(result.location.name).toBe("New York");
  });
});
```

Key principles for unit tests:
- Test each function/method independently
- Mock external dependencies
- Verify correct behavior for valid inputs
- Test error handling for invalid inputs
- Use simple, direct assertions

### Integration Tests

Integration tests verify how components work together:

```typescript
// Example integration test with layers
it("should provide weather data through layer", async () => {
  // Setup layers
  const configLayer = Layer.succeed(ConfigContext, testConfig);
  const serviceLayer = ServiceLive(testConfig);
  const combinedLayers = Layer.merge(configLayer, serviceLayer);
  
  // Create effect
  const program = Effect.gen(function* () {
    const service = yield* Service;
    return yield* service.method(input);
  });
  
  // Run with layers
  const result = await Effect.runPromise(
    program.pipe(Effect.provide(combinedLayers))
  );
  
  // Verify
  expect(result).toBeDefined();
});
```

Key principles for integration tests:
- Test the interaction between components
- Use Layer composition to provide dependencies
- Test with realistic configurations
- Verify data flows correctly through the system
- Test different component combinations

### End-to-End Tests

E2E tests validate complete flows through the pipeline:

```typescript
// Example E2E test
it("should process a complete request flow", async () => {
  // Arrange: Set up all necessary layers
  const allLayers = Layer.merge(configLayer, serviceLayer, otherLayers);
  
  // Create a program that tests the complete flow
  const program = Effect.gen(function* () {
    // Step 1: First operation
    const firstResult = yield* firstOperation(input);
    
    // Step 2: Second operation using first result
    const finalResult = yield* secondOperation(firstResult);
    
    return finalResult;
  });
  
  // Act: Run the complete program
  const result = await Effect.runPromise(program.pipe(Effect.provide(allLayers)));
  
  // Assert: Verify the complete flow worked
  expect(result).toMatchExpectedOutput();
});
```

Key principles for E2E tests:
- Test the complete pipeline flow
- Use realistic inputs and configurations
- Verify end results match expectations
- Test performance/timing aspects
- Handle resource cleanup with beforeAll/afterAll

## Test Utilities

Use the test harness utilities from `src/services/test-harness`:

- `createTypedMock`: For creating type-safe mocks
- `mockService`: For providing mock services
- `withResource`: For managing test resources

Example usage:

```typescript
// Create type-safe mock
const mockWeatherService = createTypedMock<WeatherServiceApi>({
  getWeather: () => Effect.succeed(mockWeatherData),
  getWeatherSummary: () => Effect.succeed("Mock weather summary")
});

// Create mock layer
const mockLayer = mockService(WeatherService, mockWeatherService);
```

## Mocking Strategies

For pipeline testing, employ these mocking strategies:

1. **Built-in Mocks**: Use the `makeXxxTest` functions provided by services
2. **Mock Services**: Create mock implementations of service interfaces
3. **Mock Layers**: Use Layer.succeed() to provide mock implementations
4. **Mock Effects**: Use Effect.succeed() and Effect.fail() for testing happy/error paths

## Testing External APIs

For services that interact with external APIs (like the weather API):

1. **Test Mode**: Create a "test mode" or mock implementation in the service
2. **Fixtures**: Use static fixtures for API responses
3. **Dependency Injection**: Replace real API calls with mock implementations
4. **Error Simulation**: Test error handling by simulating API failures

## Error Testing

Test both happy paths and error scenarios:

```typescript
it("should handle invalid input gracefully", async () => {
  // Arrange
  const invalidInput = { /* invalid data */ };
  
  // Act & Assert
  await expect(Effect.runPromise(
    service.method(invalidInput)
  )).rejects.toThrow(ExpectedError);
});
```

## Common Test Patterns

### Configuration Testing

```typescript
it("should respect configuration values", async () => {
  // Setup with specific config
  const configWithCustomValues = { /* custom config */ };
  const configLayer = Layer.succeed(ConfigContext, configWithCustomValues);
  
  // Program that uses config
  const program = Effect.gen(function* () {
    const config = yield* ConfigContext;
    const service = yield* Service;
    return yield* service.method(input);
  });
  
  // Verify config was applied
  const result = await Effect.runPromise(
    program.pipe(Effect.provide(Layer.merge(configLayer, serviceLayer)))
  );
  
  expect(result).toReflectConfig(configWithCustomValues);
});
```

### Performance Testing

```typescript
it("should complete within acceptable time", async () => {
  const startTime = Date.now();
  
  await Effect.runPromise(/* operation */);
  
  const executionTime = Date.now() - startTime;
  expect(executionTime).toBeLessThan(acceptableTimeMs);
});
```

## Test Coverage Targets

Pipeline tests should aim for:

- **Unit Tests**: 85%+ statement coverage
- **Integration Tests**: Cover all main service interactions
- **E2E Tests**: Cover all primary user flows

## Best Practices

1. **Isolate Tests**: Each test should be independent and not rely on state from other tests
2. **Clear Arrangement**: Use the Arrange-Act-Assert pattern for clarity
3. **Descriptive Names**: Use descriptive test names that explain the expected behavior
4. **Clean Resources**: Clean up any resources created during tests
5. **Test Real Behavior**: Avoid testing implementation details; focus on behavior
6. **Mock Judiciously**: Only mock what's necessary; prefer integration when practical
7. **Test Error Paths**: Test both success and failure scenarios

## Example: Weather Pipeline Tests

The weather pipeline in `ea/pipelines/weather` demonstrates this testing approach with:

- `service.test.ts`: Tests the core weather service implementation
- `integration.test.ts`: Tests layer composition and service integration
- `e2e.test.ts`: Tests complete flows from input to weather summary

These examples serve as templates for testing other pipelines in the `ea/pipelines` folder.

## Example: Chat App Integration Tests

The chat app integration tests in `src/__tests__/integration/chat-app` demonstrate testing WebSocket-based agent interactions:

### Mock WebSocket Testing

The chat app tests use `MockWebSocketServer` to simulate real-time agent interactions:

```typescript
function createMockAgentRuntimeWithTools() {
    // Set up mock tools (weather, time, etc.)
    const testTools = HashMap.make(
        ["weather:get", weatherTool] as const,
        ["time:get", timeTool] as const
    )

    // Create tool registry with mock tools
    const toolRegistryData = new ToolRegistryData({
        tools: testTools,
        toolkits: HashMap.empty()
    })

    // Create mock runtime implementation
    const mockRuntime = {
        send: (agentRuntimeId: string, activity: AgentActivity) => {
            // Mock message handling logic
        },
        subscribe: (agentRuntimeId: string) => {
            // Mock subscription logic
        }
    }

    return {
        service: mockRuntime,
        layer: Layer.succeed(ToolRegistryDataTag, toolRegistryData)
    }
}
```

Key testing patterns demonstrated:
- Using `MockWebSocketServer` for WebSocket communication testing
- Creating mock tools with Effect-based implementations
- Simulating agent runtime behavior with canned responses
- Testing tool registry integration
- Managing test scopes and cleanup

The chat app tests show how to:
1. Set up mock WebSocket servers
2. Create test tools with Effect implementations
3. Simulate agent runtime behavior
4. Test real-time message handling
5. Manage test resources and cleanup

These patterns can be applied when testing other real-time agent interactions in the system.