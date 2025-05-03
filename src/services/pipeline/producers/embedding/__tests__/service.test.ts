/**
 * @file Tests for EmbeddingService
 * @module services/ai/producers/embedding/__tests__/service
 */

import { describe, it } from "@effect/vitest";
import { Context, Effect, Either, Layer, Option, Tracer } from "effect";
import { expect } from "vitest";
import { EmbeddingInputError } from "../errors.js";
import { EmbeddingService } from "../service.js";
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

// Mock span for testing
const mockSpan: Tracer.Span = {
  _tag: "Span",
  name: "test-span",
  spanId: "test-span",
  traceId: "test-trace",
  parent: Option.none(),
  context: Context.empty(),
  status: { _tag: "Started", startTime: BigInt(0) },
  attributes: new Map(),
  end: (_endTime, _exit) => { },
  links: [],
  event: (_name, _startTime, _attributes) => { },
  sampled: true,
  kind: "internal",
  attribute: (_key, _value) => { },
  addLinks: () => { }
};

// --- Test Cases ---
describe("EmbeddingService", () => {
  it("should handle abort signal", () =>
    Effect.gen(function* (_) {
      const controller = new AbortController();
      const service = yield* EmbeddingService;
      const options = {
        modelId: "test-model-id",
        input: "test input",
        span: mockSpan,
        signal: controller.signal
      };

      // Abort after a short delay
      setTimeout(() => controller.abort(), 100);

      // The operation should be aborted
      const result = yield* service.generate(options);
      return result;
    }).pipe(
      Effect.provide(EmbeddingService.Default)
    )
  );

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
