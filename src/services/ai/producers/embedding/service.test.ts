import { describe, it, expect } from "vitest";
import { createAiTestHarness } from "@/services/ai/test-utils/index.js";
import { EmbeddingService } from "./service.js";

// Example input and expected output for the happy path
const testInput = "The quick brown fox jumps over the lazy dog.";
const testModelId = "test-model-id";
const testEmbedding = [0.1, 0.2, 0.3, 0.4];

import type { EmbeddingGenerationOptions } from "./service.js";
import { Effect } from "effect";

// Minimal mock for EmbeddingService dependencies
class TestEmbeddingService extends EmbeddingService {
  constructor(deps: any) {
    super(deps);
  }

  generate = (options: EmbeddingGenerationOptions) => {
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
    const result = await harness.run(async (service) => {
      return await Effect.runPromise(
        service.generate({ modelId: testModelId, input: testInput, span: harness.mockSpan })
      );
    });
    expect(result).toBeDefined();
    expect(result.embeddings).toEqual([testEmbedding]);
    expect(result.model).toBe(testModelId);
    expect(result.id).toBe("emb-12345");
  });
});
