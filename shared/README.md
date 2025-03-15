# Task-Driven Model Registry

This module provides a task-driven model registry for the persona generator. It allows you to configure different AI models for different tasks in the persona generation process.

## Overview

The task-driven model registry consists of the following components:

1. **Model Registry Configuration**: A JSON file that defines available models and task-to-model mappings.
2. **Model Registry Service**: A service that loads and manages the model registry configuration.
3. **Model Selection Factory**: A factory that selects the appropriate model for a given task.
4. **Model Provider Interface**: An interface for interacting with different AI model providers.
5. **Model Provider Factory**: A factory that creates model provider instances based on the selected model.
6. **Model Service**: A high-level service for the application to interact with AI models.

## Configuration

The model registry is configured using a JSON file (`modelRegistry.json`) with the following structure:

```json
{
  "models": [
    {
      "id": "model-id",
      "provider": "provider-name",
      "modelName": "actual-model-name",
      "maxTokens": 1000,
      "temperature": 0.5,
      "contextWindow": 4000,
      "costPer1kTokens": 0.01,
      "capabilities": ["text-generation", "chat"]
    }
  ],
  "taskMappings": [
    {
      "taskName": "task-name",
      "primaryModelId": "primary-model-id",
      "fallbackModelIds": ["fallback-model-id-1", "fallback-model-id-2"],
      "description": "Task description"
    }
  ],
  "defaultModelId": "default-model-id"
}
```

## Usage

### Basic Usage

```typescript
import { ModelService } from './services/modelService';

async function main() {
  // Initialize the model service
  const modelService = await ModelService.getInstance();
  
  // Use a task-specific model
  const result = await modelService.completeWithTaskModel('clustering', {
    prompt: 'Cluster these personas into groups based on similarities: [...]',
    systemPrompt: 'You are a helpful assistant that clusters personas into groups.'
  });
  
  console.log(result.text);
}
```

### Advanced Usage

```typescript
import { ModelSelectionFactory } from './services/modelSelectionFactory';
import { ModelProviderFactory } from './services/modelProviderFactory';

async function main() {
  // Get the model selection factory
  const modelSelectionFactory = await ModelSelectionFactory.getInstance();
  
  // Get the model provider factory
  const modelProviderFactory = await ModelProviderFactory.getInstance();
  
  // Select a model for a specific task
  const modelConfig = modelSelectionFactory.selectModelForTask('clustering');
  
  // Create a provider for the selected model
  const provider = modelProviderFactory.createProviderForModel(modelConfig);
  
  // Use the provider to complete a prompt
  const result = await provider.complete({
    prompt: 'Cluster these personas into groups based on similarities: [...]',
    systemPrompt: 'You are a helpful assistant that clusters personas into groups.'
  });
  
  console.log(result.text);
}
```

## Adding New Model Providers

To add a new model provider:

1. Create a new provider implementation that extends `BaseModelProvider`.
2. Register the provider implementation in `ModelProviderFactory`.

Example:

```typescript
// 1. Create provider implementation
export class AnthropicProvider extends BaseModelProvider {
  // Implementation details...
}

// 2. Register provider in ModelProviderFactory
ModelProviderFactory.instance.registerProviderImplementation('anthropic', AnthropicProvider);
```

## Adding New Tasks

To add a new task:

1. Add a new task mapping to the `modelRegistry.json` file.

Example:

```json
{
  "taskName": "new-task",
  "primaryModelId": "model-id",
  "fallbackModelIds": ["fallback-model-id"],
  "description": "New task description"
}
```

## Testing

Run the tests using Vitest:

```bash
bun test
``` 