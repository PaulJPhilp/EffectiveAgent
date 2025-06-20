import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { ModelService } from "@/services/ai/model/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeGoogleClient } from "../google-provider-client.js";

describe("Google Provider Client", () => {
    const testDir = join(process.cwd(), "test-google-configs");
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
                id: "gemini-1.5-pro",
                displayName: "Gemini 1.5 Pro",
                provider: {
                    name: "google",
                    displayName: "Google"
                },
                vendorCapabilities: ["chat", "text-generation", "function-calling"],
                contextWindow: 1000000,
                maxTokens: 8192
            },
            {
                id: "gemini-1.5-flash",
                displayName: "Gemini 1.5 Flash",
                provider: {
                    name: "google",
                    displayName: "Google"
                },
                vendorCapabilities: ["chat", "text-generation"],
                contextWindow: 1000000,
                maxTokens: 8192
            }
        ]
    };

    const providersConfigData = {
        name: "Test Providers Config",
        providers: [
            {
                name: "google",
                displayName: "Google",
                type: "llm",
                apiKeyEnvVar: "GOOGLE_API_KEY",
                baseUrl: "https://generativelanguage.googleapis.com/v1beta",
                capabilities: ["chat", "text-generation", "embeddings"]
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
        // Expect caller (CI/local) to provide a valid key
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            throw new Error("GOOGLE_GENERATIVE_AI_API_KEY must be set for Google integration tests");
        }
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
                const client = yield* makeGoogleClient(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
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
                const client = yield* makeGoogleClient(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
                const capabilities = yield* client.getCapabilities();

                expect(capabilities).toBeInstanceOf(Set);
                expect(capabilities.has("chat")).toBe(true);
                expect(capabilities.has("text-generation")).toBe(true);
                expect(capabilities.has("embeddings")).toBe(true);
                // Google client doesn't support image generation or function calling in current implementation
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
                const client = yield* makeGoogleClient(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
                const result = yield* Effect.either(client.validateToolInput("testTool", { param: "value" }));
                expect(result._tag).toBe("Left");
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should fail tool execution as expected", () =>
            Effect.gen(function* () {
                const client = yield* makeGoogleClient(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
                const result = yield* Effect.either(client.executeTool("testTool", { param: "value" }));
                expect(result._tag).toBe("Left");
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should fail tool result processing as expected", () =>
            Effect.gen(function* () {
                const client = yield* makeGoogleClient(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
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
                const client1 = yield* makeGoogleClient(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
                const client2 = yield* makeGoogleClient(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

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

    describe("Google-specific functionality", () => {
        it("should have expected capability set for Google models", () =>
            Effect.gen(function* () {
                const client = yield* makeGoogleClient(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
                const capabilities = yield* client.getCapabilities();

                // Google supports these core capabilities
                expect(capabilities.has("chat")).toBe(true);
                expect(capabilities.has("text-generation")).toBe(true);
                expect(capabilities.has("embeddings")).toBe(true);

                // Verify exact capability count matches expected
                expect(capabilities.size).toBe(3);
                return capabilities;
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should create client without dependency on models", () =>
            Effect.gen(function* () {
                // Google client creation doesn't require ModelService unlike some other implementations
                const client = yield* makeGoogleClient(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
                expect(client).toBeDefined();
                expect(typeof client.getCapabilities).toBe("function");

                const capabilities = yield* client.getCapabilities();
                expect(capabilities.size).toBeGreaterThan(0);
                return client;
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));
    });
}); 