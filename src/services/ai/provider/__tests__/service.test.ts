import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { ConfigReadError } from "@/services/core/configuration/errors.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProviderNotFoundError, ProviderServiceConfigError } from "../errors.js";
import { ProviderService } from "../service.js";

describe("ProviderService", () => {
    const testDir = join(process.cwd(), "test-provider-configs");
    const validProvidersConfig = join(testDir, "valid-providers.json");
    const invalidProvidersConfig = join(testDir, "invalid-providers.json");
    const emptyProvidersConfig = join(testDir, "empty-providers.json");

    const validProviderConfigData = {
        name: "Test Providers Config",
        description: "Test configuration for providers",
        providers: [
            {
                name: "openai",
                displayName: "OpenAI",
                type: "llm",
                apiKeyEnvVar: "OPENAI_API_KEY",
                baseUrl: "https://api.openai.com/v1",
                capabilities: ["chat", "text-generation", "embeddings"]
            },
            {
                name: "anthropic",
                displayName: "Anthropic",
                type: "llm",
                apiKeyEnvVar: "ANTHROPIC_API_KEY",
                baseUrl: "https://api.anthropic.com",
                capabilities: ["chat", "text-generation"]
            }
        ]
    };

    const invalidProviderConfigData = {
        name: "Invalid Config",
        providers: [
            {
                name: "invalid-provider"
                // Missing required fields
            }
        ]
    };

    const emptyProviderConfigData = {
        name: "Empty Config",
        description: "Config with no providers",
        providers: []
    };

    // Store original env vars
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Create test directory and files
        mkdirSync(testDir, { recursive: true });
        writeFileSync(validProvidersConfig, JSON.stringify(validProviderConfigData, null, 2));
        writeFileSync(invalidProvidersConfig, JSON.stringify(invalidProviderConfigData, null, 2));
        writeFileSync(emptyProvidersConfig, JSON.stringify(emptyProviderConfigData, null, 2));

        // Set up environment with test config path
        process.env.PROVIDERS_CONFIG_PATH = validProvidersConfig;
        process.env.OPENAI_API_KEY = "test-openai-key";
        process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    });

    afterEach(() => {
        // Clean up test files
        try {
            unlinkSync(validProvidersConfig);
            unlinkSync(invalidProvidersConfig);
            unlinkSync(emptyProvidersConfig);
            rmdirSync(testDir);
        } catch (error) {
            // Ignore cleanup errors
        }

        // Reset environment
        process.env = { ...originalEnv };
    });

    describe("service instantiation", () => {
        it("should instantiate the service", () =>
            Effect.gen(function* () {
                const service = yield* ProviderService;
                expect(service).toBeDefined();
                expect(typeof service.getProviderClient).toBe("function");
            }).pipe(
                Effect.provide(ProviderService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));
    });

    describe("getProviderClient", () => {
        it("should successfully get a provider client with valid config and API key", () =>
            Effect.gen(function* () {
                const service = yield* ProviderService;
                const client = yield* service.getProviderClient("openai");
                expect(client).toBeDefined();
                expect(typeof client.chat).toBe("function");
                expect(typeof client.getCapabilities).toBe("function");
            }).pipe(
                Effect.provide(ProviderService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should fail with ProviderNotFoundError for unknown provider", () =>
            Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("nonexistent-provider" as any));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderNotFoundError);
                }
            }).pipe(
                Effect.provide(ProviderService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should fail with ProviderServiceConfigError for missing API key", () => {
            // Remove API key for this test
            process.env.OPENAI_API_KEY = "";

            return Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("openai"));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderServiceConfigError);
                    expect((result.left as ProviderServiceConfigError).description).toContain("API key not found in environment");
                }
            }).pipe(
                Effect.provide(ProviderService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            );
        });

        it("should fail when configuration file is missing", () => {
            // Point to non-existent config file
            process.env.PROVIDERS_CONFIG_PATH = join(testDir, "missing.json");

            return Effect.gen(function* () {
                const result = yield* Effect.either(Effect.gen(function* () {
                    const service = yield* ProviderService;
                    return yield* service.getProviderClient("openai");
                }));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigReadError);
                }
            }).pipe(
                Effect.provide(ProviderService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            );
        });

        it("should handle empty providers array", () => {
            // Point to config with empty providers
            process.env.PROVIDERS_CONFIG_PATH = emptyProvidersConfig;

            return Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("openai"));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderNotFoundError);
                }
            }).pipe(
                Effect.provide(ProviderService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            );
        });
    });

    describe("multiple provider support", () => {
        it("should support multiple different providers", () =>
            Effect.gen(function* () {
                const service = yield* ProviderService;

                const openaiClient = yield* service.getProviderClient("openai");
                expect(openaiClient).toBeDefined();

                const anthropicClient = yield* service.getProviderClient("anthropic");
                expect(anthropicClient).toBeDefined();

                // Verify they're different instances
                expect(openaiClient).not.toBe(anthropicClient);
            }).pipe(
                Effect.provide(ProviderService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));
    });

    describe("configuration edge cases", () => {
        it("should handle provider with missing apiKeyEnvVar", () => {
            const configWithMissingEnvVar = {
                ...validProviderConfigData,
                providers: [
                    {
                        name: "test-provider",
                        displayName: "Test Provider",
                        type: "llm",
                        // Missing apiKeyEnvVar
                        baseUrl: "https://api.test.com",
                        capabilities: ["chat"]
                    }
                ]
            };

            const testConfigPath = join(testDir, "missing-env-var.json");
            writeFileSync(testConfigPath, JSON.stringify(configWithMissingEnvVar, null, 2));
            process.env.PROVIDERS_CONFIG_PATH = testConfigPath;

            return Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("test-provider" as any));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderServiceConfigError);
                    expect((result.left as ProviderServiceConfigError).description).toContain("API key environment variable not configured");
                }
            }).pipe(
                Effect.provide(ProviderService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ).pipe(
                Effect.tap(() => Effect.sync(() => {
                    try { unlinkSync(testConfigPath); } catch { }
                }))
            );
        });
    });
}); 