# ImageService Agent

## Overview

The **ImageService** is an AI-powered image generation service implemented as an Agent using the **AgentRuntime** architecture. It provides methods for generating images from text prompts using various AI models and providers, with full state management and activity tracking capabilities.

## Architecture

### AgentRuntime Integration

The ImageService leverages the AgentRuntime system for:
- **State Management**: Tracks generation count, last generation, generation history, and runtime metadata
- **Activity Tracking**: Logs all generation commands and state changes for monitoring and debugging
- **Lifecycle Management**: Provides proper initialization and termination of agent resources
- **Concurrent Operations**: Handles multiple simultaneous image generation requests safely

### Agent State

```typescript
interface ImageAgentState {
    readonly generationCount: number
    readonly lastGeneration: Option.Option<GenerateImageResult>
    readonly lastUpdate: Option.Option<number>
    readonly generationHistory: ReadonlyArray<{
        readonly timestamp: number
        readonly modelId: string
        readonly size: string
        readonly promptLength: number
        readonly success: boolean
        readonly imageCount: number
    }>
}
```

## Features

### Core Capabilities
- **AI Image Generation**: Generate images from text prompts using models like DALL-E
- **Multiple Image Sizes**: Support for various dimensions (256x256, 512x512, 1024x1024, etc.)
- **Quality Control**: Standard and HD quality options
- **Style Control**: Natural and vivid style options
- **System Prompts**: Additional context and instructions for generation
- **Negative Prompts**: Specify what to exclude from generated images

### Agent Features
- **State Tracking**: Monitor generation count and history
- **Runtime Access**: Get access to underlying AgentRuntime for advanced operations
- **Activity Logging**: All operations logged as activities for debugging
- **Concurrent Safety**: Thread-safe operations with proper state management
- **Resource Cleanup**: Proper termination and cleanup of agent resources

## API Interface

### Core Methods

#### `generate(options: ImageGenerationOptions)`
Generates an image based on the provided options.

```typescript
const result = yield* imageService.generate({
    modelId: "dall-e-3",
    prompt: "A serene mountain landscape at sunset",
    size: "1024x1024",
    quality: "hd",
    style: "vivid",
    system: Option.some("Create a photorealistic image"),
    negativePrompt: "cartoon, anime, illustration",
    parameters: {
        temperature: 0.7
    }
});
```

### Agent Methods

#### `getAgentState()`
Returns the current agent state including generation count and history.

```typescript
const state = yield* imageService.getAgentState();
console.log(`Generated ${state.generationCount} images`);
```

#### `getRuntime()`
Returns the underlying AgentRuntime for advanced operations.

```typescript
const runtime = imageService.getRuntime();
const runtimeState = yield* runtime.getState();
```

#### `terminate()`
Cleanly terminates the agent and releases resources.

```typescript
yield* imageService.terminate();
```

## Configuration Options

### Image Generation Options

```typescript
interface ImageGenerationOptions {
    // Required
    modelId: string;           // e.g., "dall-e-3"
    prompt: string;           // Text description of desired image

    // Optional
    size?: string;            // Image dimensions
    quality?: string;         // "standard" | "hd"
    style?: string;          // "natural" | "vivid"
    system?: Option<string>; // System prompt/instructions
    negativePrompt?: string; // What to exclude
    n?: number;              // Number of images to generate

    // Advanced
    parameters?: {
        temperature?: number;
        // ... other model parameters
    };
    signal?: AbortSignal;    // For request cancellation
}
```

### Supported Image Sizes

```typescript
const ImageSizes = {
    SMALL: "256x256",
    MEDIUM: "512x512",
    LARGE: "1024x1024",
    WIDE: "1024x768",
    PORTRAIT: "768x1024"
} as const;
```

## Usage Examples

### Basic Image Generation

```typescript
import { Effect } from "effect";
import ImageService from "@/services/producers/image/service.js";

const generateImage = Effect.gen(function* () {
    const imageService = yield* ImageService;
    
    const result = yield* imageService.generate({
        modelId: "dall-e-3",
        prompt: "A cute cat wearing a hat",
        size: "512x512",
        system: Option.some("Generate a photorealistic image")
    });
    
    console.log("Image URL:", result.imageUrl);
    
    // Check agent state
    const state = yield* imageService.getAgentState();
    console.log(`Total generations: ${state.generationCount}`);
    
    // Cleanup
    yield* imageService.terminate();
    
    return result;
});
```

### Multiple Concurrent Generations

```typescript
const generateMultiple = Effect.gen(function* () {
    const imageService = yield* ImageService;
    
    const requests = [
        imageService.generate({
            modelId: "dall-e-3",
            prompt: "A red rose",
            size: "512x512"
        }),
        imageService.generate({
            modelId: "dall-e-3", 
            prompt: "A blue ocean",
            size: "1024x1024"
        }),
        imageService.generate({
            modelId: "dall-e-3",
            prompt: "A green forest",
            size: "768x1024"
        })
    ];
    
    const results = yield* Effect.all(requests, { concurrency: "unbounded" });
    
    console.log(`Generated ${results.length} images`);
    
    // Check final state
    const state = yield* imageService.getAgentState();
    console.log(`Agent state: ${state.generationCount} total generations`);
    
    yield* imageService.terminate();
    
    return results;
});
```

### Advanced Generation with Negative Prompts

```typescript
const advancedGeneration = Effect.gen(function* () {
    const imageService = yield* ImageService;
    
    const result = yield* imageService.generate({
        modelId: "dall-e-3",
        prompt: "A beautiful landscape with mountains and lakes",
        negativePrompt: "people, buildings, cars, urban",
        size: "1024x768",
        quality: "hd",
        style: "vivid",
        system: Option.some("Create a pristine natural landscape"),
        parameters: {
            temperature: 0.8
        }
    });
    
    console.log("Generated natural landscape:", result.imageUrl);
    
    yield* imageService.terminate();
    
    return result;
});
```

## Error Handling

The ImageService provides specific error types for different failure scenarios:

- **`ImageModelError`**: Invalid or unsupported model ID
- **`ImageProviderError`**: Provider-related failures (network, API, etc.)
- **`ImageSizeError`**: Invalid image size specification
- **`ImageGenerationError`**: General generation failures

```typescript
const handleErrors = Effect.gen(function* () {
    const imageService = yield* ImageService;
    
    const result = yield* Effect.either(
        imageService.generate({
            modelId: "invalid-model",
            prompt: "test image"
        })
    );
    
    if (Either.isLeft(result)) {
        const error = result.left;
        if (error instanceof ImageModelError) {
            console.log("Invalid model:", error.description);
        } else if (error instanceof ImageSizeError) {
            console.log("Invalid size:", error.description);
        }
        // Handle other error types...
    }
    
    yield* imageService.terminate();
});
```

## Dependencies

The ImageService requires these Effect layers:

```typescript
Effect.provide(ImageService.Default),
Effect.provide(AgentRuntimeService.Default),
Effect.provide(ModelService.Default),
Effect.provide(ProviderService.Default),
Effect.provide(ConfigurationService.Default),
Effect.provide(NodeFileSystem.layer)
```

## Testing

### Unit Tests
- Agent state management
- Error handling scenarios
- Parameter validation
- Lifecycle operations

### E2E Tests
- Real AI model integration
- Concurrent generation handling
- State persistence across operations
- Runtime monitoring

```typescript
// Example test
it("should track multiple generations correctly", async () => {
    const test = Effect.gen(function* () {
        const service = yield* ImageService;
        
        yield* service.generate({ modelId: "dall-e-3", prompt: "test 1" });
        yield* service.generate({ modelId: "dall-e-3", prompt: "test 2" });
        
        const state = yield* service.getAgentState();
        expect(state.generationCount).toBe(2);
        expect(state.generationHistory).toHaveLength(2);
        
        yield* service.terminate();
    });
    
    await Effect.runPromise(test.pipe(/* provide layers */));
});
```

## Performance Considerations

- **Concurrent Operations**: The agent safely handles multiple simultaneous requests
- **State Management**: Efficient tracking of generation history (limited to prevent memory issues)
- **Resource Cleanup**: Proper termination prevents resource leaks
- **Error Recovery**: Robust error handling with detailed error types

## Future Enhancements

- **Batch Generation**: Support for generating multiple images in a single request
- **Image Editing**: Integration with image editing capabilities
- **Custom Models**: Support for fine-tuned or custom image generation models
- **Image Analysis**: Integration with vision models for image understanding
- **Performance Metrics**: Enhanced monitoring and performance tracking
``` 