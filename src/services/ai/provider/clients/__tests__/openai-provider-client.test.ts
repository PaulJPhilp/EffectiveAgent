import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { ModelService } from "@/services/ai/model/service.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeOpenAIClient } from "../openai-provider-client.js";

describe("OpenAI Provider Client", () => {
  const testDir = join(process.cwd(), "test-configs");
  const masterConfigPath = join(testDir, "master-config.json");
  const modelsConfigPath = join(testDir, "models.json");
  const providersConfigPath = join(testDir, "providers.json");
  const policyConfigPath = join(testDir, "policy.json");

  const masterConfigData = {
    configPaths: {
      models: modelsConfigPath,
      providers: providersConfigPath,
      policy: policyConfigPath
    }
  };

  const modelsConfigData = {
    models: [
      {
        id: "gpt-4",
        provider: "openai",
        capabilities: ["chat", "text-generation", "embeddings", "function-calling"]
      }
    ]
  };

  const providersConfigData = {
    providers: [
      {
        name: "openai",
        displayName: "OpenAI",
        type: "llm",
        apiKeyEnvVar: "OPENAI_API_KEY",
        baseUrl: "https://api.openai.com/v1"
      }
    ]
  };

  const policyConfigData = {
    policies: [
      {
        id: "default",
        name: "Default Policy",
        type: "allow",
        resource: "*",
        priority: 1,
        enabled: true
      }
    ]
  };

  beforeEach(() => {
    // Create test directory and files
    mkdirSync(testDir, { recursive: true });
    writeFileSync(masterConfigPath, JSON.stringify(masterConfigData, null, 2));
    writeFileSync(modelsConfigPath, JSON.stringify(modelsConfigData, null, 2));
    writeFileSync(providersConfigPath, JSON.stringify(providersConfigData, null, 2));
    writeFileSync(policyConfigPath, JSON.stringify(policyConfigData, null, 2));

    // Set up environment
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.MASTER_CONFIG_PATH = masterConfigPath;
  });

  afterEach(() => {
    // Clean up test files
    try {
      unlinkSync(masterConfigPath);
      unlinkSync(modelsConfigPath);
      unlinkSync(providersConfigPath);
      unlinkSync(policyConfigPath);
      rmdirSync(testDir);
    } catch (error) {
      // Ignore cleanup errors
    }
    // biome-ignore lint/performance/noDelete: <explanation>
    delete process.env.OPENAI_API_KEY;
    // biome-ignore lint/performance/noDelete: <explanation>
    delete process.env.MASTER_CONFIG_PATH;
  });

  const withLayers = <R, E, A>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(
      Effect.provide(Layer.mergeAll(
        NodeFileSystem.layer,
        ConfigurationService.Default,
        ModelService.Default,
        ToolRegistryService.Default,
      ))
    );

  it("should create OpenAI client with valid config", () =>
    withLayers(Effect.gen(function* () {
      const client = yield* makeOpenAIClient("test-key");
      expect(client).toBeDefined();
      expect(typeof client.generateText).toBe("function");
      expect(typeof client.chat).toBe("function");
    }))
  );

  describe("getCapabilities", () => {
    it("should return supported capabilities", () =>
      withLayers(Effect.gen(function* () {
        const client = yield* makeOpenAIClient("test-key");
        const capabilities = yield* client.getCapabilities();

        expect(capabilities).toBeInstanceOf(Set);
        expect(capabilities.has("chat")).toBe(true);
        expect(capabilities.has("text-generation")).toBe(true);
        expect(capabilities.has("embeddings")).toBe(true);
        expect(capabilities.has("image-generation")).toBe(true);
        expect(capabilities.has("function-calling")).toBe(true);
        return capabilities;
      }))
    );
  });

  describe("tool methods", () => {
    it("should fail tool validation as expected", () =>
      withLayers(Effect.gen(function* () {
        const client = yield* makeOpenAIClient("test-key");
        const result = yield* Effect.either(client.validateToolInput("testTool", { param: "value" }));
        expect(result._tag).toBe("Left");
      }))
    );
  });

  describe("client configuration", () => {
    it("should handle different API keys", () =>
      withLayers(Effect.gen(function* () {
        const client1 = yield* makeOpenAIClient("key1");
        const client2 = yield* makeOpenAIClient("key2");

        expect(client1).toBeDefined();
        expect(client2).toBeDefined();

        // Both clients should have the same capabilities
        const caps1 = yield* client1.getCapabilities();
        const caps2 = yield* client2.getCapabilities();

        expect(caps1.size).toBe(caps2.size);
        return { client1, client2 };
      }))
    );
  });
});
