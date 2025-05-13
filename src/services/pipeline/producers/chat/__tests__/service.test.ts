/**
 * @file Happy path test for ChatService
 * @module services/ai/producers/chat/__tests__/service
 */

import { Message, TextPart } from "@/schema.js";
import { FixtureService } from "@/services/core/test-harness/components/fixtures/service.js";
import { MockAccessorService } from "@/services/core/test-harness/components/mock-accessors/service.js";
import { ChatToolError } from "@/services/pipeline/producers/chat/errors.js";
import { ChatCreationOptions } from "@/services/pipeline/producers/chat/types.js";
import { Span } from "@opentelemetry/api";
import { Effect, Either } from "effect";
import * as Chunk from "effect/Chunk";
import { describe, expect, it } from "vitest";
import { ChatParameterError, ChatModelError } from "../errors.js";
import { ChatService } from "../service.js";
import * as Option from "effect/Option";

describe("ChatService", () => {
  const createTestService = () => Effect.gen(function* () {
    const mockAccessor = yield* MockAccessorService;
    const fixtureService = yield* FixtureService;
    return yield* ChatService;
  });

  const createBaseRequest = (fixtures: { mockSpan: any }): ChatCreationOptions => ({
    modelId: "test-model",
    input: new Message({
      role: "user",
      parts: Chunk.make(new TextPart({ _tag: "Text", content: "Hello" }))
    }),
    system: Option.none(),
  });

  it("should handle abort signal", () =>
    Effect.gen(function* () {
      const service = yield* createTestService();
      const controller = new AbortController();
      const fixtures = yield* FixtureService;

      // Abort after a short delay
      setTimeout(() => controller.abort(), 100);

      const result = yield* Effect.either(
        service.create({
          modelId: "test-model",
          input: new Message({
            role: "user",
            parts: Chunk.make(new TextPart({ _tag: "Text", content: "Hello" }))
          }),
          system: Option.none()
        })
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ChatToolError;
        expect(error).toBeInstanceOf(ChatToolError);
        expect(error.description).toContain("aborted");
      }
    }).pipe(
      Effect.provide(ChatService.Default),
      Effect.provide(FixtureService.Default),
      Effect.provide(MockAccessorService.Default)
    )
  );

  it("should generate a chat response successfully", () =>
    Effect.gen(function* () {
      const fixtures = yield* FixtureService;
      const mocks = yield* MockAccessorService;

      const result = yield* mocks.mockProducerServices.mockChatService.create({
        modelId: "test-model-id",
        system: undefined,
        input: "Hi!",
        span: fixtures.mockSpan as any,
        parameters: { temperature: 0.7 }
      });

      expect(result.role).toBe("user");
      const messageOption = Option.fromNullable(result.text);
      if (Option.isNone(messageOption)) {
        throw new Error("Expected message to be present");
      }
      const message = messageOption.value;
      expect(message).toBeDefined();
      expect(typeof message).toBe("string");
    })
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

      expect(result.role).toBe("user");
      const messageOption = Option.fromNullable(result.text);
      expect(Option.isSome(messageOption)).toBe(true);
      if (Option.isSome(messageOption)) {
        const message = messageOption.value;
        expect(message).toBeDefined();
        expect(typeof message).toBe("string");
      }
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
        const fixtures = yield* FixtureService;

        const result = yield* Effect.either(service.generate({
          modelId: "test-model",
          input: "Hello",
          span: fixtures.mockSpan as any,
          system: undefined,
          parameters: { temperature: 1.5 }
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          const error = result.left as ChatParameterError;
          expect(error).toBeInstanceOf(ChatParameterError);
          expect(error.description).toContain("temperature");
          expect(error.description).toContain("1.5");
        }
      }).pipe(
        Effect.provide(ChatService.Default),
        Effect.provide(FixtureService.Default),
        Effect.provide(MockAccessorService.Default)
      )
    );

    it("should reject out-of-range presence penalty", () =>
      Effect.gen(function* () {
        const service = yield* createTestService();
        const fixtures = yield* FixtureService;

        const result = yield* Effect.either(service.generate({
          modelId: "test-model",
          input: "Hello",
          span: fixtures.mockSpan as any,
          system: undefined,
          parameters: { presencePenalty: -3 }
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          const error = result.left as ChatParameterError;
          expect(error).toBeInstanceOf(ChatParameterError);
          expect(error.description).toContain("presence penalty");
          expect(error.description).toContain("-3");
        }
      }).pipe(
        Effect.provide(ChatService.Default),
        Effect.provide(FixtureService.Default),
        Effect.provide(MockAccessorService.Default)
      )
    );

    it("should reject out-of-range top-p", () =>
      Effect.gen(function* () {
        const service = yield* createTestService();
        const fixtures = yield* FixtureService;

        const result = yield* Effect.either(service.generate({
          modelId: "test-model",
          input: "Hello",
          span: fixtures.mockSpan as any,
          system: undefined,
          parameters: { topP: 1.5 }
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          const error = result.left as ChatParameterError;
          expect(error).toBeInstanceOf(ChatParameterError);
          expect(error.description).toContain("top-p");
          expect(error.description).toContain("1.5");
        }
      }).pipe(
        Effect.provide(ChatService.Default),
        Effect.provide(FixtureService.Default),
        Effect.provide(MockAccessorService.Default)
      )
    );


    it("should create a chat completion", () =>
      Effect.gen(function* () {
        const fixtures = yield* FixtureService;
        const mocks = yield* MockAccessorService;

        const result = yield* Effect.either(
          mocks.mockProducerServices.mockChatService.create({
            modelId: "test-model",
            input: "Hello, how are you?",
            system: undefined,
            span: fixtures.mockSpan as any
          })
        );

        expect(Either.isRight(result)).toBe(true);
        if (Either.isRight(result)) {
          expect(result.right.text).toBe("I'm doing well, thank you!");
          expect(result.right.role).toBe("user");
        }
      })
    );

    it("should handle empty input", () =>
      Effect.gen(function* () {
        const fixtures = yield* FixtureService;
        const mocks = yield* MockAccessorService;

        const result = yield* Effect.either(
          mocks.mockProducerServices.mockChatService.create({
            modelId: "test-model",
            input: "",
            system: undefined,
            parameters: { temperature: 0.7 },
            span: fixtures.mockSpan as any
          })
        );

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          const error = result.left as ChatParameterError;
          expect(error.description).toContain("Input text is required");
        }
      })
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