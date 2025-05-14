import { Context, Effect, Option } from "effect";
import { type Span, SpanLink, SpanStatus } from "effect/Tracer";
import { FixtureApi } from "./api.js";

export const fixtureServiceEffect = Effect.gen(function* () {
  const mockSpan: Span = {
    _tag: "Span",
    name: "mock-span",
    traceId: "mock-trace-id",
    spanId: "mock-span-id",
    parent: Option.none(),
    context: Context.empty(),
    status: { _tag: "Started", startTime: BigInt(Date.now()) } as SpanStatus,
    attributes: new Map<string, any>([["mockSpan", true]]),
    links: [] as ReadonlyArray<SpanLink>,
    kind: "internal",
    addLinks: (links: ReadonlyArray<SpanLink>) => { },
    sampled: true,
    end: (endTime?: bigint, exit?: unknown) => { },
    event: (name: string, startTime?: bigint, attributes?: Record<string, any>) => { },
    attribute: (key: string, value: any) => { }
  };
  const createPersonSchema = () => ({ type: "object", properties: { name: { type: "string" }, age: { type: "number" }, email: { type: "string", format: "email" } }, required: ["name", "age"], additionalProperties: false });
  const createProductSchema = () => ({ type: "object", properties: { id: { type: "string" }, name: { type: "string" }, price: { type: "number" }, description: { type: "string" }, inStock: { type: "boolean" } }, required: ["id", "name", "price", "inStock"], additionalProperties: false });
  const createTaskSchema = () => ({ type: "object", properties: { id: { type: "string" }, title: { type: "string" }, completed: { type: "boolean" }, dueDate: { type: "string", format: "date-time" }, priority: { type: "number", minimum: 1, maximum: 5 } }, required: ["id", "title", "completed"], additionalProperties: false });
  const createListSchema = (itemSchema: unknown) => ({ type: "array", items: itemSchema });

  return {
    mockSpan,
    producerFixtures: {
      validInputs: { text: "Generate a summary of the latest research on artificial intelligence.", embedding: { single: "The quick brown fox jumps over the lazy dog.", multiple: ["The quick brown fox jumps over the lazy dog.", "Machine learning is a subset of artificial intelligence.", "Natural language processing has advanced significantly in recent years."] }, image: { prompt: "A serene mountain landscape at sunset with a lake reflecting the sky.", size: "1024x1024", negativePrompt: "blurry, distorted, low quality" }, object: { prompt: "Generate a person named John Doe who is 30 years old and works as a software engineer." }, transcription: { audioData: "base64-encoded-audio-data" }, chat: { messages: [{ role: "system" as const, content: "You are a helpful assistant." }, { role: "user" as const, content: "What is the capital of France?" }], system: "You are a helpful assistant that provides concise answers." } },
      schemas: { createPersonSchema, createProductSchema, createTaskSchema, createListSchema },
      mockResponses: { embedding: { embeddings: [[0.1, 0.2, 0.3, 0.4, 0.5]], model: "test-embedding-model", timestamp: new Date(), id: "emb-123456", usage: { promptTokens: 10, totalTokens: 10 } }, text: { text: "This is a mock text generation response that simulates AI-generated content.", model: "test-text-model", timestamp: new Date(), id: "text-123456", usage: { promptTokens: 15, completionTokens: 12, totalTokens: 27 }, finishReason: "stop" as const }, image: { imageUrl: "https://example.com/test-image.jpg", model: "test-image-model", timestamp: new Date(), id: "img-123456", parameters: { size: "1024x1024", quality: "standard", style: "natural" }, additionalImages: [{ imageUrl: "https://example.com/test-image-2.jpg", id: "img-123457" }] }, object: { data: { name: "John Doe", age: 30, email: "john@example.com" }, model: "test-object-model", timestamp: new Date(), id: "obj-123456", usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } }, transcription: { text: "This is a test transcription of audio content.", model: "test-transcription-model", timestamp: new Date(), id: "trans-123456", segments: [{ id: 1, start: 0, end: 2.5, text: "This is a", confidence: 0.95 }, { id: 2, start: 2.5, end: 5.0, text: "test transcription", confidence: 0.98 }, { id: 3, start: 5.0, end: 6.5, text: "of audio content.", confidence: 0.97 }], detectedLanguage: "en-US", duration: 6.5, usage: { promptTokens: 0, completionTokens: 50, totalTokens: 50 } } }
    }
  };
});

/**
 * Implementation of the FixtureService using Effect.Service pattern.
 * Provides access to standard fixtures for testing.
 */
export class FixtureService extends Effect.Service<FixtureApi>()("FixtureService", {
  effect: fixtureServiceEffect,
  dependencies: [], // This should be empty if Effect.gen handles its own dependencies via yield*
}) { }

export default FixtureService;
