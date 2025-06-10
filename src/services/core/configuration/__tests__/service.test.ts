import { join } from "path";
import { BaseConfigSchema } from "@/services/core/configuration/schema.js";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer, Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ConfigParseError, ConfigReadError, ConfigValidationError } from "../errors.js";
import { ConfigurationService } from "../service.js";

describe("ConfigurationService", () => {
    // Test schemas
    const TestSchema = Schema.Struct({
        name: Schema.String,
        value: Schema.Number
    });

    const TestComplexSchema = Schema.Struct({
        name: Schema.String,
        version: Schema.String,
        settings: Schema.Struct({
            enabled: Schema.Boolean,
            timeout: Schema.Number
        }),
        features: Schema.Array(Schema.String)
    });

    // Test directories and files
    const testDir = join(process.cwd(), "test-configs");
    const validConfig = join(testDir, "valid.json");
    const invalidConfig = join(testDir, "invalid.json");
    const malformedConfig = join(testDir, "malformed.json");
    const emptyConfig = join(testDir, "empty.json");
    const nonExistentConfig = join(testDir, "missing.json");
    const validProviderConfig = join(testDir, "valid-provider.json");
    const invalidProviderConfig = join(testDir, "invalid-provider.json");
    const validPolicyConfig = join(testDir, "valid-policy.json");
    const invalidPolicyConfig = join(testDir, "invalid-policy.json");
    const validComplexConfig = join(testDir, "valid-complex.json");

    // Test data
    const validConfigData = { name: "test", value: 123 };
    const invalidConfigData = { name: "test" }; // missing value
    const validComplexConfigData = {
        name: "Complex Test Config",
        version: "2.0.0",
        settings: {
            enabled: true,
            timeout: 5000
        },
        features: ["feature1", "feature2"]
    };

    const validProviderConfigData = {
        name: "Test Provider Config",
        version: "1.0.0",
        description: "Test provider configuration",
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

    const invalidProviderConfigData = {
        name: "Invalid Provider Config",
        version: "1.0.0",
        // missing description and providers
    };

    const validPolicyConfigData = {
        name: "Test Policy Config",
        version: "1.0.0",
        description: "Test policy configuration",
        policies: [
            {
                id: "test-policy",
                name: "Test Policy",
                type: "allow",
                resource: "*",
                priority: 1,
                enabled: true
            }
        ]
    };

    const invalidPolicyConfigData = {
        name: "Invalid Policy Config",
        version: "1.0.0",
        // missing required fields
    };

    // Store original environment variables
    const originalEnv = { ...process.env };

    // Create explicit dependency layers following centralized pattern
    const fileSystemLayer = NodeFileSystem.layer;

    const configurationTestLayer = Layer.provide(
        ConfigurationService.Default,
        fileSystemLayer
    );

    beforeEach(() =>
        Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;

            // Create test directory
            yield* fs.makeDirectory(testDir, { recursive: true });

            // Create test configuration files
            yield* fs.writeFileString(validConfig, JSON.stringify(validConfigData));
            yield* fs.writeFileString(invalidConfig, JSON.stringify(invalidConfigData));
            yield* fs.writeFileString(malformedConfig, "{malformed");
            yield* fs.writeFileString(emptyConfig, "{}");
            yield* fs.writeFileString(validComplexConfig, JSON.stringify(validComplexConfigData));
            yield* fs.writeFileString(validProviderConfig, JSON.stringify(validProviderConfigData));
            yield* fs.writeFileString(invalidProviderConfig, JSON.stringify(invalidProviderConfigData));
            yield* fs.writeFileString(validPolicyConfig, JSON.stringify(validPolicyConfigData));
            yield* fs.writeFileString(invalidPolicyConfig, JSON.stringify(invalidPolicyConfigData));

            // Set up environment variables for testing
            process.env.TEST_API_KEY = "test-key";
            process.env.OPENAI_API_KEY = "openai-test-key";
            process.env.ANTHROPIC_API_KEY = "anthropic-test-key";
            process.env.CUSTOM_ENV_VAR = "custom-value";
            process.env.EMPTY_ENV_VAR = "";
        }).pipe(
            Effect.provide(fileSystemLayer)
        )
    );

    afterEach(() =>
        Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;

            // Clean up test files and directory
            const filesToRemove = [
                validConfig,
                invalidConfig,
                malformedConfig,
                emptyConfig,
                validComplexConfig,
                validProviderConfig,
                invalidProviderConfig,
                validPolicyConfig,
                invalidPolicyConfig
            ];

            for (const file of filesToRemove) {
                const exists = yield* fs.exists(file);
                if (exists) {
                    yield* fs.remove(file);
                }
            }

            // Remove test directory if it exists
            const dirExists = yield* fs.exists(testDir);
            if (dirExists) {
                yield* fs.remove(testDir, { recursive: true });
            }

            // Reset environment variables
            process.env = { ...originalEnv };
        }).pipe(
            Effect.provide(fileSystemLayer)
        )
    );

    describe("loadConfig", () => {
        it("should successfully load and validate a simple configuration", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* service.loadConfig(
                    validConfig,
                    TestSchema
                );
                expect(result).toEqual(validConfigData);
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should successfully load and validate a complex configuration", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* service.loadConfig(
                    validComplexConfig,
                    TestComplexSchema
                );
                expect(result).toEqual(validComplexConfigData);
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle validation errors for missing required fields", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadConfig(
                        invalidConfig,
                        TestSchema
                    )
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigValidationError);
                    expect(result.left.filePath).toBe(invalidConfig);
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle JSON parse errors", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadConfig(
                        malformedConfig,
                        TestSchema
                    )
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigParseError);
                    expect(result.left.filePath).toBe(malformedConfig);
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle file read errors for non-existent files", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadConfig(
                        nonExistentConfig,
                        TestSchema
                    )
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigReadError);
                    expect(result.left.filePath).toBe(nonExistentConfig);
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle empty configuration files", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadConfig(
                        emptyConfig,
                        TestSchema
                    )
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigValidationError);
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle validation with BaseConfigSchema", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const baseConfigData = { name: "Base Config", version: "1.0.0" };

                // Create a temporary file for this test
                const fs = yield* FileSystem.FileSystem;
                const tempConfig = join(testDir, "base-config.json");
                yield* fs.writeFileString(tempConfig, JSON.stringify(baseConfigData));

                const result = yield* service.loadConfig(
                    tempConfig,
                    BaseConfigSchema
                );
                expect(result).toEqual(baseConfigData);

                // Clean up
                yield* fs.remove(tempConfig);
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    configurationTestLayer,
                    fileSystemLayer
                ))
            ));
    });

    describe("loadProviderConfig", () => {
        it("should successfully load and validate provider configuration", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* service.loadProviderConfig(validProviderConfig);
                expect(result.name).toBe(validProviderConfigData.name);
                expect(result.version).toBe(validProviderConfigData.version);
                expect(result.providers).toHaveLength(1);
                if (result.providers && result.providers.length > 0 && result.providers[0]) {
                    expect(result.providers[0].name).toBe("openai");
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle validation errors for invalid provider configuration", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadProviderConfig(invalidProviderConfig)
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigValidationError);
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle read errors for non-existent provider configuration", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadProviderConfig(nonExistentConfig)
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigReadError);
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));
    });

    describe("loadModelConfig", () => {
        it("should successfully load model configuration without validation", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* service.loadModelConfig(validConfig);
                expect(result).toEqual(validConfigData);
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle JSON parse errors for malformed model configuration", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadModelConfig(malformedConfig)
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigParseError);
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle read errors for non-existent model configuration", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadModelConfig(nonExistentConfig)
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigReadError);
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));
    });

    describe("loadPolicyConfig", () => {
        it("should successfully load and validate policy configuration", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* service.loadPolicyConfig(validPolicyConfig);
                expect(result.name).toBe(validPolicyConfigData.name);
                expect(result.version).toBe(validPolicyConfigData.version);
                expect(result.policies).toHaveLength(1);
                if (result.policies && result.policies.length > 0 && result.policies[0]) {
                    expect(result.policies[0].id).toBe("test-policy");
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle validation errors for invalid policy configuration", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadPolicyConfig(invalidPolicyConfig)
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigValidationError);
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle read errors for non-existent policy configuration", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadPolicyConfig(nonExistentConfig)
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigReadError);
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));
    });

    describe("getApiKey", () => {
        it("should retrieve API key from environment variables", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const apiKey = yield* service.getApiKey("TEST");
                expect(apiKey).toBe("test-key");
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should retrieve API key with correct case conversion", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const openaiKey = yield* service.getApiKey("openai");
                expect(openaiKey).toBe("openai-test-key");

                const anthropicKey = yield* service.getApiKey("anthropic");
                expect(anthropicKey).toBe("anthropic-test-key");
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle mixed case provider names", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const apiKey = yield* service.getApiKey("OpenAI");
                expect(apiKey).toBe("openai-test-key");
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should return empty string for missing API keys", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const apiKey = yield* service.getApiKey("MISSING");
                expect(apiKey).toBe("");
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should return empty string for empty API keys", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const apiKey = yield* service.getApiKey("EMPTY_ENV_VAR");
                expect(apiKey).toBe("");
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));
    });

    describe("getEnvVariable", () => {
        it("should retrieve environment variable by name", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const envVar = yield* service.getEnvVariable("CUSTOM_ENV_VAR");
                expect(envVar).toBe("custom-value");
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should return empty string for missing environment variables", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const envVar = yield* service.getEnvVariable("MISSING_VAR");
                expect(envVar).toBe("");
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should return empty string for empty environment variables", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const envVar = yield* service.getEnvVariable("EMPTY_ENV_VAR");
                expect(envVar).toBe("");
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle system environment variables", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const path = yield* service.getEnvVariable("PATH");
                expect(typeof path).toBe("string");
                // PATH should exist on most systems, but we don't check specific value
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));
    });

    describe("error handling and edge cases", () => {
        it("should preserve error context in ConfigReadError", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadConfig(nonExistentConfig, TestSchema)
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    const error = result.left as ConfigReadError;
                    expect(error.filePath).toBe(nonExistentConfig);
                    expect(error.cause).toBeDefined();
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should preserve error context in ConfigParseError", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadConfig(malformedConfig, TestSchema)
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    const error = result.left as ConfigParseError;
                    expect(error.filePath).toBe(malformedConfig);
                    expect(error.cause).toBeDefined();
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should preserve validation error context in ConfigValidationError", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadConfig(invalidConfig, TestSchema)
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    const error = result.left as ConfigValidationError;
                    expect(error.filePath).toBe(invalidConfig);
                    expect(error.validationError).toBeDefined();
                }
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle concurrent configuration loading", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;

                // Load multiple configurations concurrently
                const [config1, config2, config3] = yield* Effect.all([
                    service.loadConfig(validConfig, TestSchema),
                    service.loadConfig(validComplexConfig, TestComplexSchema),
                    service.loadProviderConfig(validProviderConfig)
                ], { concurrency: "unbounded" });

                expect(config1).toEqual(validConfigData);
                expect(config2).toEqual(validComplexConfigData);
                expect(config3.name).toBe(validProviderConfigData.name);
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));

        it("should handle concurrent API key retrieval", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;

                // Retrieve multiple API keys concurrently
                const [testKey, openaiKey, anthropicKey] = yield* Effect.all([
                    service.getApiKey("TEST"),
                    service.getApiKey("openai"),
                    service.getApiKey("anthropic")
                ], { concurrency: "unbounded" });

                expect(testKey).toBe("test-key");
                expect(openaiKey).toBe("openai-test-key");
                expect(anthropicKey).toBe("anthropic-test-key");
            }).pipe(
                Effect.provide(configurationTestLayer)
            ));
    });
});
