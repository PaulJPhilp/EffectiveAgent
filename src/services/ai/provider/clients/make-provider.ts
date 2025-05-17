import { AgentActivity, AgentActivityType } from "@/agent-runtime/types.js";
import { Message } from "@/schema.js";
import { WeatherService } from "@/services/weather/service.js";
import { Effect } from "effect";
import { ProviderClient } from "../client.js";
import { ProviderOperationError } from "../errors.js";
import type {
  GenerateEmbeddingsResult,
  GenerateImageResult,
  GenerateObjectResult,
  GenerateSpeechResult,
  GenerateTextResult,
  ModelCapability,
  ProviderChatOptions,
  ProviderGenerateEmbeddingsOptions,
  ProviderGenerateImageOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderGenerateTextOptions,
  ProviderTranscribeOptions,
  StreamingObjectResult,
  StreamingTextResult,
  ToolCallRequest,
  ToolDefinition,
  TranscribeResult
} from "../types.js";

const useMockProvider = process.env.USE_MOCK_PROVIDER === "true"

export const makeProvider = (name: string, initialCapabilities: ModelCapability[]) => {
  // Convert array to Set for O(1) lookups
  const capabilities = new Set(initialCapabilities);

  return Effect.gen(function* () {
    const provider = yield* ProviderClient;
    const weatherWorkflow = (activity: AgentActivity, state: any) =>
      Effect.gen(function* () {
        if (activity.type === AgentActivityType.COMMAND && activity.payload) {
          const weatherService = yield* WeatherService
          // Defensive: check if payload has a location property
          const city = typeof activity.payload === "object" && activity.payload && "location" in activity.payload
            ? (activity.payload as { location?: string }).location
            : undefined
          const weatherData = yield* weatherService.getForecast(city)
          return weatherData
        }
        return state
      })

    // Real implementation (to be filled in with real LLM API calls)
    const real = {
      validateToolInputs: (tools: ToolDefinition[]): Effect.Effect<void, ProviderOperationError> =>
        Effect.succeed(void 0),
      executeToolCalls: (toolCalls: ToolCallRequest[], tools: ToolDefinition[]): Effect.Effect<string[], ProviderOperationError> =>
        Effect.succeed([]),
      generateText: (input: string, options: ProviderGenerateTextOptions): Effect.Effect<GenerateTextResult, ProviderOperationError> =>
        provider.generateText(input, options).pipe(
          Effect.mapError(e =>
            e instanceof ProviderOperationError
              ? e
              : new ProviderOperationError({
                providerName: name,
                operation: "generateText",
                message: e instanceof Error ? e.message : String(e),
                module: "provider",
                method: "generateText"
              })
          )
        ),
      generateObject: <T>(input: string, options: ProviderGenerateObjectOptions<T>): Effect.Effect<GenerateObjectResult<T>, ProviderOperationError> =>
        provider.generateObject<T>(input, options).pipe(
          Effect.mapError(e =>
            e instanceof ProviderOperationError
              ? e
              : new ProviderOperationError({
                providerName: name,
                operation: "generateObject",
                message: e instanceof Error ? e.message : String(e),
                module: "provider",
                method: "generateObject"
              })
          )
        ),
      generateSpeech: (text: string, options: ProviderGenerateSpeechOptions): Effect.Effect<GenerateSpeechResult, ProviderOperationError> =>
        provider.generateSpeech(text, options).pipe(
          Effect.mapError(e =>
            e instanceof ProviderOperationError
              ? e
              : new ProviderOperationError({
                providerName: name,
                operation: "generateSpeech",
                message: e instanceof Error ? e.message : String(e),
                module: "provider",
                method: "generateSpeech"
              })
          )
        ),
      transcribe: (audio: ArrayBuffer, options: ProviderTranscribeOptions): Effect.Effect<TranscribeResult, ProviderOperationError> =>
        provider.transcribe(audio, options).pipe(
          Effect.mapError(e =>
            e instanceof ProviderOperationError
              ? e
              : new ProviderOperationError({
                providerName: name,
                operation: "transcribe",
                message: e instanceof Error ? e.message : String(e),
                module: "provider",
                method: "transcribe"
              })
          )
        ),
      generateImage: (prompt: string, options: ProviderGenerateImageOptions): Effect.Effect<GenerateImageResult, ProviderOperationError> =>
        provider.generateImage(prompt, options).pipe(
          Effect.mapError(e =>
            e instanceof ProviderOperationError
              ? e
              : new ProviderOperationError({
                providerName: name,
                operation: "generateImage",
                message: e instanceof Error ? e.message : String(e),
                module: "provider",
                method: "generateImage"
              })
          )
        ),
      generateEmbeddings: (texts: string[], options: ProviderGenerateEmbeddingsOptions): Effect.Effect<GenerateEmbeddingsResult, ProviderOperationError> =>
        provider.generateEmbeddings(texts, options).pipe(
          Effect.mapError(e =>
            e instanceof ProviderOperationError
              ? e
              : new ProviderOperationError({
                providerName: name,
                operation: "generateEmbeddings",
                message: e instanceof Error ? e.message : String(e),
                module: "provider",
                method: "generateEmbeddings"
              })
          )
        ),
      chat: (messages: Message[], options: ProviderChatOptions): Effect.Effect<GenerateTextResult, ProviderOperationError> =>
        provider.chat(messages, options).pipe(
          Effect.mapError(e =>
            e instanceof ProviderOperationError
              ? e
              : new ProviderOperationError({
                providerName: name,
                operation: "chat",
                message: e instanceof Error ? e.message : String(e),
                module: "provider",
                method: "chat"
              })
          )
        ),
      getModels: () => Effect.succeed([]),
      streamText: (input: string, options: ProviderGenerateTextOptions): Effect.Effect<StreamingTextResult, ProviderOperationError> =>
        Effect.fail(new ProviderOperationError({
          providerName: name,
          operation: "streamText",
          message: "Not implemented",
          module: "provider",
          method: "streamText"
        })),
      streamObject: <T>(input: string, options: ProviderGenerateObjectOptions<T>): Effect.Effect<StreamingObjectResult<T>, ProviderOperationError> =>
        Effect.fail(new ProviderOperationError({
          providerName: name,
          operation: "streamObject",
          message: "Not implemented",
          module: "provider",
          method: "streamObject"
        }))
    }

    // Mock implementation (current mock/stub logic)
    const mock = {
      validateToolInputs: (tools: ToolDefinition[]): Effect.Effect<void, ProviderOperationError> =>
        Effect.succeed(void 0),
      executeToolCalls: (toolCalls: ToolCallRequest[], tools: ToolDefinition[]): Effect.Effect<string[], ProviderOperationError> =>
        Effect.succeed([]),
      generateText: (input: string, options: ProviderGenerateTextOptions): Effect.Effect<GenerateTextResult, ProviderOperationError> =>
        Effect.succeed({ text: "mocked text", model: "mock-model", id: "mock-id-0", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }),
      generateObject: <T>(input: string, options: ProviderGenerateObjectOptions<T>): Effect.Effect<GenerateObjectResult<T>, ProviderOperationError> =>
        Effect.succeed({ object: { field1: "value1" } as unknown as T, model: "mock-model", id: "mock-id-0", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }),
      generateSpeech: (text: string, options: ProviderGenerateSpeechOptions): Effect.Effect<GenerateSpeechResult, ProviderOperationError> =>
        Effect.succeed({ audioData: "mock-audio", format: "mp3", parameters: {}, model: "mock-model", id: "mock-id-0", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }),
      transcribe: (audio: Buffer, options: ProviderTranscribeOptions): Effect.Effect<TranscribeResult, ProviderOperationError> =>
        Effect.succeed({ text: "mock transcription", duration: 1, parameters: {}, model: "mock-model", id: "mock-id-0", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }),
      generateImage: (prompt: string, options: ProviderGenerateImageOptions): Effect.Effect<GenerateImageResult, ProviderOperationError> =>
        Effect.succeed({ imageUrl: "mock-url", parameters: {}, model: "mock-model", id: "mock-id-0", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }),
      generateEmbeddings: (texts: string[], options: ProviderGenerateEmbeddingsOptions): Effect.Effect<GenerateEmbeddingsResult, ProviderOperationError> =>
        Effect.succeed({
          embeddings: [[0]],
          dimensions: 1,
          texts,
          parameters: {},
          model: "mock-model",
          id: "mock-id-0",
          timestamp: new Date(),
          finishReason: "stop",
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        }),
      chat: (messages: Message[], options: ProviderChatOptions): Effect.Effect<GenerateTextResult, ProviderOperationError> =>
        Effect.succeed({ text: "mocked chat", model: "mock-model", id: "mock-id-0", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }),
      getModels: () => Effect.succeed([]),
      streamText: (input: string, options: ProviderGenerateTextOptions): Effect.Effect<StreamingTextResult, ProviderOperationError> =>
        Effect.succeed({ chunk: "chunk1", text: "chunk1", isLast: true, currentTokenCount: 6, controller: { pause: () => { }, resume: () => { }, cancel: () => { }, isPaused: false }, id: "mock-id-0", model: "mock-model", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }),
      streamObject: <T>(input: string, options: ProviderGenerateObjectOptions<T>): Effect.Effect<StreamingObjectResult<T>, ProviderOperationError> =>
        Effect.succeed({ chunk: { field1: "value1" } as unknown as Partial<T>, object: { field1: "value1" } as unknown as Partial<T>, isLast: true, currentTokenCount: 1, controller: { pause: () => { }, resume: () => { }, cancel: () => { }, isPaused: false }, id: "mock-id-0", model: "mock-model", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } })
    }

    // Choose implementation based on flag
    return useMockProvider ? mock : real
  })
}