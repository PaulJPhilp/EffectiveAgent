import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import {
  EffectiveMessage,
  ModelCapability,
  TextPart,
  ToolCallPart,
} from "@/schema.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import type { ToolRegistryApi } from "@/services/ai/tool-registry/api.js";
import type { EffectiveInput } from "@/types.js";
import {
  ProviderServiceError,
  ProviderServiceConfigError,
  ProviderMissingCapabilityError,
  ProviderOperationError,
} from "@/services/ai/provider/errors.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Chunk, Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeXaiClient } from "../xai-provider-client.js";

describe("xAI Provider Client", () => {
  const testDir = join(process.cwd(), "test-xai-configs");
  const masterConfigPath = join(testDir, "master-config.json");
  const modelsConfigPath = join(testDir, "models.json");
  const providersConfigPath = join(testDir, "providers.json");
  const policyConfigPath = join(testDir, "policy.json");

  const masterConfigData = {
    name: "Test Master Config",
    version: "1.0.0",
    runtimeSettings: {
      fileSystemImplementation: "node",
    },
    configPaths: {
      providers: providersConfigPath,
      models: modelsConfigPath,
      policy: policyConfigPath,
    },
  };

  const modelsConfigData = {
    name: "Test Models Config",
    version: "1.0.0",
    models: [
      {
        id: "grok-3",
        provider: "xai",
        capabilities: ["chat", "text-generation"],
      },
      {
        id: "grok-2-image",
        provider: "xai",
        capabilities: ["image-generation"],
      },
    ],
  };

  const providersConfigData = {
    name: "Test Providers Config",
    version: "1.0.0",
    providers: [
      {
        name: "xai",
        displayName: "xAI",
        type: "llm",
        apiKeyEnvVar: "XAI_API_KEY",
        baseUrl: "https://api.x.ai/v1",
      },
    ],
  };

  const policyConfigData = {
    name: "Test Policy Config",
    policies: [
      {
        id: "default",
        name: "Default Policy",
        type: "allow",
        resource: "*",
        priority: 1,
        enabled: true,
      },
    ],
  };

  beforeEach(() => {
    // Create test directory and files
    mkdirSync(testDir, { recursive: true });
    writeFileSync(masterConfigPath, JSON.stringify(masterConfigData, null, 2));
    writeFileSync(modelsConfigPath, JSON.stringify(modelsConfigData, null, 2));
    writeFileSync(
      providersConfigPath,
      JSON.stringify(providersConfigData, null, 2)
    );
    writeFileSync(policyConfigPath, JSON.stringify(policyConfigData, null, 2));

    // Set up environment
    process.env.XAI_API_KEY = "test-xai-key";
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
    delete process.env.XAI_API_KEY;
    // biome-ignore lint/performance/noDelete: <explanation>
    delete process.env.MASTER_CONFIG_PATH;
  });

  const testLayer = Layer.mergeAll(
    NodeFileSystem.layer,
    ConfigurationService.Default,
    ModelService.Default,
    ToolRegistryService.Default
  );

  const withLayers = <A, E>(
    effect: Effect.Effect<A, E, ModelServiceApi | ToolRegistryApi>
  ) => effect.pipe(Effect.provide(testLayer));

  describe("Client Creation", () => {
    it("should create xAI client with valid API key", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-xai-key");
          expect(client).toBeDefined();
          expect(typeof client.generateText).toBe("function");
          expect(typeof client.chat).toBe("function");
          expect(typeof client.generateImage).toBe("function");
        })
      ));

    it("should handle different API keys", () =>
      withLayers(
        Effect.gen(function* () {
          const client1 = yield* makeXaiClient("key1");
          const client2 = yield* makeXaiClient("key2");

          expect(client1).toBeDefined();
          expect(client2).toBeDefined();

          // Both clients should have the same capabilities
          const caps1 = yield* client1.getCapabilities();
          const caps2 = yield* client2.getCapabilities();

          expect(caps1.size).toBe(caps2.size);
          return { client1, client2 };
        })
      ));
  });

  describe("Capabilities", () => {
    it("should return correct supported capabilities", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const capabilities = yield* client.getCapabilities();

          expect(capabilities).toBeInstanceOf(Set);
          expect(capabilities.has("chat")).toBe(true);
          expect(capabilities.has("text-generation")).toBe(true);
          expect(capabilities.has("image-generation")).toBe(true);

          // xAI does not support these capabilities
          expect(capabilities.has("tool-use")).toBe(false);
          expect(capabilities.has("function-calling")).toBe(false);
          expect(capabilities.has("embeddings")).toBe(false);
          expect(capabilities.has("audio")).toBe(false);
          return capabilities;
        })
      ));

    it("should return provider information", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const provider = yield* client.getProvider();

          expect(provider.name).toBe("xai");
          expect(provider.capabilities).toBeInstanceOf(Set);
          expect(provider.capabilities.has("chat")).toBe(true);
          expect(provider.capabilities.has("text-generation")).toBe(true);
          expect(provider.capabilities.has("image-generation")).toBe(true);
          return provider;
        })
      ));
  });

  describe("Model Management", () => {
    it("should return empty models list", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const models = yield* client.getModels();
          expect(Array.isArray(models)).toBe(true);
          expect(models.length).toBe(0);
          return models;
        })
      ));

    it("should return default model IDs for supported capabilities", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");

          const chatModel = yield* client.getDefaultModelIdForProvider(
            "xai",
            "chat"
          );
          expect(chatModel).toBe("grok-3");

          const textModel = yield* client.getDefaultModelIdForProvider(
            "xai",
            "text-generation"
          );
          expect(textModel).toBe("grok-3");

          const imageModel = yield* client.getDefaultModelIdForProvider(
            "xai",
            "image-generation"
          );
          expect(imageModel).toBe("grok-2-image");

          return { chatModel, textModel, imageModel };
        })
      ));

    it("should fail for unsupported capabilities", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");

          const result = yield* Effect.either(
            client.getDefaultModelIdForProvider("xai", "embeddings")
          );
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
            expect(
              (result.left as ProviderMissingCapabilityError).providerName
            ).toBe("xai");
            expect(
              (result.left as ProviderMissingCapabilityError).capability
            ).toBe("embeddings");
          }
          return result;
        })
      ));

    it("should fail for wrong provider name", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");

          const result = yield* Effect.either(
            client.getDefaultModelIdForProvider("openai", "chat")
          );
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
            expect(
              (result.left as ProviderMissingCapabilityError).providerName
            ).toBe("openai");
            expect(
              (result.left as ProviderMissingCapabilityError).capability
            ).toBe("chat");
          }
          return result;
        })
      ));
  });

  describe("Unsupported Tool Operations", () => {
    it("should fail tool validation with missing capability error", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const result = yield* Effect.either(
            client.validateToolInput("testTool:validate", { param: "value" })
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
            expect(
              (result.left as ProviderMissingCapabilityError).providerName
            ).toBe("xai");
            expect(
              (result.left as ProviderMissingCapabilityError).capability
            ).toBe("tool-use");
          }
          return result;
        })
      ));

    it("should fail tool execution with missing capability error", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const result = yield* Effect.either(
            client.executeTool("testTool:execute", { param: "value" })
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
            expect(
              (result.left as ProviderMissingCapabilityError).providerName
            ).toBe("xai");
            expect(
              (result.left as ProviderMissingCapabilityError).capability
            ).toBe("tool-use");
          }
          return result;
        })
      ));

    it("should fail tool result processing with missing capability error", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const result = yield* Effect.either(
            client.processToolResult("testTool:execute", { result: "data" })
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
            expect(
              (result.left as ProviderMissingCapabilityError).providerName
            ).toBe("xai");
            expect(
              (result.left as ProviderMissingCapabilityError).capability
            ).toBe("tool-use");
          }
          return result;
        })
      ));
  });

  describe("Unsupported Generation Operations", () => {
    it("should fail object generation with missing capability error", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const input: EffectiveInput = {
            text: "Generate an object",
            messages: Chunk.of(
              new EffectiveMessage({
                role: "user",
                parts: Chunk.of(
                  new TextPart({ _tag: "Text", content: "Generate an object" })
                ),
                metadata: {},
              })
            ),
          };

          const result = yield* Effect.either(
            client.generateObject(input, { modelId: "grok-3", schema: {} })
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
            expect(
              (result.left as ProviderMissingCapabilityError).providerName
            ).toBe("xai");
            expect(
              (result.left as ProviderMissingCapabilityError).capability
            ).toBe("function-calling");
          }
          return result;
        })
      ));

    it("should fail speech generation with missing capability error", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const result = yield* Effect.either(
            client.generateSpeech("Hello world", {
              modelId: "grok-3",
              voice: "alloy",
            })
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
            expect(
              (result.left as ProviderMissingCapabilityError).providerName
            ).toBe("xai");
            expect(
              (result.left as ProviderMissingCapabilityError).capability
            ).toBe("audio");
          }
          return result;
        })
      ));

    it("should fail transcription with missing capability error", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const audioBuffer = new ArrayBuffer(1024);
          const result = yield* Effect.either(
            client.transcribe(audioBuffer, { modelId: "whisper-1" })
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
            expect(
              (result.left as ProviderMissingCapabilityError).providerName
            ).toBe("xai");
            expect(
              (result.left as ProviderMissingCapabilityError).capability
            ).toBe("audio");
          }
          return result;
        })
      ));

    it("should fail embeddings generation with missing capability error", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const result = yield* Effect.either(
            client.generateEmbeddings(["Hello world"], {
              modelId: "text-embedding-3-small",
            })
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
            expect(
              (result.left as ProviderMissingCapabilityError).providerName
            ).toBe("xai");
            expect(
              (result.left as ProviderMissingCapabilityError).capability
            ).toBe("embeddings");
          }
          return result;
        })
      ));

    it("should handle API errors gracefully in generateImage", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("invalid-key");
          const input: EffectiveInput = {
            text: "A beautiful sunset",
            messages: Chunk.of(
              new EffectiveMessage({
                role: "user",
                parts: Chunk.of(
                  new TextPart({ _tag: "Text", content: "A beautiful sunset" })
                ),
                metadata: {},
              })
            ),
          };

          const result = yield* Effect.either(
            client.generateImage(input, { modelId: "grok-2-image" })
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderOperationError);
            if (result.left instanceof ProviderOperationError) {
              expect(result.left.providerName).toBe("xai");
              expect(result.left.operation).toBe("generateImage");
            }
          }
          return result;
        })
      ));

    it("should handle empty messages in chat", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const input: EffectiveInput = {
            text: "Hello",
            messages: Chunk.empty(),
          };

          const result = yield* Effect.either(
            client.chat(input, { modelId: "grok-3" })
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderOperationError);
          }
          return result;
        })
      ));

    it("should handle empty prompt in generateImage", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const input: EffectiveInput = {
            text: "Hello",
            messages: Chunk.empty(),
          };

          const result = yield* Effect.either(
            client.generateImage(input, { modelId: "grok-2-image" })
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderOperationError);
            expect((result.left as ProviderOperationError).message).toContain(
              "No prompt found"
            );
          }
          return result;
        })
      ));

    it("should extract prompt from messages for generateImage", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const input: EffectiveInput = {
            text: "Hello",
            messages: Chunk.of(
              new EffectiveMessage({
                role: "user",
                parts: Chunk.of(
                  new TextPart({ _tag: "Text", content: "A beautiful sunset" })
                ),
                metadata: {},
              })
            ),
          };

          // This will fail due to API call, but should not fail due to missing prompt
          const result = yield* Effect.either(
            client.generateImage(input, { modelId: "grok-2-image" })
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderOperationError);
            // Should not be the "No prompt found" error
            expect(
              (result.left as ProviderOperationError).message
            ).not.toContain("No prompt found");
          }
          return result;
        })
      ));
  });

  describe("Vercel Provider Integration", () => {
    it("should handle setVercelProvider", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const mockProvider = {
            name: "xai" as const,
            provider: {} as any,
            capabilities: new Set<ModelCapability>([
              "text-generation",
              "chat",
              "image-generation",
            ]),
          };

          const result = yield* client.setVercelProvider(mockProvider);
          expect(result).toBeUndefined();
          return result;
        })
      ));

    it("should handle message mapping", () =>
      withLayers(
        Effect.gen(function* () {
          const client = yield* makeXaiClient("test-key");
          const input: EffectiveInput = {
            text: "Hello, how are you?",
            messages: Chunk.make(
              new EffectiveMessage({
                role: "system",
                parts: Chunk.of(
                  new TextPart({
                    _tag: "Text",
                    content: "You are a helpful assistant",
                  })
                ),
                metadata: {},
              }),
              new EffectiveMessage({
                role: "user",
                parts: Chunk.of(
                  new TextPart({ _tag: "Text", content: "Hello, how are you?" })
                ),
                metadata: {},
              })
            ),
          };

          const result = yield* Effect.either(
            client.chat(input, { modelId: "grok-3" })
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(ProviderOperationError);
            if (result.left instanceof ProviderOperationError) {
              expect(result.left.providerName).toBe("xai");
              expect(result.left.operation).toBe("chat");
            }
          }
          return result;
        })
      ));
  });
});
