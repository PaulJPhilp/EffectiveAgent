import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { ModelConfigFileTag, ModelConfigurationServiceLive } from "../modelConfigurationService.js";
import type { ModelConfig, ModelConfigFile } from "../schema.js";
import { ModelConfigurationService } from "../types.js";

describe("ModelConfigurationService", () => {
  const testModels: ModelConfig[] = [
    {
      id: "gpt-4",
      name: "GPT-4",
      provider: "openai",
      capabilities: ["text-generation"],
      modelName: "gpt-4-turbo-preview",
      contextWindowSize: "large",
      maxTokens: 4096,
      tags: ["test"],
      version: "1.0.0",
      costPer1kInputTokens: 0.01,
      costPer1kOutputTokens: 0.03,
      rateLimit: {
        requestsPerMinute: 60
      },
      metadata: {
        description: "Test model configuration"
      }
    },
    {
      id: "claude-3",
      name: "Claude 3",
      provider: "anthropic",
      capabilities: ["text-generation", "vision"],
      modelName: "claude-3-opus",
      contextWindowSize: "large",
      maxTokens: 4096,
      tags: ["test"],
      version: "1.0.0",
      costPer1kInputTokens: 0.015,
      costPer1kOutputTokens: 0.075,
      rateLimit: {
        requestsPerMinute: 50
      },
      metadata: {
        description: "Claude 3 Opus model"
      }
    },
    {
      id: "gemini-pro",
      name: "Gemini Pro",
      provider: "google",
      capabilities: ["text-generation", "code-generation", "reasoning"],
      modelName: "gemini-pro",
      contextWindowSize: "large",
      maxTokens: 8192,
      tags: ["test", "latest"],
      version: "1.5.0",
      costPer1kInputTokens: 0.001,
      costPer1kOutputTokens: 0.002,
      rateLimit: {
        requestsPerMinute: 100
      },
      metadata: {
        description: "Google's Gemini Pro model"
      }
    },
    {
      id: "gpt-4-vision",
      name: "GPT-4 Vision",
      provider: "openai",
      capabilities: ["text-generation", "vision"],
      modelName: "gpt-4-vision-preview",
      contextWindowSize: "large",
      maxTokens: 4096,
      tags: ["test", "vision"],
      version: "1.1.0",
      costPer1kInputTokens: 0.01,
      costPer1kOutputTokens: 0.03,
      rateLimit: {
        requestsPerMinute: 60
      },
      metadata: {
        description: "GPT-4 with vision capabilities"
      }
    }
  ];

  const testConfig: ModelConfigFile = {
    name: "test-models",
    version: "1.0.0",
    tags: ["test"],
    models: testModels,
    description: "Test model configuration"
  };

  const emptyConfig: ModelConfigFile = {
    name: "empty-models",
    version: "1.0.0",
    tags: ["test"],
    models: [],
    description: "Empty model configuration"
  };

  // Standard test layer with all models
  const testLayer = ModelConfigurationServiceLive.pipe(
    Layer.provide(Layer.succeed(ModelConfigFileTag, testConfig))
  );

  // Empty test layer with no models
  const emptyLayer = ModelConfigurationServiceLive.pipe(
    Layer.provide(Layer.succeed(ModelConfigFileTag, emptyConfig))
  );

  it("should successfully get a model config by ID", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ModelConfigurationService;
      const config = yield* service.getModelConfig("gpt-4");
      return config;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );
    expect(result).toEqual(testModels[0]);
  });

  it("should fail when model ID is not found", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ModelConfigurationService;
      const config = yield* service.getModelConfig("non-existent-model");
      return config;
    });

    try {
      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).toContain("Model configuration not found for ID: non-existent-model");
    }
  });

  it("should list all available models", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ModelConfigurationService;
      const models = yield* service.listModels();
      return models;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );
    expect(result).toEqual(testModels);
    expect(result).toHaveLength(5);
  });

  it("should filter models by capability", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ModelConfigurationService;
      const models = yield* service.findModelsByCapability(["vision"]);
      return models;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toContain("claude-3");
    expect(result.map(m => m.id)).toContain("gpt-4-vision");
  });

  it("should filter models by provider", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ModelConfigurationService;
      const models = yield* service.findModelsByCapability(["text-generation"]);
      return models.filter(model => model.provider === "openai");
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toEqual(["gpt-4", "gpt-4-vision"]);
  });

  // NEW TESTS

  it("should return empty array when no models match capability", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ModelConfigurationService;
      const models = yield* service.findModelsByCapability(["reasoning"]);
      return models;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("should return empty array when model collection is empty", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ModelConfigurationService;
      const models = yield* service.listModels();
      return models;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(emptyLayer))
    );
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("should find models by multiple capabilities (AND condition)", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ModelConfigurationService;
      // First get all models with multiple capabilities manually
      const allModels = yield* service.listModels();
      // Then filter those that have BOTH text-generation AND vision
      const modelsWithBothCapabilities = allModels.filter(model =>
        model.capabilities.includes("text-generation") &&
        model.capabilities.includes("vision")
      );
      return modelsWithBothCapabilities;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );

    // We expect exactly 2 models to have both capabilities
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toContain("claude-3");
    expect(result.map(m => m.id)).toContain("gpt-4-vision");
    // Shouldn't include gpt-4 which only has text-generation
    expect(result.map(m => m.id)).not.toContain("gpt-4");
  });

  it("should find models by unique capability combinations", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ModelConfigurationService;
      // Find models with image-analysis capability
      const models = yield* service.findModelsByCapability(["vision"]);
      return models;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("gpt-4-vision");
  });

  it("should find models by tag", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ModelConfigurationService;
      // Get all models
      const allModels = yield* service.listModels();
      // Filter by tag
      const latestModels = allModels.filter(model => model.tags.includes("latest"));
      return latestModels;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("gemini-pro");
  });

  it("should filter models by version", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ModelConfigurationService;
      // Get all models
      const allModels = yield* service.listModels();
      // Filter to newer versions (semver comparison)
      const newerModels = allModels.filter(model => {
        const [major, minor] = model.version.split(".").map(Number);
        return major > 1 || (major === 1 && minor >= 5);
      });
      return newerModels;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toContain("gemini-pro"); // 1.5.0
    expect(result.map(m => m.id)).toContain("stable-diffusion"); // 2.0.0
  });

  it("should throw error when getting model from empty collection", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ModelConfigurationService;
      return yield* service.getModelConfig("any-model");
    });

    try {
      await Effect.runPromise(program.pipe(Effect.provide(emptyLayer)));
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).toContain("Model configuration not found");
    }
  });
});
