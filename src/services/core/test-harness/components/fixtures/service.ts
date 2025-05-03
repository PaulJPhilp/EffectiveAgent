import { Context, Effect } from "effect";
import { FixtureApi, PersonSchema, ProductSchema, TaskSchema } from "./api.js";

/**
 * Implementation of the FixtureService using Effect.Service pattern.
 * Provides access to standard fixtures for testing.
 */
export class FixtureService extends Effect.Service<FixtureApi>()(
  "FixtureService",
  {
    effect: Effect.gen(function* () {
      // Create a mock span for testing
      const mockSpan = {
        name: "mock-span",
        traceId: "mock-trace-id",
        spanId: "mock-span-id",
        attributes: { mockSpan: true },
        status: { code: "ok" },
        startTime: new Date(),
        endTime: new Date()
      };

      /**
       * Creates a schema for a Person object.
       */
      const createPersonSchema = () => ({
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
          email: { type: "string", format: "email" }
        },
        required: ["name", "age"],
        additionalProperties: false
      });

      /**
       * Creates a schema for a Product object.
       */
      const createProductSchema = () => ({
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          price: { type: "number" },
          description: { type: "string" },
          inStock: { type: "boolean" }
        },
        required: ["id", "name", "price", "inStock"],
        additionalProperties: false
      });

      /**
       * Creates a schema for a Task object.
       */
      const createTaskSchema = () => ({
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          completed: { type: "boolean" },
          dueDate: { type: "string", format: "date-time" },
          priority: { type: "number", minimum: 1, maximum: 5 }
        },
        required: ["id", "title", "completed"],
        additionalProperties: false
      });

      /**
       * Creates a schema for a list of objects.
       * @param itemSchema The schema for the list items.
       */
      const createListSchema = (itemSchema: unknown) => ({
        type: "array",
        items: itemSchema
      });

      return {
        mockSpan,
        
        /**
         * Common test fixtures for producer services.
         */
        producerFixtures: {
          /**
           * Common test inputs for various producer services.
           */
          validInputs: {
            /**
             * Valid text input for text generation.
             */
            text: "Generate a summary of the latest research on artificial intelligence.",
            
            /**
             * Valid embedding inputs (both string and array variants).
             */
            embedding: {
              single: "The quick brown fox jumps over the lazy dog.",
              multiple: [
                "The quick brown fox jumps over the lazy dog.",
                "Machine learning is a subset of artificial intelligence.",
                "Natural language processing has advanced significantly in recent years."
              ]
            },
            
            /**
             * Valid image generation input.
             */
            image: {
              prompt: "A serene mountain landscape at sunset with a lake reflecting the sky.",
              size: "1024x1024",
              negativePrompt: "blurry, distorted, low quality"
            },
            
            /**
             * Valid object generation input.
             */
            object: {
              prompt: "Generate a person named John Doe who is 30 years old and works as a software engineer."
            },
            
            /**
             * Valid transcription input.
             */
            transcription: {
              audioData: "base64-encoded-audio-data"
            },
            
            /**
             * Valid chat input.
             */
            chat: {
              messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "What is the capital of France?" }
              ],
              system: "You are a helpful assistant that provides concise answers."
            }
          },
          
          /**
           * Common test schemas for object generation.
           */
          schemas: {
            createPersonSchema,
            createProductSchema,
            createTaskSchema,
            createListSchema
          },
          
          /**
           * Common mock responses for producer services.
           */
          mockResponses: {
            /**
             * Mock embedding generation result.
             */
            embedding: {
              embeddings: [[0.1, 0.2, 0.3, 0.4, 0.5]],
              model: "test-embedding-model",
              timestamp: new Date(),
              id: "emb-123456",
              usage: {
                promptTokens: 10,
                totalTokens: 10
              }
            },
            
            /**
             * Mock text generation result.
             */
            text: {
              text: "This is a mock text generation response that simulates AI-generated content.",
              model: "test-text-model",
              timestamp: new Date(),
              id: "text-123456",
              usage: {
                promptTokens: 15,
                completionTokens: 12,
                totalTokens: 27
              },
              finishReason: "stop"
            },
            
            /**
             * Mock image generation result.
             */
            image: {
              imageUrl: "https://example.com/test-image.jpg",
              model: "test-image-model",
              timestamp: new Date(),
              id: "img-123456",
              parameters: {
                size: "1024x1024",
                quality: "standard",
                style: "natural"
              },
              additionalImages: [
                {
                  imageUrl: "https://example.com/test-image-2.jpg",
                  id: "img-123457"
                }
              ]
            },
            
            /**
             * Mock object generation result.
             */
            object: {
              data: {
                name: "John Doe",
                age: 30,
                email: "john@example.com"
              },
              model: "test-object-model",
              timestamp: new Date(),
              id: "obj-123456",
              usage: {
                promptTokens: 100,
                completionTokens: 50,
                totalTokens: 150
              }
            },
            
            /**
             * Mock transcription result.
             */
            transcription: {
              text: "This is a test transcription of audio content.",
              model: "test-transcription-model",
              timestamp: new Date(),
              id: "trans-123456",
              segments: [
                { id: 1, start: 0, end: 2.5, text: "This is a", confidence: 0.95 },
                { id: 2, start: 2.5, end: 5.0, text: "test transcription", confidence: 0.98 },
                { id: 3, start: 5.0, end: 6.5, text: "of audio content.", confidence: 0.97 }
              ],
              detectedLanguage: "en-US",
              duration: 6.5,
              usage: {
                promptTokens: 0,
                completionTokens: 50,
                totalTokens: 50
              }
            }
          }
        }
      };
    }),
    dependencies: [],
  }
) {}

export default FixtureService;
