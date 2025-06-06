/**
 * @file Tests for the MODEL_UNIVERSE implementation in the ModelService
 */

import { ConfigurationService } from "@/services/core/configuration/service.js";
import { NodeContext } from "@effect/platform-node";
import type { ModelServiceApi } from "../api.js";
import { ModelService } from "../service.js";

// Set up environment before imports
process.env.MODELS_CONFIG_PATH = process.cwd() + "/src/services/ai/model/__tests__/config/models.json";
console.log('MODELS_CONFIG_PATH:', process.env.MODELS_CONFIG_PATH);

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { MODEL_IDS, MODEL_UNIVERSE } from "../model-universe.js";

const provideLayer = <A>(effect: Effect.Effect<A, never, ModelServiceApi>) =>
  Effect.runPromiseExit(
    effect.pipe(
      Effect.provide(ModelService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeContext.layer)
    )
  );

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

describe("MODEL_UNIVERSE capabilities", () => {
  it("should find models by capability", () => {
    const chatModels = MODEL_UNIVERSE.filter(m => m.vendorCapabilities.includes("chat"));
    expect(chatModels.length).toBeGreaterThan(0);

    const textGenModels = MODEL_UNIVERSE.filter(m => m.vendorCapabilities.includes("text-generation"));
    expect(textGenModels.length).toBeGreaterThan(0);

    const openaiModels = MODEL_UNIVERSE.filter(m => m.provider === "openai");
    expect(openaiModels.length).toBeGreaterThan(0);
  });

  it("should have correct provider names for model IDs", () => {
    const gpt4Model = MODEL_UNIVERSE.find(m => m.id === "gpt-4o");
    const claudeModel = MODEL_UNIVERSE.find(m => m.id === "claude-3-opus");

    expect(gpt4Model?.provider).toBe("openai");
    expect(claudeModel?.provider).toBe("anthropic");
  });

  it("should find models with multiple capabilities", () => {
    const modelsWithBothCapabilities = MODEL_UNIVERSE.filter(m =>
      m.vendorCapabilities.includes("chat") &&
      m.vendorCapabilities.includes("text-generation")
    );
    expect(modelsWithBothCapabilities.length).toBeGreaterThan(0);

    const testModelId = "gpt-4o";
    const modelData = MODEL_UNIVERSE.find(m => m.id === testModelId);
    expect(modelData).toBeDefined();
    expect(modelData?.vendorCapabilities).toContain("chat");
    expect(modelData?.vendorCapabilities).toContain("text-generation");
    expect(modelData?.provider).toBe("openai");
  });

  it("should have expected model IDs", () => {
    expect(MODEL_IDS).toContain("gpt-4o");
    expect(MODEL_IDS).toContain("claude-3-opus");
  });
});
