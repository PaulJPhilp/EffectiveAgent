# Provider Service Architecture with Dependency Injection

## Overview
The Provider Service manages AI model providers and their configurations. This implementation uses dependency injection to manage dependencies between services, improving testability and maintainability.

## Key Components

### Dependency Injection Container
A lightweight container for managing service dependencies:
- `register(token, instance)`: Register an existing service instance
- `registerFactory(token, factory)`: Register a factory function for lazy initialization
- `resolve<T>(token)`: Resolve a service by its token

### Service Tokens
Unique symbols that identify services in the DI container:
```typescript
const SERVICE_TOKENS = {
  providerService: Symbol('providerService'),
  // Other service tokens
};
```

### Provider Configuration Service
Loads and manages provider configurations:
- Uses Zod for schema validation
- Provides access to provider configurations
- Supports environment-specific configurations

### Provider Service
Main service for model provider operations:
- Constructor injection for dependencies
- Direct provider instantiation
- Model configuration integration

## Implementation Details

### File Structure
```
src/shared/services/providers-new/
├── di/                         # Dependency Injection
│   ├── container.ts            # DI container implementation
│   ├── tokens.ts               # Service token definitions
│   └── index.ts                # DI exports
├── schemas/                    # Schema definitions
│   ├── providerConfig.ts       # Provider configuration schema
│   └── index.ts                # Schema exports
├── implementations/            # Provider implementations
│   ├── openaiProvider.ts       # OpenAI provider
│   ├── anthropicProvider.ts    # Anthropic provider
│   └── ...                     # Other providers
├── providerConfigurationService.ts  # Provider configuration service
├── providerService.ts          # Main provider service
├── types.ts                    # Type definitions
├── index.ts                    # Module exports
└── architecture.md             # This documentation
```

### Interfaces & Types

#### IProviderConfigurationService
```typescript
interface IProviderConfigurationService {
  loadConfigurations(): Promise<void>;
  getProviderConfig(providerId: string): Provider;
  getDefaultProviderConfig(): Provider;
  getAllProviderConfigs(): ReadonlyArray<Provider>;
  clearCache(): void;
}
```

#### IProviderService
```typescript
interface IProviderService {
  getProvider(name: string): Promise<unknown>;
  getProviderForModel(modelId: string): Promise<unknown>;
  validateProvider(provider: string): Promise<boolean>;
}
```

### Error Handling
- Provider-specific error types
- Descriptive error messages
- Error categorization

## Usage

### Basic Usage
```typescript
// Get the DI container
const bootstrap = new ServiceBootstrap(agentConfig);
const container = bootstrap.getContainer();

// Resolve the provider service
const providerService = container.resolve<IProviderService>(
  SERVICE_TOKENS.providerService
);

// Use the service
const provider = await providerService.getProvider('openai');
```

### Testing
The DI pattern simplifies testing:
```typescript
// Mock dependencies
const mockConfigService = {
  getProviderConfig: vi.fn(),
  // Other methods
};

// Create service with mocks
const service = new ProviderService(
  mockAgentConfig,
  mockConfigService,
  mockModelConfigService
);

// Test the service
test('getProvider returns correct provider', async () => {
  mockConfigService.getProviderConfig.mockReturnValue({
    id: 'openai',
    type: 'openai'
  });
  
  const provider = await service.getProvider('openai');
  expect(provider).toBeDefined();
});
```

## Benefits
1. **Decoupled Components**: Services interact through interfaces
2. **Simplified Testing**: Easy dependency mocking
3. **Lifecycle Management**: Controlled service instantiation
4. **Reduced Complexity**: Direct provider instantiation without factories 