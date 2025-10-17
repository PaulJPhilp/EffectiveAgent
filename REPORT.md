# effect-ai-sdk vs Vercel AI SDK v5 (stable) — Parity Report

Generated: 2025-10-16
Vercel AI SDK tag: v5.1.0-beta.28 (latest stable v5 series)

## Executive summary

The effect-ai-sdk is currently in early development as an Effect-TS wrapper around Vercel AI SDK v4. It provides basic text and object generation capabilities with provider abstraction, but lacks many core features available in Vercel AI SDK v5 stable.

**Overall parity assessment:** ~20% feature parity. Core text/object generation works but streaming, tools, agents, and multimedia capabilities are missing.

**Top P0 gaps:**
1. Streaming support (text and object generation)
2. Tool/function calling with multi-tool orchestration
3. Agentic loops and stateful multi-turn dialogs

**Quick wins (Low complexity, high impact):**
- Add streaming wrappers around existing generateText/generateObject
- Basic tool calling support
- Vision support for OpenAI/Anthropic

**Risks:**
- effect-ai-sdk uses Vercel AI SDK v4 while v5 has significant API changes
- Multimedia features (image, audio) are experimental in v5 but may stabilize
- Agent API is still evolving in v6 beta

## Capability matrix

| Feature | Vercel v5 Support | effect-ai-sdk Support | Parity Status | Notes |
|--------|--------------------|-----------------------|---------------|-------|
| Core text generate (sync) | Full | Full | AtParity | Both support basic text generation |
| Text streaming (server-side stream, client consumption) | Full | None | Gap | streamText not implemented |
| Tool/function calling (single tool, multi-tool, parallel tools) | Full | None | Gap | No tool support yet |
| Tool streaming/partial tool invocation | Full | None | Gap | Requires streaming + tools |
| Structured outputs / schema validation (Zod/JSON Schema/TypeScript types) | Full | Full | AtParity | Both support Zod schemas |
| Images (generation, transforms, providers) | Partial (experimental) | None | Gap | experimental_generateImage not wrapped |
| Audio TTS (providers, formats, streaming) | Partial (experimental) | None | Gap | experimental_generateSpeech not wrapped |
| Audio STT (providers, streaming) | Partial (experimental) | None | Gap | experimental_transcribe not wrapped |
| Vision (image understanding) | Full (via providers) | None | Gap | No vision model support exposed |
| Providers: OpenAI | Full | Full | AtParity | Both support OpenAI API |
| Providers: Anthropic | Full | Full | AtParity | Both support Anthropic API |
| Providers: Google | Full | Full | AtParity | Both support Google API |
| Providers: Grok (xAI) | Full | Full | AtParity | Both support xAI/Grok API |
| Providers: Azure OpenAI | Full | Full | AtParity | Both support Azure OpenAI |
| Providers: Other (DeepSeek, Perplexity, etc.) | Full | Full | AtParity | Both support extensive provider list |
| Node runtime | Full | Full | AtParity | Both support Node.js 18+ |
| Edge runtime | Full | Unknown | Gap | Edge compatibility not verified |
| Error handling idioms | Full | Partial | Gap | Basic error types but missing advanced handling |
| Observability hooks (events, logging, tracing) | Full | None | Gap | No telemetry/observability integration |
| Retries/backoff | Full | None | Gap | No built-in retry mechanisms |
| Agentic loops/state | Partial (BasicAgent) | None | Gap | No agent orchestration |
| SDK ergonomics | Full | Partial | Gap | Effect wrapper provides some benefits but limited feature set |

Legend:
- Vercel/effect support: Full | Partial | None
- Parity Status: AtParity | Gap | Ahead

## Gaps by priority

### P0
- **Streaming support for text and object generation**
  - Complexity: Medium
  - Summary: Server-side streaming for real-time text/object generation responses
  - Rationale (market impact): Streaming is critical for interactive AI applications, chat interfaces, and real-time user experiences. Most Vercel AI SDK usage involves streaming.
  - Providers affected: All (OpenAI, Anthropic, Google, Grok, Azure OpenAI)
  - Runtime: Node, Edge
  - Recommended implementation steps:
    1. Add streamText and streamObject wrappers similar to generateText/generateObject
    2. Implement Effect.Stream return types
    3. Add streaming-specific error handling
    4. Update input/output types for streaming results
  - Risks/unknowns: Edge runtime streaming compatibility needs verification
  - Example (code stub):
    ```ts
    // Add to ai-operations.ts
    export function streamTextWithModel(
      model: LanguageModelV1,
      input: EffectiveInput,
      options?: Partial<StreamTextOptions>
    ): Effect.Effect<Stream.Stream<StreamingTextChunk, AiSdkOperationError | AiSdkMessageTransformError>> {
      return Effect.gen(function* () {
        const messages = yield* toVercelMessages(input.messages || []);
        const result = yield* Effect.tryPromise({
          try: () => streamText({ model, messages, ...options }),
          catch: (error) => new AiSdkOperationError({ ... })
        });
        return result.toDataStreamResponse().body; // Adapt to Effect.Stream
      });
    }
    ```

- **Tool/function calling with multi-tool orchestration**
  - Complexity: High
  - Summary: Support for defining and executing tools/functions during generation
  - Rationale (market impact): Tools are fundamental to agentic AI applications. Without tool calling, effect-ai-sdk cannot support RAG, function calling, or complex agent workflows.
  - Providers affected: OpenAI, Anthropic, Google, Grok
  - Runtime: Node, Edge
  - Recommended implementation steps:
    1. Add tool definition types and schema conversion
    2. Implement tool execution orchestration loop
    3. Add tool result message transformation
    4. Support both single and multi-tool calling
    5. Handle tool approval/denial workflows
  - Risks/unknowns: Complex interaction with Effect's execution model
  - Example (code stub):
    ```ts
    export function generateTextWithTools(
      model: LanguageModelV1,
      input: EffectiveInput,
      tools: Tool[],
      options?: GenerateTextOptions
    ): Effect.Effect<EffectiveResponse<GenerateTextResult>, AiSdkOperationError> {
      // Implement tool calling loop
      // Similar to existing generateText but with tool orchestration
    }
    ```

- **Agentic loops / stateful multi-turn dialogs**
  - Complexity: High
  - Summary: BasicAgent support for stateful, multi-turn conversations with tool integration
  - Rationale (market impact): Agents are a key value proposition of Vercel AI SDK v5. Without agents, effect-ai-sdk cannot compete for complex AI application development.
  - Providers affected: All tool-supporting providers
  - Runtime: Node, Edge
  - Recommended implementation steps:
    1. Implement BasicAgent wrapper
    2. Add agent state management types
    3. Support agent configuration and lifecycle
    4. Integrate with existing tool and streaming capabilities
  - Risks/unknowns: Agent API is still evolving (BasicAgent vs Agent in v6)
  - Example (code stub):
    ```ts
    export function createBasicAgent(
      config: BasicAgentSettings
    ): Effect.Effect<BasicAgent, AiSdkConfigError> {
      return Effect.gen(function* () {
        const agent = yield* Effect.tryPromise({
          try: () => new BasicAgent(config),
          catch: (error) => new AiSdkConfigError({ ... })
        });
        return agent;
      });
    }
    ```

### P1
- **Image generation support**
  - Complexity: Low
  - Summary: Wrapper for experimental_generateImage
  - Rationale (market impact): Image generation is widely used and expected in modern AI SDKs
  - Providers affected: OpenAI (DALL-E), other providers as they add support
  - Runtime: Node
  - Recommended implementation steps:
    1. Add generateImage wrapper
    2. Update provider factory for image models
    3. Add image-specific types
  - Risks/unknowns: API is experimental and may change
  - Example (code stub):
    ```ts
    export function generateImageWithModel(
      model: ImageModelV1,
      prompt: string,
      options?: GenerateImageOptions
    ): Effect.Effect<EffectiveResponse<GenerateImageResult>, AiSdkOperationError> {
      return Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () => experimental_generateImage({ model, prompt, ...options }),
          catch: (error) => new AiSdkOperationError({ ... })
        });
        return { data: result, ... };
      });
    }
    ```

- **Audio TTS support**
  - Complexity: Low
  - Summary: Text-to-speech generation
  - Rationale (market impact): Audio capabilities are increasingly important for accessible AI applications
  - Providers affected: OpenAI, ElevenLabs (via provider support)
  - Runtime: Node
  - Recommended implementation steps:
    1. Add generateSpeech wrapper
    2. Update provider factory for speech models
  - Risks/unknowns: Limited provider support currently
  - Example (code stub):
    ```ts
    export function generateSpeechWithModel(
      model: SpeechModelV1,
      input: string,
      options?: GenerateSpeechOptions
    ): Effect.Effect<EffectiveResponse<GenerateSpeechResult>, AiSdkOperationError> {
      // Similar pattern to image generation
    }
    ```

- **Audio STT support**
  - Complexity: Low
  - Summary: Speech-to-text transcription
  - Rationale (market impact): Multimodal AI requires audio input processing
  - Providers affected: OpenAI (Whisper), AssemblyAI, etc.
  - Runtime: Node
  - Recommended implementation steps:
    1. Add transcribe wrapper
    2. Support audio file input types
  - Risks/unknowns: Audio file handling complexity
  - Example (code stub):
    ```ts
    export function transcribeAudio(
      model: TranscriptionModelV1,
      audio: File | Uint8Array,
      options?: TranscribeOptions
    ): Effect.Effect<EffectiveResponse<TranscribeResult>, AiSdkOperationError> {
      // Implementation
    }
    ```

- **Vision support for existing providers**
  - Complexity: Low
  - Summary: Image understanding capabilities for vision-enabled models
  - Rationale (market impact): Vision is critical for multimodal AI applications
  - Providers affected: OpenAI (GPT-4 Vision), Anthropic (Claude Vision), Google (Gemini Vision)
  - Runtime: Node, Edge
  - Recommended implementation steps:
    1. Expose vision-enabled models in provider factory
    2. Update message types to support image content
  - Risks/unknowns: Image content handling in messages
  - Example (code stub):
    ```ts
    // Extend EffectiveMessage to support image parts
    interface VisionMessage extends EffectiveMessage {
      content: Array<TextPart | ImagePart>;
    }
    ```

### P2
- **Observability hooks and telemetry**
  - Complexity: Medium
  - Summary: Built-in logging, tracing, and monitoring
  - Rationale (market impact): Enterprise adoption requires observability
  - Providers affected: All
  - Runtime: Node, Edge
  - Recommended implementation steps:
    1. Integrate OpenTelemetry support
    2. Add configurable logging hooks
  - Risks/unknowns: Performance impact of telemetry
  - Example (code stub):
    ```ts
    export interface ObservabilityConfig {
      tracer?: Tracer;
      logger?: Logger;
      metrics?: Metrics;
    }
    ```

- **Advanced error handling and retry mechanisms**
  - Complexity: Medium
  - Summary: Circuit breakers, exponential backoff, structured error types
  - Rationale (market impact): Production reliability requirements
  - Providers affected: All
  - Runtime: Node, Edge
  - Recommended implementation steps:
    1. Add retry policies
    2. Implement circuit breaker pattern
    3. Extend error types
  - Risks/unknowns: Interaction with Effect's error handling
  - Example (code stub):
    ```ts
    export function withRetry<T>(
      effect: Effect.Effect<T, AiSdkOperationError>,
      policy: RetryPolicy
    ): Effect.Effect<T, AiSdkOperationError> {
      // Implementation
    }
    ```

## API differences and proposed shims

The current effect-ai-sdk aims to be capability-compatible with Vercel AI SDK v5, providing Effect-TS benefits (type safety, composability, error handling) while maintaining similar ergonomics.

**Key differences:**
- Effect-based API vs promise-based
- Unified EffectiveInput/EffectiveResponse types vs Vercel-specific types
- Provider factory pattern vs direct provider instantiation

**Drop-in compatibility:** Not currently achievable due to Effect wrapper, but thin shim layers could be provided for migration.

**Proposed shims for high-impact APIs:**
```ts
// Shim to provide Vercel-like API
export function generateText(
  args: { model: any; messages?: any[]; prompt?: string; system?: string }
): Promise<any> {
  return Effect.runPromise(
    generateTextWithModel(args.model, { messages: args.messages, text: args.prompt }, { system: args.system })
  );
}
```

## Acceptance criteria

P0 features must demonstrate:
- Full API compatibility with Vercel AI SDK v5
- TypeScript compilation without errors
- Successful execution on Node 18+ and Vercel Edge Runtime
- Proper error handling and Effect integration
- Comprehensive test coverage
- Documentation with examples
