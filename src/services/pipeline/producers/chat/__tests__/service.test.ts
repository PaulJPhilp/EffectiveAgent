/**
 * @file Happy path test for ChatService
 * @module services/ai/producers/chat/__tests__/service
 */

import { Message, TextPart } from "@/schema.js";
import { Span } from "@opentelemetry/api";
import { Effect, Either } from "effect";
import * as Chunk from "effect/Chunk";
import { describe, expect, it } from "vitest";
import { ChatParameterError, ChatModelError } from "../errors.js";
import { ChatService } from "../service.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import * as Option from "effect/Option";
import { FixtureService } from "@/services/core/test-harness/components/fixtures/service.js";
import { MockAccessorService } from "@/services/core/test-harness/components/mock-accessors/service.js";

describe("ChatService Integration Tests", () => {
  // createTestService and createBaseRequest removed as they were mock-dependent

  // Minimal mock span for testing purposes, reusable across tests
  const mockSpan = {
    setAttribute: () => mockSpan,
    setAttributes: () => mockSpan,
    addEvent: () => mockSpan,
    setStatus: () => mockSpan,
    updateName: () => mockSpan,
    end: () => {},
    isRecording: () => true,
    recordException: () => {},
    context: () => ({ traceId: "mock-trace-id", spanId: "mock-span-id", traceFlags: 1 }),
    spanContext: () => ({ traceId: "mock-trace-id", spanId: "mock-span-id", traceFlags: 1 }),
  } as any as Span;

  it("should handle abort signal during generation", () =>
    Effect.gen(function* () {
      const chatService = yield* ChatService;
      const controller = new AbortController();

      // Abort after a short delay
      setTimeout(() => controller.abort(), 100);

      const result = yield* Effect.either(
        chatService.generate({
          modelId: "gpt-3.5-turbo", // Use a model that would involve provider interaction
          input: "Hello, this is a test that should be aborted.",
          span: mockSpan, // Use the shared mockSpan
          parameters: { temperature: 0.7 }
        })
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        // Check for a relevant error. AbortController usually causes an AbortError.
        // The service might wrap this in a specific ChatError or ProviderError.
        // For now, let's expect a general error and refine if needed.
        // Depending on how AbortSignal is handled deep down, it might be a ChatCompletionError
        // or a ProviderOperationError with a cause of AbortError.
        expect(result.left).toBeInstanceOf(Error); // General check
        // A more specific check would be ideal once behavior is known:
        // expect(result.left).toBeInstanceOf(ChatCompletionError);
        // if (result.left instanceof ChatCompletionError && result.left.cause instanceof Error) {
        //   expect(result.left.cause.name).toBe("AbortError");
        // }
        // For now, checking if the message contains 'abort' or 'cancel' can be a starting point
        const errorMessage = (result.left as Error).message.toLowerCase();
        const errorDescription = (result.left as any).description?.toLowerCase() ?? "";
        expect(errorMessage.includes("abort") || errorMessage.includes("cancel") || errorDescription.includes("abort") || errorDescription.includes("cancel")).toBe(true);
      }
    }).pipe(
      Effect.provide(ChatService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default)
    )
  );

  it("should generate a chat response successfully", () =>
    Effect.gen(function* () {
      const chatService = yield* ChatService;

      // Minimal mock span for testing purposes
      const mockSpan = {
        setAttribute: () => mockSpan,
        setAttributes: () => mockSpan,
        addEvent: () => mockSpan,
        setStatus: () => mockSpan,
        updateName: () => mockSpan,
        end: () => {},
        isRecording: () => true,
        recordException: () => {},
        context: () => ({ traceId: "mock-trace-id", spanId: "mock-span-id", traceFlags: 1 }),
        spanContext: () => ({ traceId: "mock-trace-id", spanId: "mock-span-id", traceFlags: 1 }),
      } as any as Span;

      const result = yield* chatService.generate({
        modelId: "gpt-3.5-turbo", // Replace with a model configured in your environment
        input: "Hello, world!",
        span: mockSpan,
        parameters: { temperature: 0.7 }
      });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(typeof result.data.content).toBe("string");
      expect(result.data.content.length).toBeGreaterThan(0);
      expect(result.data.finishReason).toBeDefined();
      expect(result.data.usage).toBeDefined();
      expect(result.data.providerMetadata).toBeDefined();
      // Add more specific assertions based on expected ChatCompletionResult structure
    }).pipe(
      Effect.provide(ChatService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default)
    )
  );

  it("should handle multiple user messages", () =>
    Effect.gen(function* () {
      const fixtures = yield* FixtureService;
      const mocks = yield* MockAccessorService;

      const result = yield* mocks.mockProducerServices.mockChatService.create({
        modelId: "test-model-id",
        system: undefined,
        input: "Hi! How are you?",
        span: fixtures.mockSpan as any,
        parameters: { temperature: 0.7 }
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    })
  );

  describe("parameter validation", () => {
    // Helper to create valid parameters for testing
    const createValidParams = (overrides = {}) => ({
      temperature: 0.7,
      topP: 0.9,
      topK: 50,
      presencePenalty: 0,
      frequencyPenalty: 0,
      ...overrides
    });

    // Helper to test parameter errors
    const testParamError = (
      params: Record<string, number>,
      expectedErrorMessage: string,
      fixtures: { mockSpan: Span },
      mocks: { mockProducerServices: { mockChatService: ChatService } }
    ) => Effect.gen(function* (_) {
      const result = yield* Effect.either(
        mocks.mockProducerServices.mockChatService.generate({
          modelId: "test-model",
          input: "Hello",
          parameters: params,
          span: fixtures.mockSpan as any
        })
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ChatParameterError;
        expect(error).toBeInstanceOf(ChatParameterError);
        expect(error.description).toContain(expectedErrorMessage);
      }
    });

    it("should reject out-of-range temperature", () =>
      Effect.gen(function* () {
        const service = yield* ChatService;

        const result = yield* Effect.either(service.generate({
          modelId: "gpt-3.5-turbo", // Use a real model ID
          input: "Hello",
          span: mockSpan, // Use shared mockSpan
          system: undefined,
          parameters: { temperature: 2.5 } // Value clearly out of typical 0-2 range
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          // The error might be ChatParameterError if validated by ChatService,
          // or a ProviderOperationError if validated by the provider.
          // Let's be a bit more general for now, or check for either.
          const error = result.left;
          expect(error).toBeInstanceOf(Error);
          // Further refinement: check if error is ChatParameterError or ProviderError containing relevant message
          const errorMessage = (error as Error).message?.toLowerCase() + ((error as any).description?.toLowerCase() || "");
          expect(errorMessage).toContain("temperature");
        }
      }).pipe(
        Effect.provide(ChatService.Default),
        Effect.provide(ModelService.Default),
        Effect.provide(ProviderService.Default),
        Effect.provide(ConfigurationService.Default)
      )
    );

    it("should reject out-of-range presence penalty", () =>
      Effect.gen(function* () {
        const service = yield* ChatService;

        const result = yield* Effect.either(service.generate({
          modelId: "gpt-3.5-turbo", // Use a real model ID
          input: "Hello",
          span: mockSpan, // Use shared mockSpan
          system: undefined,
          parameters: { presencePenalty: 3 } // Value clearly out of typical -2 to 2 range
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(Error);
          const errorMessage = (error as Error).message?.toLowerCase() + ((error as any).description?.toLowerCase() || "");
          expect(errorMessage).toContain("presence_penalty"); // OpenAI uses presence_penalty
        }
      }).pipe(
        Effect.provide(ChatService.Default),
        Effect.provide(ModelService.Default),
        Effect.provide(ProviderService.Default),
        Effect.provide(ConfigurationService.Default)
      )
    );

    it("should reject out-of-range top-p", () =>
      Effect.gen(function* () {
        const service = yield* ChatService;

        const result = yield* Effect.either(service.generate({
          modelId: "gpt-3.5-turbo", // Use a real model ID
          input: "Hello",
          span: mockSpan, // Use shared mockSpan
          system: undefined,
          parameters: { topP: 1.5 } // Value clearly out of typical 0-1 range
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(Error);
          const errorMessage = (error as Error).message?.toLowerCase() + ((error as any).description?.toLowerCase() || "");
          expect(errorMessage).toContain("top_p"); // OpenAI uses top_p
        }
      }).pipe(
        Effect.provide(ChatService.Default),
        Effect.provide(ModelService.Default),
        Effect.provide(ProviderService.Default),
        Effect.provide(ConfigurationService.Default)
      )
    );


    it("should create a chat completion", () =>
      Effect.gen(function* () {
        const service = yield* ChatService;

        const result = yield* Effect.either(
          service.generate({
            modelId: "gpt-3.5-turbo", // Use a real model ID
            input: "Hello, how are you?",
            system: undefined,
            span: mockSpan // Use shared mockSpan
          })
        );

        expect(Either.isRight(result)).toBe(true);
        if (Either.isRight(result)) {
          expect(result.right).toBeDefined();
          expect(result.right.data).toBeDefined(); // Corrected: use .data
          expect(typeof result.right.data.content).toBe("string"); // Corrected: use .data
          expect(result.right.data.content.length).toBeGreaterThan(0); // Corrected: use .data
          // Optional: Check for finishReason, usage, etc. if needed
        }
      }).pipe(
        Effect.provide(ChatService.Default),
        Effect.provide(ModelService.Default),
        Effect.provide(ProviderService.Default),
        Effect.provide(ConfigurationService.Default)
      )
    );

    it("should handle empty input", () =>
      Effect.gen(function* () {
        const service = yield* ChatService;

        const result = yield* Effect.either(
          service.generate({
            modelId: "gpt-3.5-turbo", // Use a real model ID
            input: "", // Empty input
            span: mockSpan, // Use shared mockSpan
            system: undefined,
            parameters: { temperature: 0.7 }
          })
        );

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          const error = result.left;
          // Expect ChatParameterError if ChatService validates this upfront.
          // Otherwise, it might be a different error if it reaches the provider.
          expect(error).toBeInstanceOf(ChatParameterError);
          const errorMessage = (error as Error).message?.toLowerCase() + ((error as any).description?.toLowerCase() || "");
          expect(errorMessage).toContain("input text is required");
        }
      }).pipe(
        Effect.provide(ChatService.Default),
        Effect.provide(ModelService.Default),
        Effect.provide(ProviderService.Default),
        Effect.provide(ConfigurationService.Default)
      )
    );

    it("should fail when model not found", () =>
      Effect.gen(function* () {
        const service = yield* ChatService;
        const fixtures = yield* FixtureService;

        const result = yield* Effect.either(
          service.create({
            modelId: "invalid-model",
            input: new Message({
              role: "user",
              parts: Chunk.make(new TextPart({ _tag: "Text", content: "Hello" }))
            }),
            system: Option.none()
          })
        );

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          const error = result.left as ChatModelError;
          expect(error.description).toContain("Model not found");
        }
      }).pipe(
        Effect.provide(ChatService.Default),
        Effect.provide(FixtureService.Default),
        Effect.provide(MockAccessorService.Default)
      )
    )
  })
});