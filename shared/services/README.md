# Shared Services Architecture

This directory contains the core services that power our AI-driven PDF processing system. Each service follows TypeScript best practices with strict type safety, comprehensive error handling, and thorough testing.

## Service Architecture

### Model Services
- `ModelService`: Core service for AI model interactions
  - Handles text completion, image generation, and embedding generation
  - Supports multiple model providers (OpenAI, Anthropic, Google)
  - Implements capability-based model selection
  - Uses strict type checking for all model operations

### Provider Services
- `ProviderFactory`: Factory for creating model providers
  - Supports OpenAI, Anthropic, and Google providers
  - Implements provider-specific configurations
  - Handles API authentication and rate limiting
  - Uses dependency injection for flexible testing

### Prompt Services
- `PromptService`: Manages prompt generation and completion
  - Supports customizable system prompts
  - Handles temperature and token limit configurations
  - Implements retry logic for failed completions
  - Uses composite types for parameter passing

- `PromptTemplateService`: Manages reusable prompt templates
  - Supports variable substitution in templates
  - Implements template validation
  - Provides default templates for common use cases
  - Uses strict type checking for template parameters

### Task Services
- `TaskService`: Manages task execution and configuration
  - Maps tasks to appropriate models
  - Handles task-specific configurations
  - Implements fallback strategies
  - Uses early returns for simplified logic

### Registry Services
- `ModelRegistryService`: Manages model configurations
  - Handles model capabilities and constraints
  - Supports dynamic model registration
  - Implements model selection strategies
  - Uses immutable configurations

- `TaskRegistryService`: Manages task configurations
  - Maps tasks to models
  - Handles task-specific requirements
  - Validates task configurations
  - Uses strict type checking

- `ProviderRegistryService`: Manages provider configurations
  - Handles provider-specific settings
  - Supports provider capabilities
  - Implements provider validation
  - Uses composite types

## Design Principles

1. **Type Safety**
   - Use TypeScript's type system extensively
   - Avoid `any` type
   - Create necessary interfaces and types
   - Use composite types over primitives

2. **Error Handling**
   - Use custom error classes
   - Implement comprehensive error messages
   - Handle edge cases explicitly
   - Use early returns

3. **Testing**
   - Comprehensive unit tests
   - Mock interfaces match original types
   - Clean test organization
   - Type-safe test data

4. **Code Organization**
   - Single responsibility principle
   - Interface-driven development
   - Dependency injection
   - Clean architecture patterns

## Usage Examples

### Model Service
```typescript
const modelService = new ModelService();

// Complete with specific model
const completion = await modelService.completeWithModel(
    { modelId: 'gpt-4' },
    { prompt: 'Hello', temperature: 0.7 }
);

// Generate image
const image = await modelService.generateImage({
    prompt: 'A beautiful sunset'
});

// Generate embeddings
const embedding = await modelService.generateEmbedding({
    text: 'Sample text'
});
```

### Prompt Service
```typescript
const promptService = new PromptService();

// Complete with template
const result = await promptService.completeWithTemplate({
    templateName: 'analysis',
    variables: { text: 'Sample text' }
});
```

### Task Service
```typescript
const taskService = new TaskService();

// Execute task
const result = await taskService.executeTask('analyze-text', {
    prompt: 'Analyze this text',
    temperature: 0.5
});
```

## Contributing

1. Follow TypeScript best practices
2. Maintain strict type safety
3. Write comprehensive tests
4. Document public APIs
5. Keep functions short (<20 lines)
6. Use early returns
7. Implement proper error handling
8. Follow existing patterns

## Testing

Run tests using:
```bash
bun test
```

All services have comprehensive test coverage using Vitest.
