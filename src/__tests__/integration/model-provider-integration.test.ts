/**
 * @file Integration tests for model and provider services
 * @module tests/integration/model-provider-integration
 */

import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import path from "path";
import { fileURLToPath } from "url";
import { beforeAll, describe, expect, it } from "vitest";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { ResilienceService } from "@/services/execution/resilience/service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up test configuration paths
beforeAll(() => {
  process.env.MASTER_CONFIG_PATH = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../config/master-config.json"
  );
  process.env.PROVIDERS_CONFIG_PATH = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../config/providers.json"
  );
  process.env.MODELS_CONFIG_PATH = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../config/models.json"
  );
});

const testLayer = Layer.provideMerge(
  Layer.provideMerge(
    NodePath.layer,
    Layer.provideMerge(
      ModelService.Default,
      Layer.provideMerge(
        ProviderService.Default,
        Layer.provideMerge(
          ConfigurationService.Default,
          Layer.mergeAll(NodeFileSystem.layer, NodePath.layer)
        )
      )
    )
  ),
  ResilienceService.Default
);

// Test suite for ModelService
describe("ModelService", () => {
  it("should load model configurations", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ModelService;
      const result = yield* service.load();
      expect(result).toBeDefined();
      expect(Array.isArray(result.models)).toBe(true);
    });

    const providedEffect = effect.pipe(
      Effect.provide(testLayer)
    ) as Effect.Effect<void, unknown, never>;
    await Effect.runPromise(providedEffect);
  });

  it("should validate models from configured providers", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ModelService;
      const result = yield* service.exists("gpt-4o");
      expect(result).toBe(true);
    });

    const providedEffect = effect.pipe(
      Effect.provide(testLayer)
    ) as Effect.Effect<void, unknown, never>;
    await Effect.runPromise(providedEffect);
  });

  it("should return provider name for a model", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ModelService;
      const result = yield* service.getProviderName("gpt-4o");
      expect(result).toBe("openai");
    });

    const providedEffect = effect.pipe(
      Effect.provide(testLayer)
    ) as Effect.Effect<void, unknown, never>;
    await Effect.runPromise(providedEffect);
  });
});

// Test suite for ProviderService
describe("ProviderService", () => {
  it("should return an AI SDK provider by name", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const provider = yield* service.getAiSdkProvider("openai");
      expect(provider).toBeDefined();
    });

    const providedEffect = effect.pipe(
      Effect.provide(testLayer)
    ) as Effect.Effect<void, unknown, never>;
    await Effect.runPromise(providedEffect);
  });

  it("should return an AI SDK language model by provider and model ID", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const model = yield* service.getAiSdkLanguageModel("openai", "gpt-4o");
      expect(model).toBeDefined();
    });

    const providedEffect = effect.pipe(
      Effect.provide(testLayer)
    ) as Effect.Effect<void, unknown, never>;
    await Effect.runPromise(providedEffect);
  });

  it("throws on unknown provider name", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const result = yield* Effect.either(
        service.getAiSdkProvider("nonexistent")
      );
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        // Check if it's a ProviderNotFoundError by checking for providerName property
        expect(result.left).toHaveProperty("providerName");
        expect((result.left as any).providerName).toBe("nonexistent");
      }
    });

    const providedEffect = effect.pipe(
      Effect.provide(testLayer)
    ) as Effect.Effect<void, unknown, never>;
    await Effect.runPromise(providedEffect);
  });
});
