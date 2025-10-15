import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { TestSpan } from "@/test/test-span.js";
import { ChatInputError, ChatModelError } from "../errors.js";
import { ChatService } from "../service.js";

describe("ChatService Integration Tests", () => {
  const testModelId = "test-model" as const;
  const testMessage = "Hello, how are you?" as const;



  // Helper to create test options
  const createTestOptions = () => Effect.succeed({
    input: testMessage,
    span: new TestSpan("test-span"),
    modelId: testModelId
  } as const);

  it("should generate a valid chat response", () =>
    Effect.gen(function* () {
      const chatService = yield* ChatService;
      
      const options = yield* createTestOptions();
      const response = yield* chatService.generate(options);
      
      // Check response structure
      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.data.content).toBeDefined();
      expect(typeof response.data.content).toBe("string");
      expect(response.data.content.length).toBeGreaterThan(0);
      
      // Check metadata
      expect(response.metadata).toBeDefined();
      expect(response.metadata.model).toBe(testModelId);
      expect(response.metadata.provider).toBeDefined();
      expect(response.metadata.promptLength).toBeGreaterThan(0);
      expect(response.metadata.responseLength).toBeGreaterThan(0);
      
      // Check usage
      expect(response.metadata.usage).toBeDefined();
      expect(response.metadata.usage.promptTokens).toBeGreaterThan(0);
      expect(response.metadata.usage.completionTokens).toBeGreaterThan(0);
      expect(response.metadata.usage.totalTokens).toBeGreaterThan(0);
      
      // Check agent state was updated
      const state = yield* chatService.getAgentState();
      expect(state).toBeDefined();
      expect(response.data.content.length).toBeGreaterThan(0);
    }).pipe(
      Effect.provide(ChatService.Default)
    )
  );

  it("should handle empty messages error", () =>
    Effect.gen(function* () {
      const chatService = yield* ChatService;
      
      const options = yield* createTestOptions();
      const result = yield* Effect.either(chatService.generate({
        ...options,
        input: ""
      }));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ChatInputError;
        expect(error).toBeInstanceOf(ChatInputError);
        expect(error.message).toContain("Input cannot be empty");
        expect(error.module).toBe("ChatService");
        expect(error.method).toBe("generate");
      }

      // Check agent state was updated with failure
      const state = yield* chatService.getAgentState();
      expect(state).toBeDefined();
    }).pipe(
      Effect.provide(ChatService.Default)
    )
  );

  it("should handle missing model ID error", () =>
    Effect.gen(function* () {
      const chatService = yield* ChatService;
      
      const options = yield* createTestOptions();
      const result = yield* Effect.either(chatService.generate({
        ...options,
        modelId: ""
      }));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ChatModelError;
        expect(error).toBeInstanceOf(ChatModelError);
        expect(error.message).toContain("Model ID must be provided");
        expect(error.module).toBe("ChatService");
        expect(error.method).toBe("generate");
      }
    }).pipe(
      Effect.provide(ChatService.Default)
    )
  );

  it("should handle invalid message role error", () =>
    Effect.gen(function* () {
      const chatService = yield* ChatService;
      
      const options = yield* createTestOptions();
      const result = yield* Effect.either(chatService.generate({
        ...options,
        input: "invalid input"
      }));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ChatInputError;
        expect(error).toBeInstanceOf(ChatInputError);
        expect(error.message).toContain("Invalid input");
        expect(error.module).toBe("ChatService");
        expect(error.method).toBe("generate");
      }
    }).pipe(
      Effect.provide(ChatService.Default)
    )
  );

  it("should handle empty message content error", () =>
    Effect.gen(function* () {
      const chatService = yield* ChatService;
      
      const options = yield* createTestOptions();
      const result = yield* Effect.either(chatService.generate({
        ...options,
        input: ""
      }));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ChatInputError;
        expect(error).toBeInstanceOf(ChatInputError);
        expect(error.message).toContain("Input cannot be empty");
        expect(error.module).toBe("ChatService");
        expect(error.method).toBe("generate");
      }
    }).pipe(
      Effect.provide(ChatService.Default)
    )
  );
});
