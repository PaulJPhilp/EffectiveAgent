import { EffectiveMessage, ModelCapability, TextPart } from "@/schema.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Chunk, Effect, Layer } from "effect";
import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProviderMissingCapabilityError, ProviderOperationError } from "../../errors.js";
import { makePerplexityClient } from "../perplexity-provider-client.js";

describe("Perplexity Provider Client", () => {
    const testDir = join(process.cwd(), "test-perplexity-configs");
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
                id: "sonar-pro",
                provider: "perplexity",
                capabilities: ["chat", "text-generation", "search"]
            },
            {
                id: "sonar",
                provider: "perplexity",
                capabilities: ["chat", "text-generation", "search"]
            },
            {
                id: "sonar-deep-research",
                provider: "perplexity",
                capabilities: ["chat", "text-generation", "search", "research"]
            }
        ]
    };

    const providersConfigData = {
        name: "Test Providers Config",
        version: "1.0.0",
        providers: [
            {
                name: "perplexity",
                displayName: "Perplexity",
                type: "llm",
                apiKeyEnvVar: "PERPLEXITY_API_KEY",
                baseUrl: "https://api.perplexity.ai"
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
        process.env.PERPLEXITY_API_KEY = "test-perplexity-key";
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
        delete process.env.PERPLEXITY_API_KEY;
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
        it("should create Perplexity client with valid API key", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-perplexity-key");
                expect(client).toBeDefined();
                expect(typeof client.generateText).toBe("function");
                expect(typeof client.chat).toBe("function");
            }))
        );

        it("should handle different API keys", () =>
            withLayers(Effect.gen(function* () {
                const client1 = yield* makePerplexityClient("key1");
                const client2 = yield* makePerplexityClient("key2");

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
                const client = yield* makePerplexityClient("test-key");
                const capabilities = yield* client.getCapabilities();

                expect(capabilities).toBeInstanceOf(Set);
                expect(capabilities.has("chat")).toBe(true);
                expect(capabilities.has("text-generation")).toBe(true);
                expect(capabilities.has("search")).toBe(true);
                expect(capabilities.has("research")).toBe(true);

                // Perplexity does not support these capabilities
                expect(capabilities.has("function-calling")).toBe(false);
                expect(capabilities.has("tool-use")).toBe(false);
                expect(capabilities.has("image-generation")).toBe(false);
                expect(capabilities.has("audio")).toBe(false);
                expect(capabilities.has("embeddings")).toBe(false);
                return capabilities;
            }))
        );

        it("should return provider information", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const provider = yield* client.getProvider();

                expect(provider.name).toBe("perplexity");
                expect(provider.capabilities).toBeInstanceOf(Set);
                expect(provider.capabilities.has("chat")).toBe(true);
                expect(provider.capabilities.has("text-generation")).toBe(true);
                expect(provider.capabilities.has("search")).toBe(true);
                expect(provider.capabilities.has("research")).toBe(true);
                return provider;
            }))
        );
    });

    describe("Model Management", () => {
        it("should return empty models list", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const models = yield* client.getModels();
                expect(Array.isArray(models)).toBe(true);
                expect(models.length).toBe(0);
                return models;
            }))
        );

        it("should return default model IDs for supported capabilities", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");

                const chatModel = yield* client.getDefaultModelIdForProvider("perplexity", "chat");
                expect(chatModel).toBe("sonar-pro");

                const textModel = yield* client.getDefaultModelIdForProvider("perplexity", "text-generation");
                expect(textModel).toBe("sonar-pro");

                const searchModel = yield* client.getDefaultModelIdForProvider("perplexity", "search");
                expect(searchModel).toBe("sonar-pro");

                const researchModel = yield* client.getDefaultModelIdForProvider("perplexity", "research");
                expect(researchModel).toBe("sonar-deep-research");

                return { chatModel, textModel, searchModel, researchModel };
            }))
        );

        it("should fail for unsupported capabilities", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");

                const result = yield* Effect.either(
                    client.getDefaultModelIdForProvider("perplexity", "embeddings")
                );
                expect(result._tag).toBe("Left");
                return result;
            }))
        );

        it("should fail for wrong provider name", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");

                const result = yield* Effect.either(
                    client.getDefaultModelIdForProvider("openai", "chat")
                );
                expect(result._tag).toBe("Left");
                return result;
            }))
        );
    });

    describe("Tool Operations", () => {
        it("should fail tool validation with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");

                const result = yield* Effect.either(
                    client.validateToolInput("testTool", { param: "value" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                    if (result.left instanceof ProviderMissingCapabilityError) expect(result.left.capability).toBe("tool-use");
                }
                return result;
            }))
        );

        it("should fail tool execution with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");

                const result = yield* Effect.either(
                    client.executeTool("testTool", { param: "value" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                    if (result.left instanceof ProviderMissingCapabilityError) expect(result.left.capability).toBe("tool-use");
                }
                return result;
            }))
        );

        it("should fail tool result processing with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");

                const result = yield* Effect.either(
                    client.processToolResult("testTool", { result: "data" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                    if (result.left instanceof ProviderMissingCapabilityError) expect(result.left.capability).toBe("tool-use");
                }
                return result;
            }))
        );
    });

    describe("Supported Generation Operations", () => {
        it("should handle text generation with search grounding", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "What is the latest news about AI?" })),
                        metadata: {}
                    })])
                };

                // Perplexity supports text generation with search, but will fail due to API call
                const result = yield* Effect.either(
                    client.generateText(input, { modelId: "sonar-pro" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("perplexity");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("generateText");
                }
                return result;
            }))
        );

        it("should handle chat with search grounding", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Search for recent developments in quantum computing" })),
                        metadata: {}
                    })])
                };

                // Perplexity supports chat with search, but will fail due to API call
                const result = yield* Effect.either(
                    client.chat(input, { modelId: "sonar-pro" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("perplexity");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("chat");
                }
                return result;
            }))
        );
    });

    describe("Unsupported Generation Operations", () => {
        it("should fail object generation with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Generate an object" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.generateObject(input, { modelId: "sonar-pro", schema: {} })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("perplexity");
                    if (result.left instanceof ProviderMissingCapabilityError) expect(result.left.capability).toBe("function-calling");
                }
                return result;
            }))
        );

        it("should fail image generation with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Generate an image" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.generateImage(input, { modelId: "sonar-pro" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("perplexity");
                    if (result.left instanceof ProviderMissingCapabilityError) expect(result.left.capability).toBe("image-generation");
                }
                return result;
            }))
        );

        it("should fail speech generation with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const result = yield* Effect.either(
                    client.generateSpeech("Hello world", { modelId: "sonar-pro", voice: "alloy" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("perplexity");
                    if (result.left instanceof ProviderMissingCapabilityError) expect(result.left.capability).toBe("audio");
                }
                return result;
            }))
        );

        it("should fail transcription with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const audioBuffer = new ArrayBuffer(1024);
                const result = yield* Effect.either(
                    client.transcribe(audioBuffer, { modelId: "whisper-1" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("perplexity");
                    if (result.left instanceof ProviderMissingCapabilityError) expect(result.left.capability).toBe("audio");
                }
                return result;
            }))
        );

        it("should fail embeddings generation with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const result = yield* Effect.either(
                    client.generateEmbeddings(["Hello world"], { modelId: "text-embedding-3-small" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("perplexity");
                    if (result.left instanceof ProviderMissingCapabilityError) expect(result.left.capability).toBe("embeddings");
                }
                return result;
            }))
        );
    });

    describe("Chat Operations", () => {
        it("should handle chat without tools", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Hello" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.chat(input, { modelId: "sonar-pro" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("perplexity");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("chat");
                }
                return result;
            }))
        );

        it("should fail chat with tools", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Use a tool" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.chat(input, {
                        modelId: "sonar-pro",
                        tools: [{ name: "test_tool", description: "A test tool", parameters: {} }]
                    })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                    if (result.left instanceof ProviderMissingCapabilityError) expect(result.left.capability).toBe("tool-use");
                }
                return result;
            }))
        );
    });

    describe("Input Validation", () => {
        it("should handle empty messages in generateText", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const input = { text: "", messages: Chunk.empty() };

                const result = yield* Effect.either(
                    client.generateText(input, { modelId: "sonar-pro" })
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
                const client = yield* makePerplexityClient("test-key");
                const input = { text: "", messages: Chunk.empty() };

                const result = yield* Effect.either(
                    client.chat(input, { modelId: "sonar-pro" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );
    });

    describe("Research Support", () => {
        it("should handle deep research model", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Conduct deep research on climate change impacts" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.generateText(input, { modelId: "sonar-deep-research" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("perplexity");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("generateText");
                }
                return result;
            }))
        );
    });

    describe("Vercel Provider Integration", () => {
        it("should handle setVercelProvider", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const mockProvider = {
                    name: "perplexity" as const,
                    provider: {} as any,
                    capabilities: new Set(["chat", "text-generation", "search", "research"] as ModelCapability[])
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
                const client = yield* makePerplexityClient("invalid-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Hello" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.generateText(input, { modelId: "sonar-pro" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("perplexity");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("generateText");
                }
                return result;
            }))
        );

        it("should handle API errors gracefully in chat", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("invalid-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Hello" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.chat(input, { modelId: "sonar-pro" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("perplexity");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("chat");
                }
                return result;
            }))
        );
    });

    describe("Message Mapping", () => {
        it("should handle complex message structures", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([
                        new EffectiveMessage({
                            role: "system",
                            parts: Chunk.of(new TextPart({ _tag: "Text", content: "You are a helpful research assistant" })),
                            metadata: {}
                        }),
                        new EffectiveMessage({
                            role: "user",
                            parts: Chunk.of(new TextPart({ _tag: "Text", content: "What are the latest trends in renewable energy?" })),
                            metadata: {}
                        })
                    ])
                };

                const result = yield* Effect.either(
                    client.generateText(input, { modelId: "sonar-pro" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );
    });

    describe("Search Grounding", () => {
        it("should handle search-enabled models", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makePerplexityClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "What happened in the news today?" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.chat(input, {
                        modelId: "sonar",
                        system: "You are a helpful assistant that provides up-to-date information."
                    })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("perplexity");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("chat");
                }
                return result;
            }))
        );
    });
}); 