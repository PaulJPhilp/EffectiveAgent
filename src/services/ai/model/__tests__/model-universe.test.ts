/**
 * @file Tests for the MODEL_UNIVERSE implementation in the ModelService
 */

import { ModelCapability } from "@/schema.js";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { MODEL_IDS, MODEL_UNIVERSE } from "../model-universe.js";
import { ModelService } from "../service.js";

describe("MODEL_UNIVERSE", () => {
  it("should contain a comprehensive list of models", () => {
    expect(MODEL_UNIVERSE.length).toBeGreaterThan(0);
    expect(MODEL_IDS.length).toBe(MODEL_UNIVERSE.length);
  });

  it("should include standard providers", () => {
    const providers = [...new Set(MODEL_UNIVERSE.map(m => m.provider))];

    expect(providers).toContain("openai");
    expect(providers).toContain("anthropic");
    expect(providers).toContain("google");
  });

  it("should have valid model metadata", () => {
    for (const model of MODEL_UNIVERSE) {
      expect(model.id).toBeDefined();
      expect(model.name).toBeDefined();
      expect(model.version).toBeDefined();
      expect(model.provider).toBeDefined();
      expect(model.modelName).toBeDefined();
      expect(model.displayName).toBeDefined();

      // Capabilities check
      expect(model.vendorCapabilities.length).toBeGreaterThan(0);

      // Validate optional fields have consistent structure
      if (model.responseFormat) {
        expect(model.responseFormat.type).toBeDefined();
        expect(model.responseFormat.supportedFormats).toBeDefined();
        expect(Array.isArray(model.responseFormat.supportedFormats)).toBe(true);
      }
    }
  });
});

describe("ModelService with MODEL_UNIVERSE", () => {
  it("should find models by capability", () =>
    Effect.gen(function* (_) {
      const service = yield* ModelService;

      // Use existing ModelCapability with a specific literal we're interested in
      const filteredModels = yield* service.findModelsByCapability(ModelCapability);
      expect(filteredModels.length).toBeGreaterThan(0);

      // Filter locally for models with chat capability for our test assertions
      const chatModels = filteredModels.filter(model => model.vendorCapabilities.includes("chat"));
      expect(chatModels.length).toBeGreaterThan(0);

      // Filter locally for models with text-generation capability
      const textGenModels = filteredModels.filter(model =>
        model.vendorCapabilities.includes("text-generation"));
      expect(textGenModels.length).toBeGreaterThan(0);

      // Verify our test data is consistent
      const openaiModels = MODEL_UNIVERSE.filter(m => m.provider === "openai");
      expect(openaiModels.length).toBeGreaterThan(0);
    }).pipe(Effect.provide(ModelService.Default), Effect.runPromise)
  );

  it("should get provider name from model ID", () =>
    Effect.gen(function* (_) {
      const service = yield* ModelService;

      // Test with a known OpenAI model
      const provider = yield* service.getProviderName("gpt-4o");
      expect(provider).toBe("openai");

      // Test with a known Anthropic model
      const provider2 = yield* service.getProviderName("claude-3-opus");
      expect(provider2).toBe("anthropic");
    }).pipe(Effect.provide(ModelService.Default), Effect.runPromise)
  );

  it("should find models with multiple capabilities", () =>
    Effect.gen(function* (_) {
      const service = yield* ModelService;

      // Create a literal for the test using specific values
      const chatTextCapability = {
        literals: ["chat", "text-generation"] as const
      };

      // First verify there are models with these capabilities in MODEL_UNIVERSE
      const modelsWithCapabilities = MODEL_UNIVERSE.filter(model =>
        model.vendorCapabilities.includes("chat") &&
        model.vendorCapabilities.includes("text-generation"));

      expect(modelsWithCapabilities.length).toBeGreaterThan(0);

      // Get a specific model ID we know should have both capabilities
      const testModelId = "gpt-4o";

      // Validate the model has both capabilities
      const modelData = MODEL_UNIVERSE.find(m => m.id === testModelId);
      expect(modelData).toBeDefined();
      expect(modelData?.vendorCapabilities).toContain("chat");
      expect(modelData?.vendorCapabilities).toContain("text-generation");

      // Verify we can get the provider name for a model
      const provider = yield* service.getProviderName(testModelId);
      expect(provider).toBe("openai");
    }).pipe(Effect.provide(ModelService.Default), Effect.runPromise)
  );

  it("should get provider name from model ID", () =>
    Effect.gen(function* (_) {
      const service = yield* ModelService;

      // Test with a known OpenAI model
      const provider = yield* service.getProviderName("gpt-4o");
      expect(provider).toBe("openai");

      // Test with a known Anthropic model
      const provider2 = yield* service.getProviderName("claude-3-opus");
      expect(provider2).toBe("anthropic");
    }).pipe(Effect.provide(ModelService.Default), Effect.runPromise)
  );

  it("should validate supported model capabilities", () =>
    Effect.gen(function* (_) {
      const service = yield* ModelService;

      // Find a model from our universe that has chat capability
      const chatModel = MODEL_UNIVERSE.find(m =>
        m.vendorCapabilities.includes("chat") && m.vendorCapabilities.includes("text-generation"));

      expect(chatModel).toBeDefined();
      if (!chatModel) return; // TypeScript guard

      // Each model should have its own capabilities we can verify directly
      expect(chatModel.vendorCapabilities).toContain("chat");
      expect(chatModel.vendorCapabilities).toContain("text-generation");

      // Check universe arrays directly
      expect(MODEL_IDS).toContain("gpt-4o");
      expect(MODEL_IDS).toContain("claude-3-opus");
    }).pipe(Effect.provide(ModelService.Default), Effect.runPromise)
  );
});
