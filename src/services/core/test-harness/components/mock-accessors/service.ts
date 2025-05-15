import { ModelCapability } from "@/schema.js"
import type { ModelServiceApi } from "@/services/ai/model/api.js"
import type { ProviderClientApi, ProviderServiceApi } from "@/services/ai/provider/api.js"
import { MissingModelIdError, ProviderConfigError, ProviderMissingCapabilityError, ProviderNotFoundError, ProviderOperationError } from "@/services/ai/provider/errors.js"
import { ProviderToolError } from "@/services/ai/provider/errors/tool.js"
import type { EffectiveProviderApi, GenerateEmbeddingsResult, GenerateImageResult, GenerateObjectResult, GenerateSpeechResult, GenerateTextResult, ProviderChatOptions, ProviderGenerateEmbeddingsOptions, ProviderGenerateImageOptions, ProviderGenerateObjectOptions, ProviderGenerateSpeechOptions, ProviderGenerateTextOptions, ProviderTranscribeOptions, TranscribeResult } from "@/services/ai/provider/types.js"
import type { EmbeddingServiceApi } from "@/services/pipeline/producers/embedding/api.js"
import { EmbeddingInputError } from "@/services/pipeline/producers/embedding/errors.js"
import type { ImageGenerationOptions as ApiImageGenerationOptions } from "@/services/pipeline/producers/image/api.js"
import type { ObjectServiceApi } from "@/services/pipeline/producers/object/api.js"
import { ObjectGenerationError, ObjectModelError, ObjectProviderError, ObjectSchemaError } from "@/services/pipeline/producers/object/errors.js"
import type { TextServiceApi } from "@/services/pipeline/producers/text/api.js"
import { EffectiveInput, EffectiveMessage, EffectiveResponse } from "@/types.js"
import type { LanguageModelV1 } from "@ai-sdk/provider"
import { Chunk, Effect, Layer } from "effect"
import type { MockAccessorApi } from "./api.js"

// --- Stores for captured arguments ---
const capturedArgs = {
  modelService: {
    getProviderName: undefined as { modelId: string } | undefined,
  },
  providerService: {
    getProviderClient: undefined as { providerName: string } | undefined,
  },
  providerClient: {
    generateEmbeddings: undefined as { texts: string[], params: any } | undefined,
  }
};

// --- Default Implementations ---

const defaultModelService: ModelServiceApi = {
  load: () => Effect.succeed({ models: [], name: "mock", version: "1.0" } as any),
  getProviderName: (modelId: string) => Effect.succeed("mock-provider"),
  findModelsByCapability: () => Effect.succeed([]),
  findModelsByCapabilities: () => Effect.succeed([]),
  getDefaultModelId: () => Effect.succeed("mock-model"),
  getModelsForProvider: () => Effect.succeed([]),
  validateModel: () => Effect.succeed(true),
  exists: (modelId: string) => Effect.succeed(true),
};

// defaultProviderClient aims to satisfy the more comprehensive ProviderClientApi expected by ProviderServiceApi
const defaultProviderClient: ProviderClientApi = {
  validateToolInput: (toolName: string, input: unknown) => Effect.succeed(input as any) as Effect.Effect<unknown, ProviderToolError>,
  executeTool: (toolName: string, input: unknown) => Effect.succeed({ result: "mock tool result" } as any) as Effect.Effect<unknown, ProviderToolError>,
  processToolResult: (toolName: string, result: unknown) => Effect.succeed({ formattedResult: "mock formatted result" } as any) as Effect.Effect<unknown, ProviderToolError>,
  chat: (input: EffectiveInput, options: ProviderChatOptions) => Effect.succeed({
    metadata: {},
    data: {
      text: "mock chat response",
      id: "chat-id-mock",
      model: options.modelId,
      timestamp: new Date(),
    },
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    finishReason: "stop"
  } as EffectiveResponse<GenerateTextResult>) as Effect.Effect<EffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderConfigError>,
  setVercelProvider: (vercelProvider: EffectiveProviderApi) => Effect.succeed(undefined) as Effect.Effect<void, ProviderConfigError>,
  getProvider: () => Effect.succeed({ name: "mock-provider-name", provider: "mock-provider-impl", capabilities: [] } as any) as Effect.Effect<EffectiveProviderApi, ProviderConfigError>,
  generateText: (input: EffectiveInput, options: ProviderGenerateTextOptions) => Effect.succeed({
    metadata: {},
    data: {
      text: "mock generated text",
      id: "text-gen-id-mock",
      model: options.modelId,
      timestamp: new Date(),
    },
    usage: { promptTokens: input.messages.length, completionTokens: 10, totalTokens: input.messages.length + 10 },
    finishReason: "stop"
  } as EffectiveResponse<GenerateTextResult>) as Effect.Effect<EffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError>,
  generateObject: <T = unknown>(input: EffectiveInput, options: ProviderGenerateObjectOptions<T>) => Effect.succeed({
    metadata: {},
    data: {
      object: { mockKey: "mockValue" } as T,
      id: "object-gen-id-mock",
      model: options.modelId,
      timestamp: new Date(),
    },
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    finishReason: "stop"
  } as unknown as EffectiveResponse<GenerateObjectResult<T>>) as Effect.Effect<EffectiveResponse<GenerateObjectResult<T>>, ProviderOperationError | ProviderConfigError>,
  generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) => Effect.succeed({
    metadata: {},
    data: {
      audioData: Buffer.from("mock speech data").toString("base64"),
      format: "mp3",
      id: "speech-gen-id-mock",
      model: options.modelId,
      timestamp: new Date(),
    },
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    finishReason: "stop"
  } as EffectiveResponse<GenerateSpeechResult>) as Effect.Effect<EffectiveResponse<GenerateSpeechResult>, ProviderOperationError | ProviderConfigError>,
  transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) => Effect.succeed({
    metadata: {},
    data: {
      text: "mock transcription text",
      id: "transcribe-id-mock",
      model: options.modelId,
      timestamp: new Date(),
    },
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    finishReason: "stop"
  } as EffectiveResponse<TranscribeResult>) as Effect.Effect<EffectiveResponse<TranscribeResult>, ProviderOperationError | ProviderConfigError>,
  generateEmbeddings: (textsInput: string[], options: ProviderGenerateEmbeddingsOptions) => Effect.succeed({
    metadata: {},
    data: {
      embeddings: textsInput.map(() => [0.1, 0.2, 0.3]),
      dimensions: 3,
      texts: textsInput,
      id: "default-emb-id",
      model: options?.modelId || "mock-client-model",
      timestamp: new Date(),
    },
    usage: {
      promptTokens: textsInput.length,
      completionTokens: 0,
      totalTokens: textsInput.length
    },
    finishReason: "stop"
  } as EffectiveResponse<GenerateEmbeddingsResult>) as Effect.Effect<EffectiveResponse<GenerateEmbeddingsResult>, ProviderOperationError | ProviderConfigError>,
  generateImage: (input: EffectiveInput, options: ProviderGenerateImageOptions) => Effect.succeed({
    metadata: {},
    data: {
      imageUrl: "mockBase64ImageData",
      id: "image-gen-id-mock",
      model: options.modelId,
      timestamp: new Date(),
    },
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    finishReason: "stop"
  } as EffectiveResponse<GenerateImageResult>) as Effect.Effect<EffectiveResponse<GenerateImageResult>, ProviderOperationError | ProviderConfigError>,
  getCapabilities: () => Effect.succeed(new Set<ModelCapability>(["text-generation"])) as Effect.Effect<Set<ModelCapability>, ProviderOperationError | ProviderConfigError>,
  getModels: () => Effect.succeed([]) as Effect.Effect<LanguageModelV1[], ProviderConfigError, ModelServiceApi>,
  getDefaultModelIdForProvider: (providerName: any, capability: ModelCapability) => Effect.succeed("mock-default-model-for-provider") as Effect.Effect<string, ProviderConfigError | MissingModelIdError>
};

const defaultProviderService: ProviderServiceApi = {
  load: () => Effect.succeed({ providers: [], name: "mock", description: "Mock provider file" } as any),
  getProviderClient: (providerName: string) => Effect.succeed(defaultProviderClient),
};

const mockAccessorServiceImplObject = {
  mockLanguageModelV1: {
    specificationVersion: 'v1',
    provider: 'mock-provider',
    modelId: 'mock-model',
    defaultObjectGenerationMode: 'json',
    doGenerate: async (options: any) => ({
      text: "This is a mock response from the language model",
      finishReason: "stop",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      rawCall: { rawPrompt: options.messages?.[0]?.content || "", rawSettings: {} }
    }),
    doStream: async () => ({
      stream: new ReadableStream(),
      rawCall: { rawPrompt: "", rawSettings: {} }
    })
  } as unknown as LanguageModelV1,
  mockModelService: {
    load: (...args) => defaultModelService.load(...args),
    getProviderName: (modelId: string) => {
      capturedArgs.modelService.getProviderName = { modelId };
      return defaultModelService.getProviderName(modelId);
    },
    findModelsByCapability: (...args) => defaultModelService.findModelsByCapability(...args),
    findModelsByCapabilities: (...args) => defaultModelService.findModelsByCapabilities(...args),
    getDefaultModelId: (...args) => defaultModelService.getDefaultModelId(...args),
    getModelsForProvider: (...args) => defaultModelService.getModelsForProvider(...args),
    validateModel: (...args) => defaultModelService.validateModel(...args),
    exists: (...args) => defaultModelService.exists(...args),
  } as ModelServiceApi,
  mockProviderService: {
    load: (...args) => defaultProviderService.load(...args),
    getProviderClient: (providerName: string) => {
      capturedArgs.providerService.getProviderClient = { providerName };
      const clientDefaults = defaultProviderService.getProviderClient(providerName);

      return clientDefaults.pipe(
        Effect.map(client => ({
          ...client,
          generateEmbeddings: (texts: string[], params: any) => {
            capturedArgs.providerClient.generateEmbeddings = { texts, params };
            return client.generateEmbeddings(texts, params);
          },
        }))
      ) as Effect.Effect<ProviderClientApi, ProviderNotFoundError | ProviderConfigError | ProviderOperationError>;
    },
  } as ProviderServiceApi,
  mockProducerServices: {
    mockEmbeddingService: {
      generate: ({ modelId, input, span }: { modelId: string; input: string | string[]; span?: unknown }) => {
        if (typeof input === "string" && input.trim() === "") {
          return Effect.fail(new EmbeddingInputError({ description: "Input cannot be empty", module: "EmbeddingService", method: "generate", input }));
        }
        if (Array.isArray(input) && input.every(str => typeof str === "string" && str.trim() === "")) {
          return Effect.fail(new EmbeddingInputError({ description: "Input array cannot contain only empty or whitespace strings", module: "EmbeddingService", method: "generate", input }));
        }
        return Effect.succeed({
          embeddings: Array.isArray(input) ? input.map(() => [0.1, 0.2, 0.3, 0.4, 0.5]) : [[0.1, 0.2, 0.3, 0.4, 0.5]],
          model: modelId || "default-embedding-model",
          timestamp: new Date(),
          id: "emb-123",
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
        } as any);
      }
    } as unknown as EmbeddingServiceApi,
    mockTextService: {
      generate: ({ modelId, prompt, system, span }: { modelId: string; prompt: string; system?: string; span?: unknown }) => {
        if (!modelId) {
          return Effect.fail(new Error("TextModelError: Model ID must be provided"));
        }

        return Effect.succeed({
          text: "This is a mock text generation response",
          model: modelId,
          timestamp: new Date(),
          id: "text-123",
          usage: {
            promptTokens: 10,
            completionTokens: 5,
            totalTokens: 15
          },
          finishReason: "stop"
        });
      }
    } as unknown as TextServiceApi,
    mockImageService: {
      generate: (options: ApiImageGenerationOptions) => {
        const { modelId, prompt, negativePrompt, system, size, quality, style, n, span } = options;

        if (!modelId) {
          return Effect.fail(new Error("ImageModelError: Model ID required"));
        }

        if (size && !['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'].includes(size)) {
          return Effect.fail(new Error("ImageSizeError: Invalid image size"));
        }

        const composedPrompt = [
          system ? `${system}` : "",
          prompt,
          negativePrompt ? `DO NOT INCLUDE: ${negativePrompt}` : ""
        ].filter(Boolean).join("\n");

        const result = {
          imageUrl: "https://example.com/test-image.jpg",
          model: modelId,
          timestamp: new Date(),
          id: "img-123",
          parameters: {
            size: size || "1024x1024",
            quality: quality || "standard",
            style: style || "natural"
          },
          additionalImages: typeof n === 'number' && n > 1 ? Array(n - 1).fill(0).map((_, i) => ({
            imageUrl: `https://example.com/test-image-${i + 2}.jpg`,
            id: `img-${i + 2}`
          })) : [],
          composedPrompt
        };

        return Effect.succeed(result);
      }
    },
    mockObjectService: {
      generate: ({ modelId, prompt, system, schema, span }: {
        modelId: string;
        prompt: string;
        system?: string;
        schema?: unknown;
        span?: unknown;
      }) => {
        if (!modelId) {
          return Effect.fail(
            new ObjectModelError({
              description: "Model ID must be provided",
              module: "ObjectService",
              method: "generate"
            })
          );
        }

        if (modelId === "provider-error") {
          return Effect.fail(
            new ObjectProviderError({
              description: "Failed to get provider client",
              module: "ObjectService",
              method: "generate",
              cause: { providerName: "test-provider" } as any
            })
          );
        }

        if (modelId === "generation-error") {
          return Effect.fail(
            new ObjectGenerationError({
              description: "Object generation failed",
              module: "ObjectService",
              method: "generate"
            })
          );
        }

        if (modelId === "schema-error") {
          return Effect.fail(
            new ObjectSchemaError({
              description: "Generated object does not match schema",
              module: "ObjectService",
              method: "generate",
              validationErrors: []
            })
          );
        }

        return Effect.succeed({
          data: {
            name: "John Doe",
            age: 30,
            email: "john@example.com"
          },
          model: modelId,
          timestamp: new Date(),
          id: "obj-123",
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150
          }
        });
      }
    } as unknown as ObjectServiceApi,
    mockTranscriptionService: {
      transcribe: ({ modelId, audioData, language, prompt, span }: {
        modelId: string;
        audioData: string;
        language?: string;
        prompt?: string;
        span?: unknown;
      }) => {
        if (!modelId) {
          return Effect.fail(new Error("TranscriptionModelError: modelId is required"));
        }

        if (modelId === "non-existent-provider") {
          return Effect.fail(new Error("TranscriptionProviderError: provider not found"));
        }

        return Effect.succeed({
          text: "This is a test transcription",
          model: modelId,
          timestamp: new Date(),
          id: "trans-123",
          segments: [
            { id: 1, start: 0, end: 2.5, text: "This is a", confidence: 0.95 },
            { id: 2, start: 2.5, end: 5.0, text: "test transcription", confidence: 0.98 }
          ],
          detectedLanguage: language || "en-US",
          duration: 5.0,
          usage: { promptTokens: 0, completionTokens: 50, totalTokens: 50 }
        });
      }
    },
    mockChatService: {
      create: (options: any) => Effect.succeed({
        data: "Mock response",
        metadata: {},
        messages: Chunk.make({
          role: "user",
          parts: Chunk.make({ _tag: "Text", content: "Mock response" })
        } as EffectiveMessage)
      } as EffectiveResponse<string>)
    }
  },
  resetMockCallArgs: () => Effect.sync(() => {
    capturedArgs.modelService.getProviderName = undefined;
    capturedArgs.providerService.getProviderClient = undefined;
    capturedArgs.providerClient.generateEmbeddings = undefined;
  }),
  getMockCapturedArgs: () => capturedArgs,
};

export type MockAccessorServiceImplementation = typeof mockAccessorServiceImplObject;

/**
 * Implementation of the MockAccessorService using Effect.Service pattern.
 * Provides access to mock implementations of various AI services and utilities for testing.
 */
export class MockAccessorService extends Effect.Service<MockAccessorApi>()("MockAccessorService", {
  effect: Effect.succeed(mockAccessorServiceImplObject),
  dependencies: []
}) { }

export const MockAccessorServiceLive = Layer.succeed(
  MockAccessorService,
  mockAccessorServiceImplObject
);

export { mockAccessorServiceImplObject }

