/**
 * @file Happy path test for ChatService
 * @module services/ai/producers/chat/__tests__/service
 */

import { EffectiveError } from "@/errors.js";
import { TextPart as InputTextPart, Message, User } from "@/services/ai/input/schema.js";
import { TextPart as ResponseTextPart } from "@/services/ai/output/schema.js";
import { FixtureService } from "@/services/core/test-harness/components/fixtures/service.js";
import { MockAccessorService } from "@/services/core/test-harness/components/mock-accessors/service.js";
import { Chunk, Effect, Either, Option } from "effect";
import type * as JsonSchema from "effect/JSONSchema";
import type { Span } from "effect/Tracer";
import { describe, expect, it } from "vitest";
import type { ChatCompletionOptions } from "../api.js";
import { ChatParameterError, ChatToolError } from "../errors.js";
import { ChatService } from "../service.js";

describe("ChatService", () => {
  it("should handle abort signal", () => {
    const controller = new AbortController();

    return Effect.gen(function* () {
      const service = yield* ChatService;
      const options = {
        modelId: "test-model",
        input: Chunk.of(new Message({ role: new User(), parts: Chunk.of(new InputTextPart({ content: "Hello" })) })),
        span: {} as Span,
        signal: controller.signal,
        system: Option.some("You are a test assistant"),
        tools: [],
        required: false
      };

      // Abort after a short delay
      setTimeout(() => controller.abort(), 100);

      // The operation should be aborted
      const result = yield* service.create(options);
      return result;
    });
  });
  // Minimal valid mock tool for testing tool call scenarios
  const mockTool = {
    name: "tool-not-present",
    description: "A mock tool for testing.",
    parameters: { type: "object" as const, properties: {}, required: [] },
    structured: false
  };

  it("should generate a chat response successfully", () =>
    Effect.gen(function* (_) {
      const fixtures = yield* FixtureService;
      const mocks = yield* MockAccessorService;

      const result = yield* mocks.mockProducerServices.mockChatService.create({
        modelId: "test-model-id",
        system: Option.none(),
        input: Chunk.of(
          new Message({
            role: new User(),
            parts: Chunk.of(new InputTextPart({ content: "Hi!" }))
          })
        ),
        tools: [],
        required: false,
        span: fixtures.mockSpan,
        parameters: { temperature: 0.7 }
      });

      expect(result.role).toBeInstanceOf(User);
      const firstPartOption = Chunk.get(result.parts, 0);
      expect(Option.isSome(firstPartOption)).toBe(true);

      if (Option.isSome(firstPartOption)) {
        const firstPart = firstPartOption.value as ResponseTextPart;
        expect(firstPart._tag).toBe("Text");
        expect(firstPart.content).toBeDefined();
      }
    })
  );

  it("should handle multiple user messages", () =>
    Effect.gen(function* (_) {
      const fixtures = yield* FixtureService;
      const mocks = yield* MockAccessorService;

      const result = yield* mocks.mockProducerServices.mockChatService.create({
        modelId: "test-model-id",
        system: Option.none(),
        input: Chunk.make(
          new Message({
            role: new User(),
            parts: Chunk.of(new InputTextPart({ content: "Hi!" }))
          }),
          new Message({
            role: new User(),
            parts: Chunk.of(new InputTextPart({ content: "How are you?" }))
          })
        ),
        tools: [],
        required: false,
        span: fixtures.mockSpan,
        parameters: { temperature: 0.7 }
      });

      expect(result.role).toBeInstanceOf(User);
      const firstPartOption = Chunk.get(result.parts, 0);
      expect(Option.isSome(firstPartOption)).toBe(true);
    })
  );

  it("should handle tools configuration", () =>
    Effect.gen(function* (_) {
      const fixtures = yield* FixtureService;
      const mocks = yield* MockAccessorService;

      const result = yield* mocks.mockProducerServices.mockChatService.create({
        modelId: "test-model-id",
        system: Option.none(),
        input: Chunk.of(
          new Message({
            role: new User(),
            parts: Chunk.of(new InputTextPart({ content: "Hi!" }))
          })
        ),
        tools: [mockTool],
        required: true,
        span: fixtures.mockSpan,
        parameters: { temperature: 0.7 }
      });

      expect(result.role).toBeInstanceOf(User);
      const firstPartOption = Chunk.get(result.parts, 0);
      expect(Option.isSome(firstPartOption)).toBe(true);
    })
  );

  // Helper to create a base request for testing
  const createBaseRequest = (fixtures: { mockSpan: Span }, tools: ChatCompletionOptions["tools"] = []): ChatCompletionOptions => ({
    modelId: "test-model-id",
    system: Option.none(),
    input: Chunk.of(
      new Message({
        role: new User(),
        parts: Chunk.of(new InputTextPart({ content: "Hi!" }))
      })
    ),
    tools,
    required: false,
    span: fixtures.mockSpan
  });

  describe("tool validation", () => {
    // Helper to create a valid tool for testing
    const createValidTool = (overrides: Partial<ChatCompletionOptions["tools"][0]> = {}) => ({
      name: "test-tool",
      description: "A mock tool for testing.",
      parameters: {
        type: "object",
        properties: {
          param1: { type: "string" }
        },
        required: ["param1"]
      } as JsonSchema.JsonSchema7,
      structured: false,
      ...overrides
    });

    // Helper to test error conditions
    const testToolError = (
      tool: any,
      expectedErrorMessage: string,
      fixtures: { mockSpan: Span },
      mocks: { mockProducerServices: { mockChatService: ChatService } }
    ) => Effect.gen(function* (_) {
      const result = yield* Effect.either(
        mocks.mockProducerServices.mockChatService.create(
          createBaseRequest(fixtures, [tool])
        )
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ChatToolError;
        expect(error).toBeInstanceOf(ChatToolError);
        expect(error.description).toContain(expectedErrorMessage);
      }
    });

    const createTestMessage = () => new Message({
      role: new User(),
      parts: Chunk.of(new InputTextPart({ content: "Hi!" }))
    });

    // Helper to create a base request for testing
    // Helper to create a base request for testing
    const createBaseRequest = (fixtures: { mockSpan: Span }, tools: ChatCompletionOptions["tools"] = []): ChatCompletionOptions => ({
      modelId: "test-model-id",
      system: Option.none(),
      input: Chunk.of(createTestMessage()),
      tools,
      required: true,
      span: fixtures.mockSpan,
      parameters: { temperature: 0.7 }
    });

    it("should reject empty tool name", () =>
      Effect.gen(function* (_) {
        const fixtures = yield* FixtureService;
        const mocks = yield* MockAccessorService;

        const invalidTool = {
          name: "", // Invalid: empty name
          description: "A mock tool for testing.",
          parameters: { type: "object" as const, properties: {}, required: [] },
          structured: false
        };

        const result = yield* Effect.either(
          mocks.mockProducerServices.mockChatService.create(
            createBaseRequest(fixtures, [invalidTool])
          )
        );

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ChatToolError);
          expect(result.left.description).toContain("missing required properties");
        }
      })
    );

    it("should reject empty tool description", () =>
      Effect.gen(function* (_) {
        const fixtures = yield* FixtureService;
        const mocks = yield* MockAccessorService;

        const invalidTool = {
          name: "test-tool",
          description: "", // Invalid: empty description
          parameters: { type: "object" as const, properties: {}, required: [] },
          structured: false
        };

        const result = yield* Effect.either(
          mocks.mockProducerServices.mockChatService.create(
            createBaseRequest(fixtures, [invalidTool])
          )
        );

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ChatToolError);
          expect(result.left.description).toContain("missing required properties");
        }
      })
    );

    it("should reject missing schema type", () =>
      Effect.gen(function* (_) {
        const fixtures = yield* FixtureService;
        const mocks = yield* MockAccessorService;

        const invalidTool = {
          name: "test-tool",
          description: "A mock tool for testing.",
          parameters: {
            type: "invalid",
            properties: {},
            required: []
          } as unknown as JsonSchema.JsonSchema7,
          structured: false
        };

        const result = yield* Effect.either(
          mocks.mockProducerServices.mockChatService.create(
            createBaseRequest(fixtures, [invalidTool])
          )
        );

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ChatToolError);
          expect(result.left.description).toContain("invalid parameter schema");
        }
      })
    );

    it("should reject missing property types", () =>
      Effect.gen(function* (_) {
        const fixtures = yield* FixtureService;
        const mocks = yield* MockAccessorService;

        const invalidTool = {
          name: "test-tool",
          description: "A mock tool for testing.",
          parameters: {
            type: "object",
            properties: {
              param1: { type: "object" }
            },
            required: []
          } as unknown as JsonSchema.JsonSchema7,
          structured: false
        };

        const result = yield* Effect.either(
          mocks.mockProducerServices.mockChatService.create(
            createBaseRequest(fixtures, [invalidTool])
          )
        );

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ChatToolError);
          expect(result.left.description).toContain("missing type");
        }
      })
    );

    it("should reject undefined required parameters", () =>
      Effect.gen(function* (_) {
        const fixtures = yield* FixtureService;
        const mocks = yield* MockAccessorService;

        const invalidTool = {
          name: "test-tool",
          description: "A mock tool for testing.",
          parameters: {
            type: "object",
            properties: {
              param1: { type: "string" }
            },
            required: ["nonexistent"]
          } as JsonSchema.JsonSchema7,
          structured: false
        };

        const result = yield* Effect.either(
          mocks.mockProducerServices.mockChatService.create(
            createBaseRequest(fixtures, [invalidTool])
          )
        );

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ChatToolError);
          expect(result.left.description).toContain("nonexistent");
        }
      })
    );
  });

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
        mocks.mockProducerServices.mockChatService.create({
          ...createBaseRequest(fixtures),
          parameters: params
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
      Effect.gen(function* (_) {
        const fixtures = yield* FixtureService;
        const mocks = yield* MockAccessorService;

        const result = yield* Effect.either(mocks.mockProducerServices.mockChatService.create({
          modelId: "test-model-id",
          system: Option.none(),
          input: Chunk.of(
            new Message({
              role: new User(),
              parts: Chunk.of(new InputTextPart({ content: "Hi!" }))
            })
          ),
          tools: [],
          required: false,
          span: fixtures.mockSpan,
          parameters: { temperature: 3.0 } // Invalid: temperature > 2
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ChatParameterError);
          expect(result.left.description).toContain("temperature");
          expect(result.left.description).toContain("3");
        }
      })
    );

    it("should reject out-of-range presence penalty", () =>
      Effect.gen(function* (_) {
        const fixtures = yield* FixtureService;
        const mocks = yield* MockAccessorService;

        const result = yield* Effect.either(mocks.mockProducerServices.mockChatService.create({
          modelId: "test-model-id",
          system: Option.none(),
          input: Chunk.of(
            new Message({
              role: new User(),
              parts: Chunk.of(new InputTextPart({ content: "Hi!" }))
            })
          ),
          tools: [],
          required: false,
          span: fixtures.mockSpan,
          parameters: { presencePenalty: -3.0 } // Invalid: < -2
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ChatParameterError);
          expect(result.left.description).toContain("presence penalty");
          expect(result.left.description).toContain("-3");
        }
      })
    );

    it("should reject out-of-range top-p", () =>
      Effect.gen(function* (_) {
        const fixtures = yield* FixtureService;
        const mocks = yield* MockAccessorService;

        const result = yield* Effect.either(mocks.mockProducerServices.mockChatService.create({
          modelId: "test-model-id",
          system: Option.none(),
          input: Chunk.of(
            new Message({
              role: new User(),
              parts: Chunk.of(new InputTextPart({ content: "Hi!" }))
            })
          ),
          tools: [],
          required: false,
          span: fixtures.mockSpan,
          parameters: { topP: 1.5 } // Invalid: > 1
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ChatParameterError);
          expect(result.left.description).toContain("top-p");
          expect(result.left.description).toContain("1.5");
        }
      })
    );
  });

  describe("generate", () => {
    const mockSpan = {} as Span;

    const createBaseRequest = (tools: ChatCompletionOptions["tools"] = []): ChatCompletionOptions => ({
      modelId: "test-model",
      input: "Hello, how are you?",
      span: mockSpan,
      tools
    });

    it("should generate a chat completion", async () => {
      const service = new ChatService({
        generate: () => Effect.succeed({
          data: {
            output: "I'm doing well, thank you!",
            usage: {
              promptTokens: 10,
              completionTokens: 5,
              totalTokens: 15
            }
          }
        })
      });

      const result = await Effect.runPromise(
        service.generate(createBaseRequest())
      );

      expect(result.data.output).toBe("I'm doing well, thank you!");
      expect(result.data.usage?.totalTokens).toBe(15);
    });

    it("should handle empty input", async () => {
      const service = new ChatService({
        generate: () => Effect.succeed({
          data: {
            output: "Response",
            usage: {
              promptTokens: 10,
              completionTokens: 5,
              totalTokens: 15
            }
          }
        })
      });

      const request = createBaseRequest();
      request.input = "";

      const result = await Effect.runPromise(
        Effect.either(service.generate(request))
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.message).toContain("Input text is required");
      }
    });

    it("should handle model not found", async () => {
      const service = new ChatService({
        generate: () => Effect.fail(new EffectiveError("Model not found"))
      });

      const result = await Effect.runPromise(
        Effect.either(service.generate(createBaseRequest()))
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.message).toContain("Failed to generate chat completion");
      }
    });
  });
});
