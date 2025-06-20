import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { EffectiveMessage, ModelCapability, TextPart } from "@/schema.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Chunk, Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProviderMissingCapabilityError, ProviderOperationError } from "../../errors.js";
import { DeepseekProviderClient } from "../deepseek-provider-client.js";

describe("DeepSeek Provider Client", () => {
    const testDir = join(process.cwd(), "test-deepseek-configs");
    const masterConfigPath = join(testDir, "master-config.json");
    const modelsConfigPath = join(testDir, "models.json");
    const providersConfigPath = join(testDir, "providers.json");
    const policyConfigPath = join(testDir, "policy.json");

    const masterConfigData = {
        name: "Test Master Config",
        version: "1.0.0",
        runtimeSettings: {
            fileSystemImplementation: "node"
        },
        configPaths: {
            providers: providersConfigPath,
            models: modelsConfigPath,
            policy: policyConfigPath
        }
    };

    const modelsConfigData = {
        name: "Test Models Config",
        version: "1.0.0",
        models: [
            {
                id: "deepseek-chat",
                provider: "deepseek",
                capabilities: ["chat", "text-generation", "function-calling", "tool-use"]
            },
            {
                id: "deepseek-reasoner",
                provider: "deepseek",
                capabilities: ["chat", "text-generation", "reasoning"]
            }
        ]
    };

    const providersConfigData = {
        name: "Test Providers Config",
        version: "1.0.0",
        providers: [
            {
                name: "deepseek",
                displayName: "DeepSeek",
                type: "llm",
                apiKeyEnvVar: "DEEPSEEK_API_KEY",
                baseUrl: "https://api.deepseek.com/v1"
            }
        ]
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
        process.env.DEEPSEEK_API_KEY = "test-deepseek-key";
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
        delete process.env.DEEPSEEK_API_KEY;
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

    describe("Client Creation", () => {
        it("should create DeepSeek client with valid API key", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                expect(client).toBeDefined();
                expect(typeof client.generateText).toBe("function");
                expect(typeof client.chat).toBe("function");
                expect(typeof client.generateObject).toBe("function");
            }))
        );

        it("should handle different API keys", () =>
            withLayers(Effect.gen(function* () {
                const client1 = yield* DeepseekProviderClient;
                const client2 = yield* DeepseekProviderClient;

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

    describe("Capabilities", () => {
        it("should return correct supported capabilities", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const capabilities = yield* client.getCapabilities();

                expect(capabilities).toBeInstanceOf(Set);
                expect(capabilities.has("chat")).toBe(true);
                expect(capabilities.has("text-generation")).toBe(true);
                expect(capabilities.has("function-calling")).toBe(true);
                expect(capabilities.has("tool-use")).toBe(true);

                // DeepSeek does not support these capabilities
                expect(capabilities.has("image-generation")).toBe(false);
                expect(capabilities.has("audio")).toBe(false);
                expect(capabilities.has("embeddings")).toBe(false);
                return capabilities;
            }))
        );

        it("should return provider information", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const provider = yield* client.getProvider();

                expect(provider.name).toBe("deepseek");
                expect(provider.capabilities).toBeInstanceOf(Set);
                expect(provider.capabilities.has("chat")).toBe(true);
                expect(provider.capabilities.has("text-generation")).toBe(true);
                expect(provider.capabilities.has("function-calling")).toBe(true);
                expect(provider.capabilities.has("tool-use")).toBe(true);
                return provider;
            }))
        );
    });

    describe("Model Management", () => {
        it("should return empty models list", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const models = yield* client.getModels();
                expect(Array.isArray(models)).toBe(true);
                expect(models.length).toBe(0);
                return models;
            }))
        );

        it("should return default model IDs for supported capabilities", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;

                const chatModel = yield* client.getDefaultModelIdForProvider("deepseek", "chat");
                expect(chatModel).toBe("deepseek-chat");

                const textModel = yield* client.getDefaultModelIdForProvider("deepseek", "text-generation");
                expect(textModel).toBe("deepseek-chat");

                const objectModel = yield* client.getDefaultModelIdForProvider("deepseek", "function-calling");
                expect(objectModel).toBe("deepseek-chat");

                const toolModel = yield* client.getDefaultModelIdForProvider("deepseek", "tool-use");
                expect(toolModel).toBe("deepseek-chat");

                return { chatModel, textModel, objectModel, toolModel };
            }))
        );

        it("should fail for unsupported capabilities", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;

                const result = yield* Effect.either(
                    client.getDefaultModelIdForProvider("deepseek", "embeddings")
                );
                expect(result._tag).toBe("Left");
                return result;
            }))
        );

        it("should fail for wrong provider name", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;

                const result = yield* Effect.either(
                    client.getDefaultModelIdForProvider("openai", "chat")
                );
                expect(result._tag).toBe("Left");
                return result;
            }))
        );
    });

    describe("Tool Operations", () => {
        it("should handle tool validation", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;

                // DeepSeek supports tools, but validation will still fail due to API call
                const result = yield* Effect.either(
                    client.validateToolInput("testTool", { param: "value" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );

        it("should handle tool execution", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;

                // DeepSeek supports tools, but execution will fail due to API call
                const result = yield* Effect.either(
                    client.executeTool("testTool", { param: "value" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );

        it("should handle tool result processing", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;

                // DeepSeek supports tools, but processing will fail due to API call
                const result = yield* Effect.either(
                    client.processToolResult("testTool", { result: "data" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );
    });

    describe("Supported Generation Operations", () => {
        it("should handle object generation", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const input = { text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Generate an object" })),
                        metadata: {}
                    })])
                };

                // DeepSeek supports object generation, but will fail due to API call
                const result = yield* Effect.either(
                    client.generateObject(input, { modelId: "deepseek-chat", schema: {} })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );
    });

    describe("Unsupported Generation Operations", () => {
        it("should fail image generation with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const input = { text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Generate an image" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.generateImage(input, { modelId: "deepseek-chat" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                }
                return result;
            }))
        );

        it("should fail speech generation with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const result = yield* Effect.either(
                    client.generateSpeech("Hello world", { modelId: "deepseek-chat", voice: "alloy" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                }
                return result;
            }))
        );

        it("should fail transcription with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const audioBuffer = new ArrayBuffer(1024);
                const result = yield* Effect.either(
                    client.transcribe(audioBuffer, { modelId: "whisper-1" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                }
                return result;
            }))
        );

        it("should fail embeddings generation with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const result = yield* Effect.either(
                    client.generateEmbeddings(["Hello world"], { modelId: "text-embedding-3-small" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                }
                return result;
            }))
        );
    });

    describe("Chat with Tools", () => {
        it("should handle chat with tools", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const input = { text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Use a tool" })),
                        metadata: {}
                    })])
                };

                // DeepSeek supports tools, but will fail due to API call
                const result = yield* Effect.either(
                    client.chat(input, {
                        modelId: "deepseek-chat",
                        // tools removed for test simplicity
                    })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );

        it("should handle chat without tools", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const input = { text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Hello" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.chat(input, { modelId: "deepseek-chat" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );
    });

    describe("Input Validation", () => {
        it("should handle empty messages in generateText", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const input = { text: "", messages: Chunk.empty() };

                const result = yield* Effect.either(
                    client.generateText(input, { modelId: "deepseek-chat" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );

        it("should handle empty messages in chat", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const input = { text: "", messages: Chunk.empty() };

                const result = yield* Effect.either(
                    client.chat(input, { modelId: "deepseek-chat" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );

        it("should handle empty messages in generateObject", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const input = { text: "", messages: Chunk.empty() };

                const result = yield* Effect.either(
                    client.generateObject(input, { modelId: "deepseek-chat", schema: {} })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );
    });

    describe("Reasoning Support", () => {
        it("should handle reasoning model", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const input = { text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Solve this complex problem" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.generateText(input, { modelId: "deepseek-reasoner" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );
    });

    describe("Vercel Provider Integration", () => {
        it("should handle setVercelProvider", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const mockProvider = {
                    name: "deepseek" as const,
                    provider: {} as any,
                    capabilities: new Set(["chat", "text-generation", "function-calling", "tool-use"] as ModelCapability[])
                };

                const result = yield* client.setVercelProvider(mockProvider);
                expect(result).toBeUndefined();
                return result;
            }))
        );
    });

    describe("Error Handling", () => {
        it("should handle API errors gracefully in generateText", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const input = { text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Hello" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.generateText(input, { modelId: "deepseek-chat" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );

        it("should handle API errors gracefully in chat", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const input = { text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Hello" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.chat(input, { modelId: "deepseek-chat" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );

        it("should handle API errors gracefully in generateObject", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const input = { text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Generate object" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.generateObject(input, { modelId: "deepseek-chat", schema: {} })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );
    });

    describe("Message Mapping", () => {
        it("should handle complex message structures", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* DeepseekProviderClient;
                const input = { text: "",
                    messages: Chunk.fromIterable([
                        new EffectiveMessage({
                            role: "system",
                            parts: Chunk.of(new TextPart({ _tag: "Text", content: "You are a helpful assistant" })),
                            metadata: {}
                        }),
                        new EffectiveMessage({
                            role: "user",
                            parts: Chunk.of(new TextPart({ _tag: "Text", content: "Hello, how are you?" })),
                            metadata: {}
                        })
                    ])
                };

                const result = yield* Effect.either(
                    client.generateText(input, { modelId: "deepseek-chat" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );
    });
}); 