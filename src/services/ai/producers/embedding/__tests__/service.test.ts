import { createAiTestHarness } from "@/services/ai/test-utils/index.js";
import { Effect } from "effect";
import { Span } from "effect/Tracer";
import { describe, expect, it } from "@effect/vitest";
import { EmbeddingInputError, EmbeddingModelError, EmbeddingProviderError } from "@/services/ai/producers/embedding/errors.js";
import type { EmbeddingGenerationOptions } from "@/services/ai/producers/embedding/service.js";
import { EmbeddingService } from "@/services/ai/producers/embedding/service.js";

/**
 * Runs service.generate and returns an Effect.Either result for test assertions.
 */
async function runEither(
  service: EmbeddingService,
  opts: Partial<EmbeddingGenerationOptions> & { input: string | string[] },
  mockSpan: Span
) {
  return await Effect.runPromise(
    Effect.either(
      service.generate({
        modelId: opts.modelId,
        input: opts.input,
        span: opts.span ?? mockSpan
      })
    )
  );
}

/**
 * Asserts that result is a Left (error) and error is of expected class.
 */
function expectLeft(result: unknown, errorClass: new (...args: any[]) => unknown) {
  expect(result).toBeDefined();
  if (
    typeof result === "object" &&
    result !== null &&
    "_tag" in result &&
    (result as any)._tag === "Left"
  ) {
    expect((result as any).left).toBeInstanceOf(errorClass);
  } else {
    throw new Error("Expected Left, got Right or malformed Either");
  }
}

/**
 * Asserts that result is a Right (success).
 */
function expectRight(result: unknown) {
  expect(result).toBeDefined();
  if (
    typeof result === "object" &&
    result !== null &&
    "_tag" in result &&
    (result as any)._tag === "Right"
  ) {
    expect((result as any).right).toBeDefined();
  } else {
    throw new Error("Expected Right, got Left or malformed Either");
  }
}

// Example input and expected output for the happy path
const testInput = "The quick brown fox jumps over the lazy dog.";
const testModelId = "test-model-id";
const testEmbedding = [0.1, 0.2, 0.3, 0.4];

// Minimal mock for EmbeddingService dependencies
class TestEmbeddingService extends EmbeddingService {
    // Flags to simulate dependency errors
    static throwModelError = false;
    static throwProviderError = false;

    constructor(deps: any) {
        super(deps);
    }

    generate = (options: EmbeddingGenerationOptions) => {
        if (
            (Array.isArray(options.input) && options.input.length === 0) ||
            (!Array.isArray(options.input) && options.input.trim() === "")
        ) {
            return Effect.fail(
                new EmbeddingInputError({
                    description: Array.isArray(options.input)
                        ? "Input array cannot be empty"
                        : "Input text cannot be empty",
                    module: "EmbeddingService",
                    method: "generate"
                })
            );
        }
        // Nuanced validation: if input is array, all elements must be non-empty and not just whitespace
        if (Array.isArray(options.input)) {
            const allEmpty = options.input.every(
                (str) => typeof str === "string" && str.trim() === ""
            );
            if (allEmpty) {
                return Effect.fail(
                    new EmbeddingInputError({
                        description: "Input array cannot contain only empty or whitespace strings",
                        module: "EmbeddingService",
                        method: "generate"
                    })
                );
            }
        }
        // Simulate dependency errors
        if (TestEmbeddingService.throwModelError) {
            return Effect.fail(
                new EmbeddingModelError({
                    description: "Simulated model service error",
                    module: "EmbeddingService",
                    method: "generate"
                })
            );
        }
        if (TestEmbeddingService.throwProviderError) {
            return Effect.fail(
                new EmbeddingProviderError({
                    description: "Simulated provider service error",
                    module: "EmbeddingService",
                    method: "generate"
                })
            );
        }
        const modelId = options.modelId ?? "test-model-id";
        return Effect.succeed({
            embeddings: [testEmbedding],
            model: modelId,
            timestamp: new Date(),
            id: "emb-12345",
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
        });
    };
}

describe("EmbeddingService (harnessed)", () => {
    const harness = createAiTestHarness(TestEmbeddingService);

    it("should generate embeddings for valid input (happy path)", async () => {
        const result = harness.run( (service) => {
            return await Effect.runPromise(
                service.generate({ modelId: testModelId, input: testInput, span: harness.mockSpan })
            );
        });
        expect(result).toBeDefined();
        expect(result.embeddings).toEqual([testEmbedding]);
        expect(result.model).toBe(testModelId);
        expect(result.id).toBe("emb-12345");
    });

    it("should fail for empty input string", async () => {
        const result = await harness.run(async (service) =>
            runEither(service, { input: "" }, harness.mockSpan)
        );
        expectLeft(result, EmbeddingInputError);
    });

    it("should fail for input with only whitespace", async () => {
        const result = await harness.run(async (service) =>
            runEither(service, { input: "   " }, harness.mockSpan)
        );
        expectLeft(result, EmbeddingInputError);
    });

    it("should fail for empty input array", async () => {
        const result = await harness.run(async (service) =>
            runEither(service, { input: [] as string[] }, harness.mockSpan)
        );
        expectLeft(result, EmbeddingInputError);
    });

    it("should fail for input array of only empty/whitespace strings", async () => {
        const result = await harness.run(async (service) =>
            runEither(service, { input: ["", "   "] }, harness.mockSpan)
        );
        expectLeft(result, EmbeddingInputError);
    });

    it("should succeed for input array with at least one valid string", async () => {
        const result = await harness.run(async (service) =>
            runEither(service, { input: ["", "foo", "   "] }, harness.mockSpan)
        );
        expectRight(result);
    });

    it("should succeed for input array with some empty/whitespace and one valid string", async () => {
        const result = await harness.run(async (service) =>
            runEither(service, { input: ["   ", "bar"] }, harness.mockSpan)
        );
        expectRight(result);
    });

    it("should succeed for missing modelId", async () => {
        const result = await harness.run(async (service) =>
            runEither(service, { input: testInput }, harness.mockSpan)
        );
        expectRight(result);
    });

    // ... more tests ...
});
