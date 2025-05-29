import { ConfigurationService } from "@/services/core/configuration/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either } from "effect";
import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ModelNotFoundError } from "../errors.js";
import { ModelService } from "../service.js";

describe("ModelService", () => {
    const testDir = join(process.cwd(), "test-model-configs");
    const validModelsConfig = join(testDir, "valid-models.json");
    const emptyModelsConfig = join(testDir, "empty-models.json");

    const validModelConfigData = {
        name: "Test Models Config",
        version: "1.0.0",
        models: [
            {
                id: "gpt-4o",
                displayName: "GPT-4 Omni",
                provider: {
                    name: "openai",
                    displayName: "OpenAI"
                },
                vendorCapabilities: ["chat", "text-generation", "function-calling"],
                contextWindow: 128000,
                maxTokens: 4096
            },
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
                id: "gemini-1.5-pro",
                displayName: "Gemini 1.5 Pro",
                provider: {
                    name: "google",
                    displayName: "Google"
                },
                vendorCapabilities: ["chat", "text-generation", "function-calling"],
                contextWindow: 1000000,
                maxTokens: 8192
            }
        ]
    };

    const emptyModelConfigData = {
        name: "Empty Models Config",
        version: "1.0.0",
        models: []
    };

    // Store original env vars
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Create test directory and files
        mkdirSync(testDir, { recursive: true });
        writeFileSync(validModelsConfig, JSON.stringify(validModelConfigData, null, 2));
        writeFileSync(emptyModelsConfig, JSON.stringify(emptyModelConfigData, null, 2));

        // Set up environment with test config path
        process.env.MODELS_CONFIG_PATH = validModelsConfig;
    });

    afterEach(() => {
        // Clean up test files
        try {
            unlinkSync(validModelsConfig);
            unlinkSync(emptyModelsConfig);
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
                const service = yield* ModelService;
                expect(service).toBeDefined();
                expect(typeof service.validateModel).toBe("function");
                expect(typeof service.findModelsByCapability).toBe("function");
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));
    });

    describe("load", () => {
        it("should load model configuration successfully", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const config = yield* service.load();

                expect(config).toHaveProperty("name", "Test Models Config");
                expect(config).toHaveProperty("version", "1.0.0");
                expect(config).toHaveProperty("models");
                expect(Array.isArray(config.models)).toBe(true);
                expect(config.models.length).toBe(3);

                const gpt4Model = config.models.find(m => m.id === "gpt-4o");
                expect(gpt4Model).toBeDefined();
                if (gpt4Model) {
                    expect(gpt4Model.provider.name).toBe("openai");
                    expect(gpt4Model.vendorCapabilities).toContain("chat");
                }
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should fail when configuration file is missing", () => {
            // Point to non-existent config file
            process.env.MODELS_CONFIG_PATH = join(testDir, "missing.json");

            return Effect.gen(function* () {
                const result = yield* Effect.either(Effect.gen(function* () {
                    const service = yield* ModelService;
                    return yield* service.load();
                }));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                }
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            );
        });
    });

    describe("validateModel", () => {
        it("should validate existing model", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const isValid = yield* service.validateModel("gpt-4o");
                expect(isValid).toBe(true);
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should return false for non-existent model", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const isValid = yield* service.validateModel("invalid-model");
                expect(isValid).toBe(false);
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));
    });

    describe("exists", () => {
        it("should return true for existing model", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const exists = yield* service.exists("gpt-4o");
                expect(exists).toBe(true);
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should return false for non-existent model", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const exists = yield* service.exists("invalid-model");
                expect(exists).toBe(false);
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));
    });

    describe("findModelsByCapability", () => {
        it("should find models with chat capability", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapability("chat");

                expect(models.length).toBe(3); // All test models have chat capability
                models.forEach((model) => {
                    expect(model.vendorCapabilities).toContain("chat");
                });
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should find models with function-calling capability", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapability("function-calling");

                expect(models.length).toBe(2); // gpt-4o and gemini-1.5-pro
                models.forEach((model) => {
                    expect(model.vendorCapabilities).toContain("function-calling");
                });
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should fail for non-existent capability", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* Effect.either(service.findModelsByCapability("non-existent-capability" as any));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                }
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));
    });

    describe("findModelsByCapabilities", () => {
        it("should find models with multiple capabilities", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const capabilities = ["chat", "function-calling"];
                const models = yield* service.findModelsByCapabilities(capabilities);

                expect(models.length).toBe(2); // gpt-4o and gemini-1.5-pro
                models.forEach((model) => {
                    expect(model.vendorCapabilities).toContain("chat");
                    expect(model.vendorCapabilities).toContain("function-calling");
                });
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should fail when no models have all required capabilities", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const capabilities = ["chat", "non-existent-capability"];
                const result = yield* Effect.either(service.findModelsByCapabilities(capabilities as any));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                }
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));
    });

    describe("getProviderName", () => {
        it("should get provider name for existing model", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const providerName = yield* service.getProviderName("gpt-4o");
                expect(providerName).toBe("openai");
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should fail for non-existent model", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* Effect.either(service.getProviderName("invalid-model"));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                }
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));
    });

    describe("getDefaultModelId", () => {
        it("should get default model ID", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const defaultModelId = yield* service.getDefaultModelId();
                expect(defaultModelId).toBe("gpt-4o"); // First model in the list
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should fail when no models are available", () => {
            // Point to config with empty models
            process.env.MODELS_CONFIG_PATH = emptyModelsConfig;

            return Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* Effect.either(service.getDefaultModelId());

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                }
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            );
        });
    });

    describe("getModelsForProvider", () => {
        it("should get models for existing provider", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.getModelsForProvider("openai");

                expect(models.length).toBe(1);
                expect(models[0].id).toBe("gpt-4o");
                expect(models[0].provider.name).toBe("openai");
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should fail for non-existent provider", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* Effect.either(service.getModelsForProvider("non-existent-provider"));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                }
            }).pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            ));
    });
}); 