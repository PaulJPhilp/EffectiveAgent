import { Chunk, Effect, Option } from "effect";
import type { LanguageModelV1 } from "@ai-sdk/provider";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import type { ProviderServiceApi } from "@/services/ai/provider/api.js";
import type { EmbeddingServiceApi } from "@/services/pipeline/producers/embedding/api.js";
import type { TextServiceApi } from "@/services/pipeline/producers/text/api.js";
import type { ObjectServiceApi } from "@/services/pipeline/producers/object/api.js";
import { EmbeddingInputError } from "@/services/pipeline/producers/embedding/errors.js";
import { ObjectModelError, ObjectProviderError, ObjectGenerationError, ObjectSchemaError } from "@/services/pipeline/producers/object/errors.js";
import { MockAccessorApi } from "./api.js";
import { AiResponse, TextPart as ResponseTextPart } from "@effect/ai/AiResponse";
import { User } from "@effect/ai/AiRole";
import { ChatCompletionOptions } from "@/services/pipeline/producers/chat/service.js";

/**
 * Implementation of the MockAccessorService using Effect.Service pattern.
 * Provides access to standard mock objects for testing AI components.
 */
export class MockAccessorService extends Effect.Service<MockAccessorApi>()(
  "MockAccessorService",
  {
    effect: Effect.succeed({
      /**
       * Provides access to a pre-configured mock LanguageModelV1 instance.
       * This mock can be used for testing components that interact directly
       * with the AI SDK's language model interface.
       */
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

      /**
       * Provides access to the mock ModelService instance used by the harness.
       * Useful for asserting interactions or configuring the mock model service behavior.
       */
      mockModelService: {
        load: () => Effect.succeed({ models: [], name: "mock", version: "1.0" }),
        getProviderName: () => Effect.succeed("mock-provider"),
        findModelsByCapability: () => Effect.succeed([]),
        findModelsByCapabilities: () => Effect.succeed([]),
        getDefaultModelId: () => Effect.succeed("mock-model"),
        getModelsForProvider: () => Effect.succeed([]),
        validateModel: () => Effect.succeed(true)
      } as unknown as ModelServiceApi,

      /**
       * Provides access to the mock ProviderService instance used by the harness.
       * Useful for asserting interactions or configuring the mock provider service behavior.
       */
      mockProviderService: {
        load: Effect.succeed({ providers: [], name: "mock", description: "Mock provider file" }),
        getProviderClient: () => Effect.succeed({
          chat: () => Effect.succeed({}),
          setVercelProvider: () => Effect.succeed(undefined),
          getProvider: () => Effect.succeed({
            name: "mock-provider",
            provider: "mock",
            capabilities: ["text-generation"]
          }),
          generateText: () => Effect.succeed({
            data: { text: "This is a mock text response" },
            metadata: {}
          }),
          generateObject: () => Effect.succeed({ data: {}, metadata: {} }),
          generateSpeech: () => Effect.succeed({ data: {}, metadata: {} }),
          transcribe: () => Effect.succeed({ data: {}, metadata: {} }),
          generateEmbeddings: () => Effect.succeed({ data: {}, metadata: {} }),
          generateImage: () => Effect.succeed({ data: {}, metadata: {} }),
          getCapabilities: () => Effect.succeed(new Set()),
          getModels: () => Effect.succeed([])
        })
      } as unknown as ProviderServiceApi,
      
      /**
       * Standardized mock implementations for all producer services.
       */
      mockProducerServices: {
        /**
         * Mock implementation of the EmbeddingService.
         */
        mockEmbeddingService: {
          generate: ({ modelId, input, span }: { modelId: string; input: string | string[]; span?: unknown }) => {
            // Fail for empty string input
            if (typeof input === "string" && input.trim() === "") {
              return Effect.fail(new EmbeddingInputError({
                description: "Input cannot be empty",
                module: "EmbeddingService",
                method: "generate",
                input
              }));
            }
            
            // Fail for array of only whitespace/empty strings
            if (Array.isArray(input) && input.every(str => typeof str === "string" && str.trim() === "")) {
              return Effect.fail(new EmbeddingInputError({
                description: "Input array cannot contain only empty or whitespace strings",
                module: "EmbeddingService",
                method: "generate",
                input
              }));
            }
            
            // Default success case
            return Effect.succeed({
              embeddings: Array.isArray(input) ? input.map(() => [0.1, 0.2, 0.3, 0.4, 0.5]) : [[0.1, 0.2, 0.3, 0.4, 0.5]],
              model: modelId || "default-embedding-model",
              timestamp: new Date(),
              id: "emb-123",
              usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
            });
          }
        } as unknown as EmbeddingServiceApi,
        
        /**
         * Mock implementation of the TextService.
         */
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
        
        /**
         * Mock implementation of the ImageService.
         */
        mockImageService: {
          generate: ({ modelId, prompt, negativePrompt, system, size, quality, style, n, span }: {
            modelId: string;
            prompt: string;
            negativePrompt?: string;
            system?: string;
            size?: string;
            quality?: string;
            style?: string;
            n?: number;
            span?: unknown;
          }) => {
            if (!modelId) {
              return Effect.fail(new Error("ImageModelError: Model ID required"));
            }
            
            if (size && !['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'].includes(size)) {
              return Effect.fail(new Error("ImageSizeError: Invalid image size"));
            }
            
            // Compose prompt for testing assertions
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
              additionalImages: n && n > 1 ? Array(n-1).fill(0).map((_, i) => ({
                imageUrl: `https://example.com/test-image-${i+2}.jpg`,
                id: `img-${i+2}`
              })) : [],
              // For testing assertions
              composedPrompt
            };
            
            return Effect.succeed(result);
          }
        },
        
        /**
         * Mock implementation of the ObjectService.
         */
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
            
            // Test case for provider error
            if (modelId === "provider-error") {
              return Effect.fail(
                new ObjectProviderError({
                  description: "Failed to get provider client",
                  module: "ObjectService",
                  method: "generate",
                  // Need to use cause to pass provider name since it's not in the type
                  cause: { providerName: "test-provider" } as any
                })
              );
            }
            
            // Test case for generation error
            if (modelId === "generation-error") {
              return Effect.fail(
                new ObjectGenerationError({
                  description: "Object generation failed",
                  module: "ObjectService",
                  method: "generate"
                })
              );
            }
            
            // Test case for schema validation error
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
            
            // Default success case
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
        
        /**
         * Mock implementation of the TranscriptionService.
         */
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
        
        /**
         * Mock implementation of the ChatService.
         */
        mockChatService: {
          create: (options: ChatCompletionOptions) => {
            if (!options.modelId) {
              return Effect.fail(new Error("ChatModelError: Model ID must be provided"));
            }
            
            return Effect.succeed(
              new AiResponse({
                role: new User(),
                parts: Chunk.of(new ResponseTextPart({ content: "Hello, world!" }))
              })
            );
          }
        }
      }
    }),
    dependencies: [],
  }
) {}

export default MockAccessorService;
