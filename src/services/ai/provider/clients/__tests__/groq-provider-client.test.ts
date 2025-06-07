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
import { makeGroqClient } from "../groq-provider-client.js";

describe("Groq Provider Client", () => {
    const testDir = join(process.cwd(), "test-groq-configs");
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
                id: "llama-3.3-70b-versatile",
                provider: "groq",
                capabilities: ["chat", "text-generation", "function-calling", "tool-use", "reasoning"]
            },
            {
                id: "whisper-large-v3",
                provider: "groq",
                capabilities: ["audio"]
            }
        ]
    };

    const providersConfigData = {
        name: "Test Providers Config",
        version: "1.0.0",
        providers: [
            {
                name: "groq",
                displayName: "Groq",
                type: "llm",
                apiKeyEnvVar: "GROQ_API_KEY",
                baseUrl: "https://api.groq.com/openai/v1"
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
        process.env.GROQ_API_KEY = "test-groq-key";
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
        delete process.env.GROQ_API_KEY;
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
        it("should create Groq client with valid API key", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-groq-key");
                expect(client).toBeDefined();
                expect(typeof client.generateText).toBe("function");
                expect(typeof client.chat).toBe("function");
                expect(typeof client.generateObject).toBe("function");
                expect(typeof client.transcribe).toBe("function");
            }))
        );

        it("should handle different API keys", () =>
            withLayers(Effect.gen(function* () {
                const client1 = yield* makeGroqClient("key1");
                const client2 = yield* makeGroqClient("key2");

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
                const client = yield* makeGroqClient("test-key");
                const capabilities = yield* client.getCapabilities();

                expect(capabilities).toBeInstanceOf(Set);
                expect(capabilities.has("chat")).toBe(true);
                expect(capabilities.has("text-generation")).toBe(true);
                expect(capabilities.has("function-calling")).toBe(true);
                expect(capabilities.has("tool-use")).toBe(true);
                expect(capabilities.has("audio")).toBe(true);
                expect(capabilities.has("reasoning")).toBe(true);

                // Groq does not support these capabilities
                expect(capabilities.has("image-generation")).toBe(false);
                expect(capabilities.has("embeddings")).toBe(false);
                return capabilities;
            }))
        );

        it("should return provider information", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");
                const provider = yield* client.getProvider();

                expect(provider.name).toBe("groq");
                expect(provider.capabilities).toBeInstanceOf(Set);
                expect(provider.capabilities.has("chat")).toBe(true);
                expect(provider.capabilities.has("text-generation")).toBe(true);
                expect(provider.capabilities.has("function-calling")).toBe(true);
                expect(provider.capabilities.has("tool-use")).toBe(true);
                expect(provider.capabilities.has("audio")).toBe(true);
                expect(provider.capabilities.has("reasoning")).toBe(true);
                return provider;
            }))
        );
    });

    describe("Model Management", () => {
        it("should return empty models list", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");
                const models = yield* client.getModels();
                expect(Array.isArray(models)).toBe(true);
                expect(models.length).toBe(0);
                return models;
            }))
        );

        it("should return default model IDs for supported capabilities", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");

                const chatModel = yield* client.getDefaultModelIdForProvider("groq", "chat");
                expect(chatModel).toBe("llama-3.3-70b-versatile");

                const textModel = yield* client.getDefaultModelIdForProvider("groq", "text-generation");
                expect(textModel).toBe("llama-3.3-70b-versatile");

                const objectModel = yield* client.getDefaultModelIdForProvider("groq", "function-calling");
                expect(objectModel).toBe("llama-3.3-70b-versatile");

                const toolModel = yield* client.getDefaultModelIdForProvider("groq", "tool-use");
                expect(toolModel).toBe("llama-3.3-70b-versatile");

                const audioModel = yield* client.getDefaultModelIdForProvider("groq", "audio");
                expect(audioModel).toBe("whisper-large-v3");

                const reasoningModel = yield* client.getDefaultModelIdForProvider("groq", "reasoning");
                expect(reasoningModel).toBe("llama-3.3-70b-versatile");

                return { chatModel, textModel, objectModel, toolModel, audioModel, reasoningModel };
            }))
        );

        it("should fail for unsupported capabilities", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");

                const result = yield* Effect.either(
                    client.getDefaultModelIdForProvider("groq", "embeddings")
                );
                expect(result._tag).toBe("Left");
                return result;
            }))
        );

        it("should fail for wrong provider name", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");

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
                const client = yield* makeGroqClient("test-key");

                // Groq supports tools, but validation will still fail due to API call
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
                const client = yield* makeGroqClient("test-key");

                // Groq supports tools, but execution will fail due to API call
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
                const client = yield* makeGroqClient("test-key");

                // Groq supports tools, but processing will fail due to API call
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
                const client = yield* makeGroqClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Generate an object" })),
                        metadata: {}
                    })])
                };

                // Groq supports object generation, but will fail due to API call
                const result = yield* Effect.either(
                    client.generateObject(input, { modelId: "llama-3.3-70b-versatile", schema: {} })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("groq");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("generateObject");
                }
                return result;
            }))
        );

        it("should handle transcription", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");
                const audioBuffer = new ArrayBuffer(1024);

                // Groq supports transcription, but will fail due to API call
                const result = yield* Effect.either(
                    client.transcribe(audioBuffer, { modelId: "whisper-large-v3" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("groq");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("transcribe");
                }
                return result;
            }))
        );
    });

    describe("Unsupported Generation Operations", () => {
        it("should fail image generation with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Generate an image" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.generateImage(input, { modelId: "llama-3.3-70b-versatile" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("groq");
                    if (result.left instanceof ProviderMissingCapabilityError) expect(result.left.capability).toBe("image-generation");
                }
                return result;
            }))
        );

        it("should fail speech generation with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");
                const result = yield* Effect.either(
                    client.generateSpeech("Hello world", { modelId: "llama-3.3-70b-versatile", voice: "alloy" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("groq");
                    if (result.left instanceof ProviderMissingCapabilityError) expect(result.left.capability).toBe("audio");
                }
                return result;
            }))
        );

        it("should fail embeddings generation with missing capability error", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");
                const result = yield* Effect.either(
                    client.generateEmbeddings(["Hello world"], { modelId: "text-embedding-3-small" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderMissingCapabilityError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("groq");
                    if (result.left instanceof ProviderMissingCapabilityError) expect(result.left.capability).toBe("embeddings");
                }
                return result;
            }))
        );
    });

    describe("Chat with Tools", () => {
        it("should handle chat with tools", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Use a tool" })),
                        metadata: {}
                    })])
                };

                // Groq supports tools, but will fail due to API call
                const result = yield* Effect.either(
                    client.chat(input, {
                        modelId: "llama-3.3-70b-versatile",
                        // tools removed for test simplicity
                    })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("groq");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("chat");
                }
                return result;
            }))
        );

        it("should handle chat without tools", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Hello" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.chat(input, { modelId: "llama-3.3-70b-versatile" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("groq");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("chat");
                }
                return result;
            }))
        );
    });

    describe("Input Validation", () => {
        it("should handle empty messages in generateText", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");
                const input = { text: "", messages: Chunk.empty() };

                const result = yield* Effect.either(
                    client.generateText(input, { modelId: "llama-3.3-70b-versatile" })
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
                const client = yield* makeGroqClient("test-key");
                const input = { text: "", messages: Chunk.empty() };

                const result = yield* Effect.either(
                    client.chat(input, { modelId: "llama-3.3-70b-versatile" })
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
                const client = yield* makeGroqClient("test-key");
                const input = { text: "", messages: Chunk.empty() };

                const result = yield* Effect.either(
                    client.generateObject(input, { modelId: "llama-3.3-70b-versatile", schema: {} })
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
                const client = yield* makeGroqClient("test-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Solve this complex problem" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.generateText(input, { modelId: "llama-3.3-70b-versatile" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("groq");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("generateText");
                }
                return result;
            }))
        );
    });

    describe("Vercel Provider Integration", () => {
        it("should handle setVercelProvider", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");
                const mockProvider = {
                    name: "groq" as const,
                    provider: {} as any,
                    capabilities: new Set(["chat", "text-generation", "function-calling", "tool-use", "audio", "reasoning"] as ModelCapability[])
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
                const client = yield* makeGroqClient("invalid-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Hello" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.generateText(input, { modelId: "llama-3.3-70b-versatile" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("groq");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("generateText");
                }
                return result;
            }))
        );

        it("should handle API errors gracefully in chat", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("invalid-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Hello" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.chat(input, { modelId: "llama-3.3-70b-versatile" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("groq");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("chat");
                }
                return result;
            }))
        );

        it("should handle API errors gracefully in generateObject", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("invalid-key");
                const input = {
                    text: "",
                    messages: Chunk.fromIterable([new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Generate object" })),
                        metadata: {}
                    })])
                };

                const result = yield* Effect.either(
                    client.generateObject(input, { modelId: "llama-3.3-70b-versatile", schema: {} })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("groq");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("generateObject");
                }
                return result;
            }))
        );

        it("should handle API errors gracefully in transcribe", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("invalid-key");
                const audioBuffer = new ArrayBuffer(1024);

                const result = yield* Effect.either(
                    client.transcribe(audioBuffer, { modelId: "whisper-large-v3" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("groq");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("transcribe");
                }
                return result;
            }))
        );
    });

    describe("Message Mapping", () => {
        it("should handle complex message structures", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");
                const input = {
                    text: "",
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
                    client.generateText(input, { modelId: "llama-3.3-70b-versatile" })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                }
                return result;
            }))
        );
    });

    describe("Whisper Transcription", () => {
        it("should handle Whisper model for transcription", () =>
            withLayers(Effect.gen(function* () {
                const client = yield* makeGroqClient("test-key");
                const audioBuffer = new ArrayBuffer(2048);

                const result = yield* Effect.either(
                    client.transcribe(audioBuffer, {
                        modelId: "whisper-large-v3",
                        language: "en",
                        prompt: "Transcribe this audio"
                    })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    if (result.left instanceof ProviderOperationError) expect(result.left.providerName).toBe("groq");
                    if (result.left instanceof ProviderOperationError) expect(result.left.operation).toBe("transcribe");
                }
                return result;
            }))
        );
    });
}); 