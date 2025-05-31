import { ModelService } from "@/services/ai/model/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from "effect";
import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
        configPaths: {
            models: modelsConfigPath,
            providers: providersConfigPath,
            policy: policyConfigPath
        }
    };

    const modelsConfigData = {
        name: "Test Models Config",
        version: "1.0.0",
        models: [
            {
                id: "claude-3-5-sonnet-20241022",
                displayName: "Claude 3.5 Sonnet",
                provider: {
                    name: "anthropic",
                    displayName: "Anthropic"
                },
                vendorCapabilities: ["chat", "text-generation"],
                contextWindow: 200000,
                maxTokens: 8192
            },
            {
                id: "claude-3-5-haiku-20241022",
                displayName: "Claude 3.5 Haiku",
                provider: {
                    name: "anthropic",
                    displayName: "Anthropic"
                },
                vendorCapabilities: ["chat", "text-generation"],
                contextWindow: 200000,
                maxTokens: 8192
            },
            {
                id: "claude-3-opus-20240229",
                displayName: "Claude 3 Opus",
                provider: {
                    name: "anthropic",
                    displayName: "Anthropic"
                },
                vendorCapabilities: ["chat", "text-generation"],
                contextWindow: 200000,
                maxTokens: 4096
            }
        ]
    };

    const providersConfigData = {
        name: "Test Providers Config",
        providers: [
            {
                name: "anthropic",
                displayName: "Anthropic",
                type: "llm",
                apiKeyEnvVar: "ANTHROPIC_API_KEY",
                baseUrl: "https://api.anthropic.com/v1",
                capabilities: ["chat", "text-generation"]
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

    // Store original env vars
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Create test directory and files
        mkdirSync(testDir, { recursive: true });
        writeFileSync(masterConfigPath, JSON.stringify(masterConfigData, null, 2));
        writeFileSync(modelsConfigPath, JSON.stringify(modelsConfigData, null, 2));
        writeFileSync(providersConfigPath, JSON.stringify(providersConfigData, null, 2));
        writeFileSync(policyConfigPath, JSON.stringify(policyConfigData, null, 2));

        // Set up environment
        process.env.MASTER_CONFIG_PATH = masterConfigPath;
        process.env.MODELS_CONFIG_PATH = modelsConfigPath;
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

        // Reset environment
        process.env = { ...originalEnv };
    });

    describe("basic client creation", () => {
        it("should create a client successfully", () =>
            Effect.gen(function* () {
                const client = yield* makeAnthropicClient("test-key");
                expect(client).toBeDefined();
                expect(typeof client.generateText).toBe("function");
                expect(typeof client.generateObject).toBe("function");
                expect(typeof client.getCapabilities).toBe("function");
                expect(typeof client.validateToolInput).toBe("function");
                expect(typeof client.executeTool).toBe("function");
                expect(typeof client.processToolResult).toBe("function");
                return client;
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));
    });

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
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));
    });

    describe("tool methods", () => {
        it("should fail tool validation as expected", () =>
            Effect.gen(function* () {
                const client = yield* makeAnthropicClient("test-key");
                const result = yield* Effect.either(client.validateToolInput("testTool", { param: "value" }));
                expect(result._tag).toBe("Left");
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should fail tool execution as expected", () =>
            Effect.gen(function* () {
                const client = yield* makeAnthropicClient("test-key");
                const result = yield* Effect.either(client.executeTool("testTool", { param: "value" }));
                expect(result._tag).toBe("Left");
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should fail tool result processing as expected", () =>
            Effect.gen(function* () {
                const client = yield* makeAnthropicClient("test-key");
                const result = yield* Effect.either(client.processToolResult("testTool", { result: "data" }));
                expect(result._tag).toBe("Left");
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
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
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
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
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
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
                const result = yield* Effect.either(client.generateObject({ text: "test" }, { modelId: "claude-3-5-sonnet" }));
                expect(result._tag).toBe("Left");

                return client;
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should fail unimplemented operations", () =>
            Effect.gen(function* () {
                const client = yield* makeAnthropicClient("test-key");

                // Test that unimplemented operations fail as expected
                const embedResult = yield* Effect.either(client.generateEmbeddings(["test"], { modelId: "claude-3-5-sonnet" }));
                expect(embedResult._tag).toBe("Left");

                const imageResult = yield* Effect.either(client.generateImage({ text: "test" }, { modelId: "claude-3-5-sonnet" }));
                expect(imageResult._tag).toBe("Left");

                const speechResult = yield* Effect.either(client.generateSpeech("test", { modelId: "claude-3-5-sonnet" }));
                expect(speechResult._tag).toBe("Left");

                const transcribeResult = yield* Effect.either(client.transcribe(new ArrayBuffer(0), { modelId: "claude-3-5-sonnet" }));
                expect(transcribeResult._tag).toBe("Left");

                return client;
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));
    });
}); 