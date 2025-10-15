import { NodeFileSystem } from "@effect/platform-node";
import { type Message as EffectiveMessage, TextPart } from "@effective-agent/ai-sdk";
import { Chunk, Effect, Layer } from "effect";
import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { makeAnthropicClient } from "../anthropic-provider-client.js";

describe("Anthropic Provider Client", () => {
    const testDir = join(process.cwd(), "test-anthropic-configs");
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
                id: "claude-3",
                provider: "anthropic",
                capabilities: ["chat", "completion"]
            }
        ]
    };

    const providersConfigData = {
        name: "Test Providers Config",
        version: "1.0.0",
        providers: [
            {
                name: "anthropic",
                apiKeyEnvVar: "ANTHROPIC_API_KEY"
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
        process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
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
    });

    const withLayers = <R, E, A>(effect: Effect.Effect<A, E, R>) =>
        effect.pipe(
            Effect.provide(Layer.mergeAll(
                NodeFileSystem.layer,
                ConfigurationService.Default
            ))
        );

    it("should create Anthropic client with valid config", () =>
        withLayers(Effect.gen(function* () {
            const configService = yield* ConfigurationService;
            const masterConfig = yield* configService.getMasterConfig();
            const providerConfig = yield* configService.loadProviderConfig(masterConfig.configPaths?.providers || "./config/providers.json");
            const provider = providerConfig.providers.find(p => p.name === "anthropic");
            expect(provider).toBeDefined();

            const client = yield* makeAnthropicClient(provider?.apiKeyEnvVar || "ANTHROPIC_API_KEY");
            expect(client).toBeDefined();
            expect(typeof client.generateText).toBe("function");
            expect(typeof client.chat).toBe("function");
        }))
    );

    describe("getCapabilities", () => {
        it("should return supported capabilities", () =>
            Effect.gen(function* () {
                const client = yield* makeAnthropicClient("test-key");
                const capabilities = yield* client.getCapabilities();

                expect(capabilities).toBeInstanceOf(Set);
                expect(capabilities.has("chat")).toBe(true);
                expect(capabilities.has("text-generation")).toBe(true);
                // Anthropic client only supports chat and text-generation
                expect(capabilities.has("embeddings")).toBe(false);
                expect(capabilities.has("image-generation")).toBe(false);
                expect(capabilities.has("function-calling")).toBe(false);
                return capabilities;
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default
                ))
            ));
    });

    describe("tool methods", () => {
        it("should fail tool validation as expected", () =>
            Effect.gen(function* () {
                const client = yield* makeAnthropicClient("test-key");
                const result = yield* Effect.either(client.validateToolInput("test:testTool", { param: "value" }));
                expect(result._tag).toBe("Left");
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default
                ))
            ));

        it("should fail tool execution as expected", () =>
            Effect.gen(function* () {
                const client = yield* makeAnthropicClient("test-key");
                const result = yield* Effect.either(client.executeTool("test:testTool", { param: "value" }));
                expect(result._tag).toBe("Left");
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default
                ))
            ));

        it("should fail tool result processing as expected", () =>
            Effect.gen(function* () {
                const client = yield* makeAnthropicClient("test-key");
                const result = yield* Effect.either(client.processToolResult("test:testTool", { result: "data" }));
                expect(result._tag).toBe("Left");
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default
                ))
            ));
    });

    describe("client configuration", () => {
        it("should handle different API keys", () =>
            Effect.gen(function* () {
                const client1 = yield* makeAnthropicClient("key1");
                const client2 = yield* makeAnthropicClient("key2");

                expect(client1).toBeDefined();
                expect(client2).toBeDefined();

                // Both clients should have the same capabilities
                const caps1 = yield* client1.getCapabilities();
                const caps2 = yield* client2.getCapabilities();

                expect(caps1.size).toBe(caps2.size);
                return { client1, client2 };
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default
                ))
            ));
    });

    describe("Anthropic-specific functionality", () => {
        it("should have expected capability set for Anthropic models", () =>
            Effect.gen(function* () {
                const client = yield* makeAnthropicClient("test-key");
                const capabilities = yield* client.getCapabilities();

                // Anthropic supports only these core capabilities
                expect(capabilities.has("chat")).toBe(true);
                expect(capabilities.has("text-generation")).toBe(true);

                // Anthropic doesn't support these capabilities
                expect(capabilities.has("embeddings")).toBe(false);
                expect(capabilities.has("image-generation")).toBe(false);
                expect(capabilities.has("function-calling")).toBe(false);

                // Verify exact capability count matches expected (only 2 capabilities)
                expect(capabilities.size).toBe(2);
                return capabilities;
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default
                ))
            ));

        it("should create client with focused capability set", () =>
            Effect.gen(function* () {
                // Anthropic client has the most focused capability set
                const client = yield* makeAnthropicClient("test-anthropic-api-key");
                expect(client).toBeDefined();
                expect(typeof client.getCapabilities).toBe("function");

                const capabilities = yield* client.getCapabilities();
                expect(capabilities.size).toBe(2); // Only chat and text-generation

                // Verify generateObject method exists but is not implemented (fails)
                const message: EffectiveMessage = {
                    role: "user",
                    parts: Chunk.fromIterable([new TextPart({ _tag: "Text", content: "test" })])
                };
                const input = { text: "test", messages: Chunk.fromIterable([message]) };
                const result = yield* Effect.either(client.generateObject(input, { modelId: "claude-3-5-sonnet", schema: { type: "object" } }));
                expect(result._tag).toBe("Left");

                // Test that unimplemented operations fail as expected
                const embedResult = yield* Effect.either(client.generateEmbeddings(["test"], { modelId: "claude-3-5-sonnet" }));
                expect(embedResult._tag).toBe("Left");

                const imageResult = yield* Effect.either(client.generateImage(input, { modelId: "claude-3-5-sonnet" }));
                expect(imageResult._tag).toBe("Left");

                const speechResult = yield* Effect.either(client.generateSpeech("test", { modelId: "claude-3-5-sonnet" }));
                expect(speechResult._tag).toBe("Left");

                const transcribeResult = yield* Effect.either(client.transcribe(new ArrayBuffer(0), { modelId: "claude-3-5-sonnet" }));
                expect(transcribeResult._tag).toBe("Left");

                return client;
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default
                ))
            ));

        it("should fail unimplemented operations", () =>
            Effect.gen(function* () {
                const client = yield* makeAnthropicClient("test-key");

                // Test that unimplemented operations fail as expected
                const embedResult = yield* Effect.either(client.generateEmbeddings(["test"], { modelId: "claude-3-5-sonnet" }));
                expect(embedResult._tag).toBe("Left");

                const message: EffectiveMessage = {
                    role: "user",
                    parts: Chunk.fromIterable([new TextPart({ _tag: "Text", content: "test" })])
                };
                const input = { text: "test", messages: Chunk.fromIterable([message]) };
                const imageResult = yield* Effect.either(client.generateImage(input, { modelId: "claude-3-5-sonnet" }));
                expect(imageResult._tag).toBe("Left");

                const speechResult = yield* Effect.either(client.generateSpeech("test", { modelId: "claude-3-5-sonnet" }));
                expect(speechResult._tag).toBe("Left");

                const transcribeResult = yield* Effect.either(client.transcribe(new ArrayBuffer(0), { modelId: "claude-3-5-sonnet" }));
                expect(transcribeResult._tag).toBe("Left");

                return client;
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default
                ))
            ));
    });
}); 