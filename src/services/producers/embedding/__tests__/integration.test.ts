import { Effect, Either, Option } from "effect";
import { describe, expect, it } from "vitest";
import type { EffectiveResponse } from "@/types.js";
import { EmbeddingGenerationError, EmbeddingModelError } from "../errors.js";
import { EmbeddingService } from "../service.js";

describe("EmbeddingService Integration Tests", () => {
  const testModelId = "test-model";
  const testPrompt = "This is a test sentence for embedding.";

  // Helper to create test options
  const createTestOptions = () => ({
    modelId: testModelId,
    text: testPrompt
  });

  it("should generate valid embeddings", () =>
    Effect.gen(function* () {
      const embeddingService = yield* EmbeddingService;
      
      const response = yield* embeddingService.generate(createTestOptions());
      
      // Check response structure
      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.data.embeddings).toBeDefined();
      expect(Array.isArray(response.data.embeddings)).toBe(true);
      expect(response.data.embeddings.length).toBeGreaterThan(0);
      expect(typeof response.data.embeddings[0]).toBe("number");
      
      // Check metadata
      expect(response.metadata).toBeDefined();
      expect(response.metadata.model).toBe(testModelId);
      expect(response.metadata.provider).toBeDefined();
      expect(response.metadata.inputLength).toBeGreaterThan(0);
      expect(response.metadata.embeddingDimensions).toBe(response.data.embeddings.length);
      
      // Check usage
      expect(response.metadata.usage).toBeDefined();
      expect(response.metadata.usage.promptTokens).toBeGreaterThan(0);
      expect(response.metadata.usage.totalTokens).toBeGreaterThan(0);
      
      // Check agent state was updated
      const state = yield* embeddingService.getAgentState();
      expect(state.generationCount).toBe(1);
      expect(state.generationHistory).toHaveLength(1);
      expect(state.generationHistory[0].success).toBe(true);
    }).pipe(
      Effect.provide(EmbeddingService.Default)
    )
  );

  it("should handle empty input error", () =>
    Effect.gen(function* () {
      const embeddingService = yield* EmbeddingService;
      
      const result = yield* Effect.either(embeddingService.generate({
        ...createTestOptions(),
        text: ""
      }));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as EmbeddingGenerationError;
        expect(error).toBeInstanceOf(EmbeddingGenerationError);
        expect(error.message).toContain("Input cannot be empty");
        expect(error.module).toBe("EmbeddingService");
        expect(error.method).toBe("generate");
      }

      // Check agent state was updated with failure
      const state = yield* embeddingService.getAgentState();
      expect(state.generationHistory[0].success).toBe(false);
    }).pipe(
      Effect.provide(EmbeddingService.Default)
    )
  );

  it("should handle missing model ID error", () =>
    Effect.gen(function* () {
      const embeddingService = yield* EmbeddingService;
      
      const result = yield* Effect.either(embeddingService.generate({
        ...createTestOptions(),
        modelId: undefined
      }));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as EmbeddingModelError;
        expect(error).toBeInstanceOf(EmbeddingModelError);
        expect(error.message).toContain("Model ID must be provided");
        expect(error.module).toBe("EmbeddingService");
        expect(error.method).toBe("generate");
      }
    }).pipe(
      Effect.provide(EmbeddingService.Default)
    )
  );

  it("should handle abort signal", () =>
    Effect.gen(function* () {
      const controller = new AbortController();
      const embeddingService = yield* EmbeddingService;
      
      // Abort immediately
      controller.abort();
      
      const result = yield* Effect.either(embeddingService.generate({
        ...createTestOptions(),

      }));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as EmbeddingGenerationError;
        expect(error).toBeInstanceOf(EmbeddingGenerationError);
        expect(error.message).toContain("aborted");
        expect(error.module).toBe("EmbeddingService");
        expect(error.method).toBe("generate");
      }

      // Check agent state was updated with failure
      const state = yield* embeddingService.getAgentState();
      expect(state.generationHistory[0].success).toBe(false);
    }).pipe(
      Effect.provide(EmbeddingService.Default)
    )
  );
});
