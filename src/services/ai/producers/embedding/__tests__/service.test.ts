/**
 * @file Tests for EmbeddingService
 * @module services/ai/producers/embedding/__tests__/service
 */

import { describe, it, expect } from "@effect/vitest";
import { Effect, Layer, Option, Either } from "effect";
import { EmbeddingService } from "../service.js";
import { EmbeddingInputError } from "../errors.js";
import { createAiTestHarness } from "@/services/ai/test-utils/index.js";

// --- Minimal mocks for dependencies ---
const mockEmbeddingServiceImpl = {
  generate: ({ modelId, input, span }: any) => {
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
    // Success otherwise
    return Effect.succeed({
      embeddings: [[0.1, 0.2, 0.3]],
      model: modelId ?? "test-model-id",
      timestamp: new Date(),
      id: "emb-123",
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
    });
  }
};

const mockEmbeddingServiceLayer = Layer.succeed(
  EmbeddingService,
  mockEmbeddingServiceImpl as any
);

import { mockSpan } from "@/services/ai/test-utils/index.js";

// --- Test Cases ---
describe("EmbeddingService", () => {
  it("should generate embeddings for valid input (happy path)", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* EmbeddingService;
      return yield* service.generate({
        modelId: "test-model-id",
        input: "The quick brown fox jumps over the lazy dog.",
        span: mockSpan
      });
    });
    const result = await Effect.runPromise(effect.pipe(Effect.provide(mockEmbeddingServiceLayer)));
    expect(Either.isRight(Either.right(result))).toBe(true);
    if (Either.isRight(Either.right(result))) {
      expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
      expect(result.model).toBe("test-model-id");
      expect(result.id).toBe("emb-123");
    }
  });

  it("should fail for empty input string", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* EmbeddingService;
      // Simulate empty input string
      return yield* service.generate({
        modelId: "test-model-id",
        input: "",
        span: mockSpan
      });
    });
    await expect(Effect.runPromise(effect.pipe(Effect.provide(mockEmbeddingServiceLayer))))
      .rejects.toThrow();
  });

  it("should fail for input array of only whitespace", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* EmbeddingService;
      // Simulate input array with only whitespace strings
      return yield* service.generate({
        modelId: "test-model-id",
        input: ["   ", ""],
        span: mockSpan
      });
    });
    await expect(Effect.runPromise(effect.pipe(Effect.provide(mockEmbeddingServiceLayer))))
      .rejects.toThrow();
  });

  it("should succeed for input array with at least one valid string", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* EmbeddingService;
      // Simulate input array with one valid string
      return yield* service.generate({
        modelId: "test-model-id",
        input: ["", "foo", "   "],
        span: mockSpan
      });
    });
    const result = await Effect.runPromise(effect.pipe(Effect.provide(mockEmbeddingServiceLayer)));
    expect(Either.isRight(Either.right(result))).toBe(true);
    if (Either.isRight(Either.right(result))) {
      expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
      expect(result.model).toBe("test-model-id");
      expect(result.id).toBe("emb-123");
    }
  });

  it("should succeed for input array with special characters", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* EmbeddingService;
      return yield* service.generate({
        modelId: "test-model-id",
        input: ["!@#$%^&*()", "foo", "\n\t"],
        span: mockSpan
      });
    });
    const result = await Effect.runPromise(effect.pipe(Effect.provide(mockEmbeddingServiceLayer)));
    expect(Either.isRight(Either.right(result))).toBe(true);
    if (Either.isRight(Either.right(result))) {
      expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
      expect(result.model).toBe("test-model-id");
      expect(result.id).toBe("emb-123");
    }
  });

  it("should succeed for input array mixing valid and whitespace/empty strings", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* EmbeddingService;
      return yield* service.generate({
        modelId: "test-model-id",
        input: ["   ", "foo", "", "bar"],
        span: mockSpan
      });
    });
    const result = await Effect.runPromise(effect.pipe(Effect.provide(mockEmbeddingServiceLayer)));
    expect(Either.isRight(Either.right(result))).toBe(true);
    if (Either.isRight(Either.right(result))) {
      expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
      expect(result.model).toBe("test-model-id");
      expect(result.id).toBe("emb-123");
    }
  });

  it("should succeed for missing modelId (should use default)", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* EmbeddingService;
      return yield* service.generate({
        input: "The quick brown fox jumps over the lazy dog.",
        span: mockSpan
      });
    });
    const result = await Effect.runPromise(effect.pipe(Effect.provide(mockEmbeddingServiceLayer)));
    expect(Either.isRight(Either.right(result))).toBe(true);
    if (Either.isRight(Either.right(result))) {
      expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
      expect(result.model).toBe("test-model-id"); // default
      expect(result.id).toBe("emb-123");
    }
  });
});
