/**
 * ATTENTION AI CODING TOOLS: DO NOT MODIFY THE ARCHITECTURAL PATTERN OF THIS FILE
 * 
 * This file implements the Effect.Service pattern which is the standard pattern
 * for all services in the EffectiveAgent codebase. The pattern uses:
 * 
 * export class ServiceName extends Effect.Service<ServiceApi>()(
 *   "ServiceName",
 *   {
 *     effect: Effect.gen(function* () { ... }),
 *     dependencies: []
 *   }
 * ) { }
 * 
 * Any alterations to this pattern are strictly forbidden. Do not introduce:
 * - Layer/Context/Tag patterns
 * - Default exports
 * - make() patterns or factory functions
 * 
 * The existing implementation follows the project's architectural guidelines.
 */

import { ModelCapability } from "@/schema.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import type { ProviderClientApi, ProviderServiceApi } from "@/services/ai/provider/api.js";
import { ProviderToolError } from "@/services/ai/provider/errors/tool.js";
import type { EffectiveProviderApi, GenerateEmbeddingsResult, GenerateImageResult, GenerateObjectResult, GenerateSpeechResult, GenerateTextResult, ProviderChatOptions, ProviderGenerateEmbeddingsOptions, ProviderGenerateImageOptions, ProviderGenerateObjectOptions, ProviderGenerateSpeechOptions, ProviderGenerateTextOptions, ProviderTranscribeOptions, TranscribeResult } from "@/services/ai/provider/types.js";
import type { ChatCompletionOptions, ChatServiceApi } from '@/services/pipeline/producers/chat/api.js';
import type { EmbeddingGenerationOptions, EmbeddingServiceApi } from "@/services/pipeline/producers/embedding/api.js";
import type { ImageGenerationOptions, ImageServiceApi } from "@/services/pipeline/producers/image/api.js";
import { ImageGenerationError, ImageModelError, ImageProviderError, ImageSizeError } from "@/services/pipeline/producers/image/errors.js";
import type { ObjectServiceApi } from '@/services/pipeline/producers/object/api.js';
import { ObjectGenerationError, ObjectModelError, ObjectProviderError, ObjectSchemaError } from '@/services/pipeline/producers/object/errors.js';
import type { TextGenerationOptions, TextServiceApi } from '@/services/pipeline/producers/text/api.js';
import type { TranscriptionServiceApi } from "@/services/pipeline/producers/transcription/api.js";
import { TranscriptionError } from "@/services/pipeline/producers/transcription/errors.js";
import type { GenerateBaseResult } from '@/services/pipeline/types.js';
import type { EffectiveInput, EffectiveResponse } from '@/types.js';
import type { LanguageModelV1 } from "@ai-sdk/provider";
import { Effect } from 'effect';
import { createTypedMock } from "../../utils/typed-mocks.js";
import type { CapturedArgs, MockAccessorApi } from "./api.js";



/**
 * MockAccessorService provides mock implementations of various AI services for testing.
 * 
 * This service follows the Effect.Service pattern and provides access to mock
 * implementations that can be used in tests to verify behavior without making
 * actual API calls or depending on external services.
 *
 * The service provides centralized access to mock implementations of:
 * - ModelService - for accessing AI model information
 * - ProviderService - for AI provider management
 * - TextService - for text generation
 * - ImageService - for image generation
 * - ObjectService - for structured data generation
 * - ChatService - for chat-based interactions
 * - EmbeddingService - for text embeddings
 * - TranscriptionService - for audio transcription
 *
 * @example
 * ```typescript
 * // In a test file
 * describe('MyService', () => {
 *   it('should process text correctly', () =>
 *     Effect.gen(function* () {
 *       // Get the mock accessor service
 *       const mockAccessor = yield* MockAccessorService;
 *       
 *       // Set up your test using the mock services
 *       const myService = new MyService();
 *       const result = yield* myService.processText('input');
 *       
 *       // Assert results and verify mock calls
 *       const capturedArgs: CapturedArgs = yield* mockAccessor.getMockCapturedArgs();
 *       expect(capturedArgs.providerClient.generateEmbeddings).toBeDefined();
 *     })
 *   );
 * });
 * ```
 */
export class MockAccessorService extends Effect.Service<MockAccessorApi>()(
  "MockAccessorService",
  {
    effect: Effect.gen(function* () {
      // Initialize captured arguments tracking object
      const capturedArgs: CapturedArgs = {
        modelService: {},
        providerService: {},
        providerClient: {}
      };
      
      /**
       * Creates a mock ModelService implementation
       * Provides standardized responses for model-related operations in tests.
       * 
       * @remarks
       * This mock tracks calls to `getProviderName` in the capturedArgs object
       * for verification in tests.
       */
      const mockModelService = createTypedMock<ModelServiceApi>({
        load: () => Effect.succeed({ models: [], name: "mock", version: "1.0" } as any),
        getProviderName: (modelId: string) => {
          capturedArgs.modelService.getProviderName = { modelId };
          return Effect.succeed("mock-provider");
        },
        findModelsByCapability: () => Effect.succeed([]),
        findModelsByCapabilities: () => Effect.succeed([]),
        getDefaultModelId: () => Effect.succeed("mock-model"),
        getModelsForProvider: () => Effect.succeed([]),
        validateModel: () => Effect.succeed(true),
        exists: (modelId: string) => Effect.succeed(true),
      });

      /**
       * Creates a mock ProviderClient implementation
       * 
       * @remarks
       * Provides standardized responses for provider operations including:
       * - Text generation
       * - Chat completion
       * - Image generation 
       * - Embeddings generation
       * - Speech generation
       * - Transcription
       * - Tool execution
       * 
       * The embeddings generation captures its arguments for test verification.
       */
      const mockProviderClient = createTypedMock<ProviderClientApi>({
        validateToolInput: (toolName: string, input: unknown): 
          Effect.Effect<unknown, ProviderToolError> => Effect.succeed(input),
        executeTool: (toolName: string, input: unknown): 
          Effect.Effect<{ result: string }, ProviderToolError> => 
          Effect.succeed({ result: "mock tool result" }),
        processToolResult: (toolName: string, result: unknown): 
          Effect.Effect<{ formattedResult: string }, ProviderToolError> => 
          Effect.succeed({ formattedResult: "mock formatted result" }),
        chat: (input: EffectiveInput, options: ProviderChatOptions) => 
          Effect.succeed({
            metadata: {},
            data: {
              text: "mock chat response",
              id: "chat-id-mock",
              model: options.modelId,
              timestamp: new Date(),
            },
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            finishReason: "stop"
          } as EffectiveResponse<GenerateTextResult>),
        setVercelProvider: (vercelProvider: EffectiveProviderApi) => 
          Effect.succeed(undefined),
        getProvider: () => Effect.succeed({ 
          name: "mock-provider-name", 
          provider: "mock-provider-impl", 
          capabilities: [] 
        } as any),
        generateText: (input: EffectiveInput, options: ProviderGenerateTextOptions) => 
          Effect.succeed({
            metadata: {},
            data: {
              text: "mock generated text",
              id: "text-gen-id-mock",
              model: options.modelId,
              timestamp: new Date(),
            },
            usage: { 
              promptTokens: input.messages.length, 
              completionTokens: 10, 
              totalTokens: input.messages.length + 10 
            },
            finishReason: "stop"
          } as EffectiveResponse<GenerateTextResult>),
        generateObject: <T = unknown>(input: EffectiveInput, 
          options: ProviderGenerateObjectOptions<T>) => Effect.succeed({
            metadata: {},
            data: {
              object: { mockKey: "mockValue" } as T,
              id: "object-gen-id-mock",
              model: options.modelId,
              timestamp: new Date(),
            },
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            finishReason: "stop"
          } as unknown as EffectiveResponse<GenerateObjectResult<T>>),
        generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) => 
          Effect.succeed({
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
          } as EffectiveResponse<GenerateSpeechResult>),
        transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) => 
          Effect.succeed({
            metadata: {},
            data: {
              text: "mock transcription text",
              id: "transcribe-id-mock",
              model: options.modelId,
              timestamp: new Date(),
            },
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            finishReason: "stop"
          } as EffectiveResponse<TranscribeResult>),
        generateEmbeddings: (textsInput: string[], options: ProviderGenerateEmbeddingsOptions) => {
          capturedArgs.providerClient.generateEmbeddings = { 
            texts: textsInput, 
            params: options || {} 
          };
          return Effect.succeed({
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
          } as EffectiveResponse<GenerateEmbeddingsResult>);
        },
        generateImage: (input: EffectiveInput, options: ProviderGenerateImageOptions) => 
          Effect.succeed({
            metadata: {},
            data: {
              imageUrl: "mockBase64ImageData",
              id: "image-gen-id-mock",
              model: options.modelId,
              timestamp: new Date(),
            },
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            finishReason: "stop"
          } as EffectiveResponse<GenerateImageResult>),
        getCapabilities: () => Effect.succeed(new Set<ModelCapability>(["text-generation"])),
        getModels: () => Effect.succeed([]),
        getDefaultModelIdForProvider: (providerName: any, capability: ModelCapability) => 
          Effect.succeed("mock-default-model-for-provider")
      });

      /**
       * Creates a mock ProviderService implementation
       * 
       * @remarks
       * Returns the mockProviderClient when getProviderClient is called.
       * Captures the providerName argument for test verification.
       */
      const mockProviderService = createTypedMock<ProviderServiceApi>({
        load: () => Effect.succeed({ 
          providers: [], 
          name: "mock", 
          description: "Mock provider file" 
        } as any),
        getProviderClient: (providerName: string) => {
          capturedArgs.providerService.getProviderClient = { providerName };
          return Effect.succeed(mockProviderClient);
        },
      });
      
      /**
       * Creates a mock TextService implementation
       * 
       * @remarks
       * Returns a standardized successful text generation response with:
       * - A fixed output string: 'This is a mock text response'
       * - Metadata including the original operation parameters
       * 
       * Use this mock in tests that depend on text generation capabilities
       * without making actual API calls.
       */
      const mockTextService = createTypedMock<TextServiceApi>({
        generate: (options: TextGenerationOptions) => Effect.succeed<EffectiveResponse<GenerateBaseResult>>({
          metadata: {
            operationName: 'generate',
            parameters: options
          },
          data: {
            output: 'This is a mock text response'
          }
        })
      });
      
      /**
       * Creates a mock ImageService implementation
       * 
       * @remarks
       * Provides configurable behavior based on the modelId provided:
       * - Missing modelId: Returns ImageModelError
       * - "provider-error": Returns ImageProviderError 
       * - "generation-error": Returns ImageGenerationError
       * - "size-error": Returns ImageSizeError
       * - Any other modelId: Returns a successful image generation result
       * 
       * The successful result includes a mock image URL, standard parameters,
       * and usage statistics.
       */
      const mockImageService = createTypedMock<ImageServiceApi>({
        generate: (options: ImageGenerationOptions) => {
          const { modelId, prompt } = options;

          if (!modelId) {
            return Effect.fail(
              new ImageModelError({
                description: "Model ID must be provided",
                module: "ImageService",
                method: "generate"
              })
            );
          }

          if (modelId === "provider-error") {
            return Effect.fail(
              new ImageProviderError({
                description: "Failed to get provider client",
                module: "ImageService",
                method: "generate",
                cause: { providerName: "test-provider" } as any
              })
            );
          }

          if (modelId === "generation-error") {
            return Effect.fail(
              new ImageGenerationError({
                description: "Image generation failed",
                module: "ImageService",
                method: "generate"
              })
            );
          }

          if (modelId === "size-error") {
            return Effect.fail(
              new ImageSizeError({
                description: "Invalid image size",
                module: "ImageService",
                method: "generate"
              })
            );
          }

          return Effect.succeed({
            imageUrl: 'https://example.com/mock-image.png',
            parameters: {
              size: '512x512',
              quality: 'standard',
              style: 'natural'
            },
            id: 'mock-image-id',
            model: 'mock-image-model',
            timestamp: new Date(),
            finishReason: 'stop',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            }
          });
        }
      });

      /**
       * Creates a mock ObjectService implementation
       * 
       * @remarks
       * Provides configurable behavior based on the modelId provided:
       * - "model-error": Returns ObjectModelError
       * - "provider-error": Returns ObjectProviderError
       * - Any other modelId: Returns a successful object generation result
       * 
       * The successful result contains a simple JSON object with "key": "value".
       */
      const mockObjectService = createTypedMock<ObjectServiceApi>({
        generate: (options: any) => {
          const { modelId } = options;
          
          if (modelId === "model-error") {
            return Effect.fail(
              new ObjectModelError({
                description: "Model ID is invalid",
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
          
          return Effect.succeed<EffectiveResponse<any>>({
            metadata: {
              operationName: 'generate',
              parameters: {
                format: 'json'
              }
            },
            data: {
              content: '{ "key": "value" }',
              usage: {
                promptTokens: 10,
                completionTokens: 20,
                totalTokens: 30
              },
              finishReason: 'stop',
              providerMetadata: {
                model: 'mock-object-model',
                timestamp: new Date().toISOString()
              }
            }
          });
        }
      });
      
      /**
       * Creates a mock ChatService implementation
       * 
       * @remarks
       * Provides a simple chat completion response containing a message.
       * This simplified implementation can be used in tests that need
       * a ChatService dependency without complex response structures.
       * 
       * @example
       * ```typescript
       * // In a test file
       * const mockAccessor = yield* MockAccessorService;
       * const result = yield* mockAccessor.mockChatService.generate({...});
       * // result will contain { message: "This is a mock chat response" }
       * ```
       */
      const mockChatService = createTypedMock<ChatServiceApi>({
        generate: (options: ChatCompletionOptions) => Effect.succeed<any>({ 
          message: "This is a mock chat response"
        })
      });
      
      /**
       * Creates a mock EmbeddingService implementation
       * 
       * @remarks
       * Generates fixed-dimension (3) embeddings for input text.
       * Each input text gets converted to the same embedding vector [0.1, 0.2, 0.3].
       * 
       * This implementation captures the input texts and parameters to the 
       * capturedArgs object, allowing test verification of what was passed to
       * the embedding service.
       */
      const mockEmbeddingService = createTypedMock<EmbeddingServiceApi>({
        generate: (options: EmbeddingGenerationOptions) => {
          const texts = Array.isArray(options.text) ? options.text : [options.text];
          capturedArgs.providerClient.generateEmbeddings = { texts, params: options.parameters || {} };
          return Effect.succeed<GenerateEmbeddingsResult>({
            embeddings: [[0.1, 0.2, 0.3]],
            model: options.modelId,
            dimensions: 3,
            texts,
            parameters: options.parameters || {},
            id: 'mock-embeddings-1',
            timestamp: new Date(),
            usage: {
              promptTokens: texts.join("").length,
              completionTokens: 0,
              totalTokens: texts.join("").length + 100
            },
            finishReason: "stop"
          });
        }
      });
      
      /**
       * Creates a mock TranscriptionService implementation
       * 
       * @remarks
       * Provides a standardized transcription result with fixed text,
       * confidence scores, and word-level timings. Will fail with a
       * TranscriptionError if provided with empty audio data.
       * 
       * The mock implementation includes:
       * - Text output: "This is a mock transcription result."
       * - Word-level timings with confidence scores
       * - Language detection (fixed as "en")
       * - Usage statistics
       */
      const mockTranscriptionService = createTypedMock<TranscriptionServiceApi>({
        transcribe: (audio: ArrayBuffer) => {
          if (!audio || audio.byteLength === 0) {
            return Effect.fail(new TranscriptionError({
              description: "Audio data is required",
              module: "transcription",
              method: "transcribe"
            }));
          }
          
          return Effect.succeed({
            text: "This is a mock transcription result.",
            confidence: 0.95,
            words: [
              { word: "This", start: 0, end: 1, confidence: 0.95 },
              { word: "is", start: 1, end: 2, confidence: 0.92 },
              { word: "a", start: 2, end: 3, confidence: 0.98 },
              { word: "mock", start: 3, end: 4, confidence: 0.96 },
              { word: "transcription", start: 4, end: 5, confidence: 0.94 },
              { word: "result", start: 5, end: 6, confidence: 0.97 }
            ],
            language: "en",
            usage: {
              promptTokens: 10,
              completionTokens: 0,
              totalTokens: 10
            }
          });
        },
        getLastResult: () => Effect.succeed(null)
      });

      /**
       * Mock LanguageModelV1 implementation compatible with the AI SDK
       * 
       * @remarks
       * Provides a simple implementation of the LanguageModelV1 interface
       * for testing components that interact with language models directly.
       * 
       * Includes:
       * - Fixed model identifiers (mock-provider/mock-model)
       * - Synchronous methods that return fixed responses
       * - JSON object generation capability
       * - Streaming response support via ReadableStream
       */
      const mockLanguageModelV1 = {
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
      } as unknown as LanguageModelV1;

      // Return the service implementation object
      const resetMockCallArgs = (): Effect.Effect<void, never, never> => Effect.sync(() => {
        capturedArgs.modelService = {};
        capturedArgs.providerService = {};
        capturedArgs.providerClient = {};
        // If producerServices args were captured, reset them here too
      });

      const getMockCapturedArgs = (): Effect.Effect<CapturedArgs, never, never> => Effect.succeed(capturedArgs);  

      return {
        mockLanguageModelV1,
        mockModelService,
        mockProviderService,
        mockProducerServices: {
          mockEmbeddingService,
          mockTextService,
          mockImageService,
          mockObjectService,
          mockTranscriptionService,
          mockChatService
        },
        mockEmbeddingService,
        mockTranscriptionService,
        mockTextService,
        mockImageService,
        mockObjectService,
        mockChatService,
        
        /**
         * Resets all captured method call arguments to undefined.
         * Should be called between test cases to ensure clean state.
         * @returns An Effect that resets all captured arguments when executed
         */
        resetMockCallArgs,
        
        /**
         * Retrieves all captured method call arguments for verification.
         * Useful for asserting that services were called with expected parameters.
         * @returns The current captured arguments state
         */
        getMockCapturedArgs,
      };
    }),
    dependencies: []
  }
) { }

