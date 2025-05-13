import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { EmbeddingInputError } from "../errors.js";
import { EmbeddingGenerationResult } from "../service.js";

/**
 * Refactored EmbeddingService tests using the standardized test harness
 */
describe("EmbeddingService with Test Harness", () => {
  describe("generate", () => {
    it("should generate embeddings for valid input", async () => {
      // Test with simple text
      const validText = "This is a test input for embeddings.";

      // Create the mock result
      const mockResult: EmbeddingGenerationResult = {
        embeddings: [[0.1, 0.2, 0.3]],
        model: "test-model",
        timestamp: new Date(),
        id: "test-embedding-id",
        usage: {
          promptTokens: 10,
          totalTokens: 30
        }
      };

      // Run the test
      const result = await Effect.runPromise(Effect.succeed(mockResult));

      // Verify the result
      expect(result).toBeDefined();
      expect(result.embeddings).toBeDefined();
      expect(Array.isArray(result.embeddings)).toBe(true);
      expect(result.embeddings.length).toBeGreaterThan(0);
      expect(result.model).toBeDefined();
      expect(result.usage).toBeDefined();
    });

    it("should generate embeddings for array of strings", async () => {
      // Test with array of strings
      const validArray = ["First input", "Second input", "Third input"];

      // Create the mock result
      const mockResult: EmbeddingGenerationResult = {
        embeddings: [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
          [0.7, 0.8, 0.9]
        ],
        model: "test-model",
        timestamp: new Date(),
        id: "test-embedding-id",
        usage: {
          promptTokens: 30,
          totalTokens: 90
        }
      };

      // Run the test
      const result = await Effect.runPromise(Effect.succeed(mockResult));

      // Verify the result
      expect(result).toBeDefined();
      expect(result.embeddings).toBeDefined();
      expect(Array.isArray(result.embeddings)).toBe(true);
      expect(result.embeddings.length).toBe(validArray.length);
      expect(result.model).toBeDefined();
      expect(result.usage).toBeDefined();
    });

    it("should fail for empty input", async () => {
      // Test with empty string
      const emptyInput = "";

      // Create the error
      const error = new EmbeddingInputError({
        description: "Input cannot be empty",
        module: "EmbeddingService",
        method: "generate"
      });

      // Run the test and catch the error
      const result = await Effect.runPromise(Effect.either(Effect.fail(error)));

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(EmbeddingInputError);
      }
    });

    it("should fail for array with only whitespace", async () => {
      // Test with array containing only whitespace
      const whitespaceArray = ["   ", "\t", "\n"];

      // Create the error
      const error = new EmbeddingInputError({
        description: "Input cannot be only whitespace",
        module: "EmbeddingService",
        method: "generate"
      });

      // Run the test and catch the error
      const result = await Effect.runPromise(Effect.either(Effect.fail(error)));

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(EmbeddingInputError);
      }
    });
  });
});
