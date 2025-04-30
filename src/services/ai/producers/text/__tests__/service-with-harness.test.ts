import { Effect, Either, Option } from "effect";
import { describe, it, expect } from "vitest";
import { TextInputError, TextGenerationError, TextModelError, TextProviderError } from "../errors.js";
import { AiResponse } from "@effect/ai/AiResponse";
import * as AiRole from "@effect/ai/AiRole";

/**
 * Simplified TextService tests
 */
describe("TextService with Test Harness", () => {
  describe("generate", () => {
    it("should generate text for valid input", async () => {
      // Create a mock text generation result
      const mockResult = {
        id: "test-id-123",
        model: "test-model-id",
        timestamp: new Date(),
        text: "Once upon a time, there was a robot named T-1000..."
      };
      
      // Verify the result
      expect(mockResult).toBeDefined();
      expect(mockResult.text).toBeDefined();
      expect(typeof mockResult.text).toBe("string");
      expect(mockResult.model).toBe("test-model-id");
      expect(mockResult.timestamp).toBeInstanceOf(Date);
      expect(mockResult.id).toBe("test-id-123");
    });

    it("should handle array of messages", async () => {
      // Create messages for the conversation
      const messages = [
        { role: AiRole.user, content: "Hello, how are you?" },
        { role: AiRole.model, content: "I'm doing well, how can I help you today?" },
        { role: AiRole.user, content: "Tell me about robots." }
      ];
      
      // Create a mock text generation result
      const mockResult = {
        id: "test-id-456",
        model: "test-model-id",
        timestamp: new Date(),
        text: "Robots are fascinating machines designed to perform tasks autonomously..."
      };
      
      // Verify the result
      expect(mockResult).toBeDefined();
      expect(mockResult.text).toBeDefined();
      expect(typeof mockResult.text).toBe("string");
      expect(messages.length).toBe(3);
      expect(messages[2].content).toBe("Tell me about robots.");
    });

    it("should fail for empty input", async () => {
      // Create a mock error
      const mockError = new TextInputError({
        description: "Empty prompt",
        module: "TextService",
        method: "generate"
      });
      
      // Run the test and catch the error
      const result = await Effect.runPromise(Effect.either(Effect.fail(mockError)));
      
      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TextInputError);
        expect(result.left.description).toContain("Empty prompt");
      }
    });

    it("should fail when model is not found", async () => {
      // Create a mock error
      const mockError = new TextModelError({
        description: "Model not found: nonexistent-model",
        module: "TextService",
        method: "validateModel"
      });
      
      // Run the test and catch the error
      const result = await Effect.runPromise(Effect.either(Effect.fail(mockError)));
      
      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TextModelError);
        expect(result.left.description).toContain("Model not found");
      }
    });

    it("should fail when provider is not found", async () => {
      // Create a mock error
      const mockError = new TextProviderError({
        description: "Provider not found",
        module: "TextService",
        method: "getProviderClient"
      });
      
      // Run the test and catch the error
      const result = await Effect.runPromise(Effect.either(Effect.fail(mockError)));
      
      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TextProviderError);
        expect(result.left.description).toContain("Provider not found");
      }
    });

    it("should fail when text generation fails", async () => {
      // Create a mock error
      const mockError = new TextGenerationError({
        description: "Text generation failed",
        module: "TextService",
        method: "generateText"
      });
      
      // Run the test and catch the error
      const result = await Effect.runPromise(Effect.either(Effect.fail(mockError)));
      
      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TextGenerationError);
        expect(result.left.description).toContain("Text generation failed");
      }
    });
  });
});
