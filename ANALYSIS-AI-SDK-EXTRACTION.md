# Analysis: AI SDK Communication Layer Extraction

## Executive Summary

This document analyzes the existing EffectiveAgent communication layer to inform the design of the `@effective-agent/ai-sdk` package. The analysis covers current patterns, architecture, and recommendations for extraction.

## Current Architecture Overview

### 1. **Service Hierarchy**

```
┌─────────────────────────────────────────────────────────┐
│                   Producer Services                      │
│  (TextService, ObjectService, ChatService, etc.)       │
│                                                         │
│  - High-level business logic                           │
│  - State management (generation history, counts)       │
│  - Schema validation                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                   ProviderService                        │
│                                                         │
│  - Provider registry and discovery                     │
│  - Provider client factory                             │
│  - Health checks                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                   ProviderClientApi                      │
│  (OpenAI, Anthropic, Google, etc.)                     │
│                                                         │
│  - Vercel AI SDK integration                           │
│  - Message transformation                              │
│  - Tool calling orchestration                          │
│  - Error mapping                                       │
└─────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                   Vercel AI SDK v4                       │
│  (generateText, generateObject, etc.)                  │
└─────────────────────────────────────────────────────────┘
```

### 2. **Key Patterns Identified**

#### A. **Effect-First Architecture**
All operations return `Effect.Effect<A, E, R>`:
- `A`: Success type (e.g., `EffectiveResponse<GenerateTextResult>`)
- `E`: Error type (e.g., `ProviderOperationError | ProviderServiceConfigError`)
- `R`: Context requirements (e.g., `ModelServiceApi | ToolRegistryService`)

#### B. **Provider Abstraction**
```typescript
interface ProviderClientApi {
  generateText: (input: EffectiveInput, options) => Effect<...>
  generateObject: <T>(input: EffectiveInput, options) => Effect<...>
  chat: (input: EffectiveInput, options) => Effect<...>
  generateEmbeddings: (...) => Effect<...>
  generateImage: (...) => Effect<...>
  transcribe: (...) => Effect<...>
  generateSpeech: (...) => Effect<...>
}
```

#### C. **Unified Input/Output Types**
- **Input**: `EffectiveInput` - Contains text, messages (Chunk), and metadata
- **Output**: `EffectiveResponse<T>` - Contains data, usage, finishReason, metadata
- **Provider Output**: `ProviderEffectiveResponse<T>` - Extends with optional effectiveMessage

#### D. **Message Transformation**
Two-way transformation between:
- **EA Format**: `EffectiveMessage` with typed `Part` chunks (Text, ToolCall, ToolResult)
- **Vercel Format**: `CoreMessage` with role and content/tool_calls

#### E. **Tool Calling Pattern**
Multi-iteration loop (MAX_TOOL_ITERATIONS = 5):
1. Send messages to LLM with tool definitions
2. If tool calls returned:
   - Validate tool inputs using Effect Schema → Zod conversion
   - Execute tools via ToolRegistryService
   - Append tool results as new messages
   - Loop back to step 1
3. If no tool calls, return final response

#### F. **Orchestration Integration**
Provider client operations wrapped with `OrchestratorService.execute()`:
```typescript
return orchestrator.execute(
  Effect.gen(function* () {
    // ... operation logic
  }),
  OPENAI_GENERATE_TEXT_CONFIG // timeout, retries, circuit breaker
);
```

#### G. **Schema Handling**
- **Effect Schema → Zod**: For tool parameter validation
- **Effect Schema → Standard Schema**: For `generateObject` (v5 support)
- Usage of `S.standardSchemaV1()` for Vercel AI SDK compatibility

### 3. **Core Types & Interfaces**

#### Input Types
```typescript
class EffectiveInput {
  text: string
  messages: Chunk<EffectiveMessage>
  metadata?: {
    operationName?: string
    parameters?: BaseProviderParameters
    providerMetadata?: Record<string, unknown>
  }
}

interface BaseProviderOptions {
  modelId: string
  signal?: AbortSignal
  parameters?: BaseProviderParameters
}

interface BaseProviderParameters {
  maxTokens?: number
  temperature?: number
  topP?: number
  topK?: number
  presencePenalty?: number
  frequencyPenalty?: number
  seed?: number
  stop?: string[]
}
```

#### Output Types
```typescript
interface GenerateTextResult extends GenerateBaseResult {
  text: string
  reasoning?: string
  reasoningDetails?: ReasoningDetail[]
  sources?: Source[]
  messages?: ResponseMessage[]
  warnings?: Warning[]
  toolCalls?: ToolCallRequest[]
}

interface GenerateObjectResult<T> extends GenerateBaseResult {
  object: T
}

interface GenerateBaseResult {
  id: string
  model: string
  timestamp: Date
  finishReason: FinishReason
  usage: EffectiveUsage
}

interface EffectiveResponse<T> {
  data: T
  metadata: any
  usage?: EffectiveUsage
  finishReason?: FinishReason
}
```

#### Error Types
```typescript
class ProviderOperationError extends EffectiveError
class ProviderServiceConfigError extends EffectiveError
class ProviderNotFoundError extends EffectiveError
class ProviderToolError extends EffectiveError
class ProviderMissingCapabilityError extends EffectiveError
class ProviderMissingModelIdError extends EffectiveError
```

### 4. **Provider Implementations**

Current providers (all in `src/services/ai/provider/clients/`):
- `openai-provider-client.ts` (most complete, 963 lines)
- `anthropic-provider-client.ts`
- `google-provider-client.ts`
- `deepseek-provider-client.ts`
- `perplexity-provider-client.ts`
- `qwen-provider-client.ts`
- `xai-provider-client.ts`

Each implements the full `ProviderClientApi` interface.

### 5. **Vercel AI SDK Usage**

Current imports from `"ai"`:
```typescript
import {
  generateText,
  generateObject,
  experimental_generateImage as generateImage,
  experimental_generateSpeech as generateSpeech,
  experimental_transcribe as transcribe,
  embedMany,
  type CoreMessage as VercelCoreMessage,
  type LanguageModelV1,
} from "ai";
```

Provider creation (e.g., OpenAI):
```typescript
import { createOpenAI } from "@ai-sdk/openai";
const openaiProvider = createOpenAI({ apiKey });
const modelInstance = openaiProvider(modelId);
```

## Extraction Boundaries

### What SHOULD Go in `@effective-agent/ai-sdk`

#### Core Communication Layer ✅
1. **Vercel AI SDK Integration**
   - `generateText` wrapper
   - `generateObject` wrapper
   - `streamText` wrapper
   - `streamObject` wrapper
   - `embedMany` wrapper
   - `generateImage` wrapper (experimental)
   - `generateSpeech` wrapper (experimental)
   - `transcribe` wrapper (experimental)

2. **Provider Client Factory**
   - Factory function to create provider instances
   - Provider registry (name → client factory)
   - API key management (env var handling)

3. **Message Transformation**
   - `EffectiveMessage` ↔ `CoreMessage` conversion
   - Part handling (Text, ToolCall, ToolResult)

4. **Schema Conversion**
   - Effect Schema → Zod conversion
   - Effect Schema → Standard Schema conversion (for v5)

5. **Core Types**
   - `EffectiveInput`
   - `EffectiveResponse<T>`
   - `ProviderEffectiveResponse<T>`
   - `GenerateTextResult`
   - `GenerateObjectResult<T>`
   - `GenerateBaseResult`
   - All provider operation options types
   - `FinishReason` type

6. **Error Types**
   - `AiSdkOperationError`
   - `AiSdkConfigError`
   - `AiSdkProviderError`
   - `AiSdkSchemaError`

7. **Effect Services**
   - `AiSdkService` - Main service for AI operations
   - `ProviderFactoryService` - Provider instantiation

### What SHOULD NOT Go in `@effective-agent/ai-sdk`

#### Business Logic ❌
1. **High-Level Producer Services**
   - `TextService`, `ObjectService`, `ChatService`
   - State management (generation history, counts)
   - Agent lifecycle management

2. **Model Management**
   - `ModelService` - Model registry and capabilities
   - Model validation and discovery

3. **Policy & Orchestration**
   - `PolicyService` - Usage policies, rate limits
   - `OrchestratorService` - Retry, timeout, circuit breaker
   - `ResilienceService` - Resilience patterns

4. **Tool System**
   - `ToolRegistryService` - Tool discovery and registration
   - `ToolService` - Tool execution
   - Tool calling orchestration loop

5. **Configuration**
   - `ConfigurationService` - Config file loading
   - Provider configuration files (providers.json)

## Proposed API Surface for `@effective-agent/ai-sdk`

### Core Service

```typescript
// packages/effect-aisdk/src/index.ts

export interface AiSdkServiceApi {
  /**
   * Generate text using a language model
   */
  readonly generateText: (
    provider: LanguageModelV1,
    input: EffectiveInput,
    options: GenerateTextOptions
  ) => Effect.Effect<
    EffectiveResponse<GenerateTextResult>,
    AiSdkOperationError
  >;

  /**
   * Generate a structured object using a language model
   */
  readonly generateObject: <T>(
    provider: LanguageModelV1,
    input: EffectiveInput,
    options: GenerateObjectOptions<T>
  ) => Effect.Effect<
    EffectiveResponse<GenerateObjectResult<T>>,
    AiSdkOperationError | AiSdkSchemaError
  >;

  /**
   * Generate embeddings for text inputs
   */
  readonly generateEmbeddings: (
    provider: EmbeddingModelV1,
    inputs: string[],
    options?: GenerateEmbeddingsOptions
  ) => Effect.Effect<
    EffectiveResponse<GenerateEmbeddingsResult>,
    AiSdkOperationError
  >;

  /**
   * Stream text generation
   */
  readonly streamText: (
    provider: LanguageModelV1,
    input: EffectiveInput,
    options: StreamTextOptions
  ) => Stream.Stream<
    StreamingTextChunk,
    AiSdkOperationError
  >;

  /**
   * Stream object generation
   */
  readonly streamObject: <T>(
    provider: LanguageModelV1,
    input: EffectiveInput,
    options: StreamObjectOptions<T>
  ) => Stream.Stream<
    StreamingObjectChunk<T>,
    AiSdkOperationError | AiSdkSchemaError
  >;
}
```

### Provider Factory Service

```typescript
export interface ProviderFactoryApi {
  /**
   * Create a provider client instance
   */
  readonly createProvider: (
    providerName: ProviderName,
    apiKey: string
  ) => Effect.Effect<
    ProviderClient,
    AiSdkConfigError
  >;

  /**
   * Get a model instance from a provider
   */
  readonly getModel: (
    provider: ProviderClient,
    modelId: string
  ) => Effect.Effect<
    LanguageModelV1,
    AiSdkProviderError
  >;
}

type ProviderName = "openai" | "anthropic" | "google" | "deepseek" | "perplexity" | "qwen" | "xai";

interface ProviderClient {
  readonly name: ProviderName;
  readonly languageModel: (modelId: string) => LanguageModelV1;
  readonly textEmbedding?: (modelId: string) => EmbeddingModelV1;
  readonly image?: (modelId: string) => ImageModelV1;
  readonly speech?: (modelId: string) => SpeechModelV1;
  readonly transcription?: (modelId: string) => TranscriptionModelV1;
}
```

### Message Transformation

```typescript
export interface MessageTransformerApi {
  /**
   * Convert EffectiveMessage to Vercel CoreMessage
   */
  readonly toVercelMessage: (
    message: EffectiveMessage
  ) => CoreMessage;

  /**
   * Convert Vercel CoreMessage to EffectiveMessage
   */
  readonly toEffectiveMessage: (
    message: CoreMessage,
    modelId: string
  ) => EffectiveMessage;

  /**
   * Batch convert messages
   */
  readonly toVercelMessages: (
    messages: Chunk<EffectiveMessage>
  ) => CoreMessage[];
}
```

### Schema Conversion

```typescript
export interface SchemaConverterApi {
  /**
   * Convert Effect Schema to Zod schema (for tool parameters)
   */
  readonly toZodSchema: <A, I>(
    schema: Schema.Schema<A, I>
  ) => Effect.Effect<
    z.ZodType<A>,
    AiSdkSchemaError
  >;

  /**
   * Convert Effect Schema to Standard Schema (for generateObject)
   */
  readonly toStandardSchema: <A, I>(
    schema: Schema.Schema<A, I>
  ) => Effect.Effect<
    StandardSchemaV1<A, I>,
    AiSdkSchemaError
  >;
}
```

## Migration Strategy

### Phase 1: Create Package Structure ✅ (COMPLETE)
- Create `packages/effect-aisdk/` directory
- Set up package.json, tsconfig.json
- Configure monorepo workspace
- Add path alias

### Phase 2: Extract Core Types
1. Move types from `src/types.ts`:
   - `EffectiveInput`
   - `EffectiveResponse`
   - `ProviderEffectiveResponse`
   - `EffectiveUsage`
   - `FinishReason`
   - `GenerateBaseResult`

2. Move types from `src/services/ai/provider/types.ts`:
   - `GenerateTextResult`
   - `GenerateObjectResult`
   - `GenerateEmbeddingsResult`
   - `GenerateImageResult`
   - `GenerateSpeechResult`
   - `TranscribeResult`
   - All option types

3. Create new error types in `@effective-agent/ai-sdk/errors.ts`

### Phase 3: Extract Message Transformation
1. Move helper functions from provider clients:
   - `mapEAMessagesToVercelMessages`
   - `mapVercelMessageToEAEffectiveMessage`

2. Create `MessageTransformerService`

### Phase 4: Extract Schema Conversion
1. Move schema conversion functions:
   - `convertEffectSchemaToZodSchema`
   - `convertEffectSchemaToStandardSchema`

2. Create `SchemaConverterService`

### Phase 5: Extract Provider Factory
1. Move provider creation logic:
   - `createOpenAI`, `createAnthropic`, etc.
   - Provider client factories

2. Create `ProviderFactoryService`

### Phase 6: Extract Core AI Operations
1. Move core generation functions:
   - `generateText` wrapper
   - `generateObject` wrapper
   - `streamText` wrapper
   - `streamObject` wrapper
   - `embedMany` wrapper

2. Create `AiSdkService`

### Phase 7: Update Imports in Main Codebase
1. Update provider clients to use `@effective-agent/ai-sdk`
2. Update producer services to use new types
3. Remove duplicate code from old locations

## Key Design Decisions

### 1. **Provider-Agnostic Core**
The AI SDK package should not contain provider-specific logic beyond factory functions. Provider clients remain in the main codebase.

### 2. **Pure Communication Layer**
No business logic, state management, or orchestration. Pure functional wrappers around Vercel AI SDK.

### 3. **Effect-First API**
All operations return Effect types for composability and error handling.

### 4. **Schema Agnostic**
Support both Zod and Effect Schema through conversion utilities.

### 5. **Streaming Support**
First-class support for streaming via Effect Streams.

### 6. **Message Format**
`EffectiveMessage` remains the canonical format. Vercel `CoreMessage` is an implementation detail.

## Dependencies

### Runtime Dependencies
```json
{
  "dependencies": {
    "effect": "^3.16.9",
    "ai": "^4.3.16",
    "@ai-sdk/openai": "^1.3.22",
    "@ai-sdk/anthropic": "^1.2.12",
    "@ai-sdk/google": "^1.2.19",
    "@ai-sdk/deepseek": "^0.2.14",
    "@ai-sdk/perplexity": "^1.1.9",
    "@ai-sdk/xai": "^1.2.16",
    "zod": "^3.x"
  }
}
```

### Peer Dependencies
```json
{
  "peerDependencies": {
    "effect": "^3.0.0"
  }
}
```

## Success Criteria

1. ✅ Clean separation of communication layer from business logic
2. ✅ All provider clients can use `@effective-agent/ai-sdk` services
3. ✅ Zero breaking changes to external API
4. ✅ All tests pass after migration
5. ✅ Type safety maintained throughout
6. ✅ Documentation complete for new package

## Next Steps

1. **Review this analysis document** - Confirm extraction boundaries
2. **Create detailed API specifications** - Full TypeScript interfaces
3. **Begin Phase 2 extraction** - Start with core types
4. **Incremental migration** - One service at a time
5. **Test at each phase** - Ensure no regressions
6. **Update documentation** - As we go

---

**Document Status**: Draft for Review
**Last Updated**: 2025-10-13
**Author**: Claude (AI Assistant)
