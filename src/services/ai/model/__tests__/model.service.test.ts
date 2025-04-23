import { ModelCapability, Provider } from "@/schema.js";
import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js";
import { Cause, ConfigProvider, Effect, Exit, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";
import { ModelConfigError, ModelNotFoundError, ModelValidationError } from "../errors.js";
import type { Model, ModelFile } from "../schema.js";
import { ModelService } from "../service.js";

// Test data
const mockModels = [
    {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        version: "1.0.0",
        provider: "openai" as Provider,
        modelName: "gpt-4-turbo-preview",
        capabilities: ["text-generation", "chat", "reasoning", "tool-use", "function-calling"],
        temperature: 0.7,
        maxTokens: 4096,
        contextWindowSize: 128000,
        costPer1kInputTokens: 0.01,
        costPer1kOutputTokens: 0.03,
        metadata: {
            description: "GPT-4 Turbo with improved capabilities"
        }
    },
    {
        id: "gpt-4",
        name: "GPT-4",
        version: "1.0.0",
        provider: "openai" as Provider,
        modelName: "gpt-4",
        capabilities: ["text-generation", "chat", "reasoning", "function-calling"],
        temperature: 0.7,
        maxTokens: 4096,
        contextWindowSize: 8192,
        costPer1kInputTokens: 0.03,
        costPer1kOutputTokens: 0.06
    },
    {
        id: "claude-3-opus",
        name: "Claude 3 Opus",
        version: "1.0.0",
        provider: "anthropic" as Provider,
        modelName: "claude-3-opus-20240229",
        capabilities: ["text-generation", "chat", "reasoning", "tool-use", "function-calling", "vision", "code-generation"],
        temperature: 0.7,
        maxTokens: 4096,
        contextWindowSize: 200000,
        costPer1kInputTokens: 0.015,
        costPer1kOutputTokens: 0.075
    },
    {
        id: "dalle-3",
        name: "DALL·E 3",
        version: "1.0.0",
        provider: "openai" as Provider,
        modelName: "dall-e-3",
        capabilities: ["image-generation"],
        costPer1kInputTokens: 0.02
    },
    {
        id: "gemini-pro",
        name: "Gemini Pro",
        version: "1.0.0",
        provider: "google" as Provider,
        modelName: "gemini-pro",
        capabilities: ["text-generation", "chat", "reasoning", "tool-use", "function-calling", "code-generation"],
        temperature: 0.7,
        maxTokens: 4096,
        contextWindowSize: 32768,
        costPer1kInputTokens: 0.001,
        costPer1kOutputTokens: 0.002
    },
    {
        id: "gemini-pro-vision",
        name: "Gemini Pro Vision",
        version: "1.0.0",
        provider: "google" as Provider,
        modelName: "gemini-pro-vision",
        capabilities: ["text-generation", "chat", "reasoning", "vision"],
        temperature: 0.7,
        maxTokens: 4096,
        contextWindowSize: 32768,
        costPer1kInputTokens: 0.002,
        costPer1kOutputTokens: 0.004
    },
    {
        id: "mixtral-8x7b",
        name: "Mixtral 8x7B",
        version: "1.0.0",
        provider: "groq" as Provider,
        modelName: "mixtral-8x7b-32768",
        capabilities: ["text-generation", "chat", "reasoning", "code-generation"],
        temperature: 0.7,
        maxTokens: 4096,
        contextWindowSize: 32768,
        costPer1kInputTokens: 0.0004,
        costPer1kOutputTokens: 0.0008
    }
] as Model[];

const mockModelFile: ModelFile = {
    name: "test-models",
    version: "1.0.0",
    models: mockModels
};

// Invalid test data for validation tests
const invalidModelData = {
    id: "invalid-model",
    name: "Invalid Model",
    version: "invalid",
    provider: "unknown" as Provider,
    modelName: "",
    capabilities: [],
    temperature: 2.0, // Invalid temperature
    maxTokens: -1, // Invalid token count
    contextWindowSize: 0, // Invalid window size
    costPer1kInputTokens: -0.01 // Invalid cost
};

describe("ModelService", () => {
    // Create test implementation
    const createTestImpl = () => {
        return Effect.gen(function* () {
            const configProvider = yield* ConfigProvider.ConfigProvider;

            return {
                load: () => Effect.succeed(mockModelFile),

                getProviderName: (modelId: string) => Effect.gen(function* () {
                    const model = mockModels.find(m => m.id === modelId);
                    if (!model) {
                        return yield* Effect.fail(new ModelNotFoundError(modelId));
                    }
                    return model.provider;
                }),

                findModelsByCapability: (capability: typeof ModelCapability) => Effect.succeed(
                    mockModels.filter(model =>
                        model.capabilities.includes(capability.literals[0])
                    )
                ),

                findModelsByCapabilities: (capabilities: typeof ModelCapability) => Effect.succeed(
                    mockModels.filter(model =>
                        capabilities.literals.every(cap =>
                            model.capabilities.includes(cap)
                        )
                    )
                ),

                validateModel: (modelId: string, capabilities: typeof ModelCapability) => Effect.gen(function* () {
                    const model = mockModels.find(m => m.id === modelId);
                    if (!model) {
                        return yield* Effect.fail(new ModelValidationError({
                            modelId,
                            message: `Model not found: ${modelId}`,
                            capabilities: [...capabilities.literals]
                        }));
                    }

                    const hasCapabilities = capabilities.literals.every(cap =>
                        model.capabilities.includes(cap)
                    );

                    if (!hasCapabilities) {
                        return yield* Effect.fail(new ModelValidationError({
                            modelId,
                            message: `Model ${modelId} does not have all required capabilities`,
                            capabilities: [...capabilities.literals]
                        }));
                    }

                    return true;
                })
            };
        });
    };

    // Create test harness
    const harness = createServiceTestHarness(
        ModelService,
        createTestImpl
    );

    describe("configuration validation", () => {
        it("should validate model schema successfully", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const config = yield* service.load();

                // Verify required fields
                expect(config.name).toBe("test-models");
                expect(config.version).toBe("1.0.0");
                expect(Array.isArray(config.models)).toBe(true);

                // Verify model structure
                const model = config.models[0];
                expect(model.id).toBeDefined();
                expect(model.name).toBeDefined();
                expect(model.version).toBeDefined();
                expect(model.provider).toBeDefined();
                expect(Array.isArray(model.capabilities)).toBe(true);
                expect(model.responseFormat).toBeDefined();
                expect(Array.isArray(model.supportedLanguages)).toBe(true);
            });

            await harness.runTest(effect);
        });

        it("should fail validation for invalid model data", async () => {
            const invalidConfig = {
                name: "invalid-models",
                version: "1.0.0",
                models: [invalidModelData]
            };

            const invalidConfigLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([
                    ["provider", JSON.stringify(invalidConfig)]
                ]))
            );

            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                yield* service.load();
            });

            const exit = await Effect.runPromise(
                Effect.exit(
                    Effect.provide(effect, Layer.mergeAll(invalidConfigLayer, ModelService.Default))
                )
            );

            expect(Exit.isFailure(exit)).toBe(true);
            if (Exit.isFailure(exit)) {
                const error = Cause.failureOption(exit.cause);
                expect(Option.isSome(error)).toBe(true);
                const value = Option.getOrThrow(error);
                expect(value).toBeInstanceOf(ModelConfigError);
                expect((value as ModelConfigError).message).toContain("Failed to validate model config");
            }
        });

        it("should validate model version format", async () => {
            const invalidVersionConfig = {
                ...mockModelFile,
                models: [{
                    ...mockModels[0],
                    version: "invalid.version"
                }]
            };

            const invalidConfigLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([
                    ["provider", JSON.stringify(invalidVersionConfig)]
                ]))
            );

            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                yield* service.load();
            });

            await harness.expectError(
                Effect.provide(effect, invalidConfigLayer),
                "ModelConfigError"
            );
        });

        it("should validate model capabilities format", async () => {
            const invalidCapabilitiesConfig = {
                ...mockModelFile,
                models: [{
                    ...mockModels[0],
                    capabilities: ["invalid-capability"]
                }]
            };

            const invalidConfigLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([
                    ["provider", JSON.stringify(invalidCapabilitiesConfig)]
                ]))
            );

            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                yield* service.load();
            });

            await harness.expectError(
                Effect.provide(effect, invalidConfigLayer),
                "ModelConfigError"
            );
        });

        it("should validate model cost parameters", async () => {
            const invalidCostConfig = {
                ...mockModelFile,
                models: [{
                    ...mockModels[0],
                    costPer1kInputTokens: -1,
                    costPer1kOutputTokens: -1
                }]
            };

            const invalidConfigLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([
                    ["provider", JSON.stringify(invalidCostConfig)]
                ]))
            );

            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                yield* service.load();
            });

            await harness.expectError(
                Effect.provide(effect, invalidConfigLayer),
                "ModelConfigError"
            );
        });
    });

    describe("load", () => {
        it("should load model configuration successfully", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const config = yield* service.load();
                expect(config).toEqual(mockModelFile);
            });

            await harness.runTest(effect);
        });

        it("should handle invalid config data", async () => {
            // Create a layer with invalid config
            const invalidConfigLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([
                    ["provider", "invalid json"]
                ]))
            );

            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                yield* service.load();
            });

            await harness.expectError(
                Effect.provide(effect, invalidConfigLayer),
                "ModelConfigError"
            );
        });
    });

    describe("getProviderName", () => {
        it("should return provider for valid model", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const provider = yield* service.getProviderName("gpt-4");
                expect(provider).toBe("openai");
            });

            await harness.runTest(effect);
        });

        it("should fail with ModelNotFoundError for invalid model", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                yield* service.getProviderName("invalid-model");
            });

            await harness.expectError(effect, "ModelNotFoundError");
        });
    });

    describe("findModelsByCapability", () => {
        it("should find models with specific capability", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapability(ModelCapability);
                expect(models).toHaveLength(1);
                expect(models[0].id).toBe("gpt-4");
            });

            await harness.runTest(effect);
        });

        it("should return empty array for unknown capability", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapability(ModelCapability);
                expect(models).toHaveLength(0);
            });

            await harness.runTest(effect);
        });
    });

    describe("findModelsByCapabilities", () => {
        it("should find models with all specified capabilities", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapabilities(ModelCapability);
                expect(models).toHaveLength(1);
                expect(models[0].id).toBe("gpt-4");
            });

            await harness.runTest(effect);
        });

        it("should return empty array when no models have all capabilities", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapabilities(ModelCapability);
                expect(models).toHaveLength(0);
            });

            await harness.runTest(effect);
        });

        it("should find models with multiple specific capabilities", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapabilities(ModelCapability);
                expect(models).toHaveLength(2);
                expect(models.map(m => m.id)).toContain("claude-3-opus");
                expect(models.map(m => m.id)).toContain("gemini-pro-vision");
            });

            await harness.runTest(effect);
        });

        it("should find models with advanced capabilities", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapabilities(ModelCapability);
                expect(models).toHaveLength(2);
                expect(models.map(m => m.id)).toContain("gpt-4-turbo");
                expect(models.map(m => m.id)).toContain("claude-3-opus");
            });

            await harness.runTest(effect);
        });

        it("should sort models by cost efficiency when available", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapabilities(ModelCapability);
                expect(models.length).toBeGreaterThan(0);

                // Verify models are sorted by cost (assuming lower cost is better)
                const costs = models.map(m => m.costPer1kInputTokens ?? Infinity);
                const sortedCosts = [...costs].sort((a, b) => a - b);
                expect(costs).toEqual(sortedCosts);
            });

            await harness.runTest(effect);
        });
    });

    describe("model selection optimization", () => {
        it("should prefer models with larger context windows for the same capabilities", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapabilities(ModelCapability);

                // Find models with same capabilities but different context windows
                const textChatModels = models.filter(m =>
                    m.capabilities.includes("text-generation") &&
                    m.capabilities.includes("chat")
                );

                expect(textChatModels.length).toBeGreaterThan(1);

                // Verify they're sorted by context window size (descending)
                const contextSizes = textChatModels.map(m => m.contextWindowSize ?? 0);
                const sortedSizes = [...contextSizes].sort((a: number, b: number) => b - a);
                expect(contextSizes).toEqual(sortedSizes);
            });

            await harness.runTest(effect);
        });

        it("should handle models with missing cost information", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapabilities(ModelCapability);
                expect(models).toHaveLength(1);
                expect(models[0].id).toBe("dalle-3");
                // Should not throw when cost info is partial
                expect(models[0].costPer1kOutputTokens).toBeUndefined();
            });

            await harness.runTest(effect);
        });
    });

    describe("provider compatibility", () => {
        it("should group models by provider", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapabilities(ModelCapability);

                // Group models by provider
                const providerGroups = new Map<Provider, Model[]>();
                models.forEach(model => {
                    const group = providerGroups.get(model.provider) || [];
                    group.push(model);
                    providerGroups.set(model.provider, group);
                });

                // Verify we have models from multiple providers
                expect(providerGroups.size).toBeGreaterThan(1);

                // Verify specific provider groups
                expect(providerGroups.get("openai")?.length).toBeGreaterThan(0);
                expect(providerGroups.get("anthropic")?.length).toBeGreaterThan(0);
                expect(providerGroups.get("google")?.length).toBeGreaterThan(0);
            });

            await harness.runTest(effect);
        });

        it("should identify models with unique capabilities per provider", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;

                // Find models with vision capabilities
                const visionModels = yield* service.findModelsByCapabilities(ModelCapability);

                // Verify multiple providers support vision
                const visionProviders = new Set(visionModels.map(m => m.provider));
                expect(visionProviders.size).toBeGreaterThan(1);
                expect(visionProviders).toContain("google");
                expect(visionProviders).toContain("anthropic");
            });

            await harness.runTest(effect);
        });
    });

    describe("validateModel", () => {
        it("should validate model with required capabilities", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const isValid = yield* service.validateModel("gpt-4", ModelCapability);
                expect(isValid).toBe(true);
            });

            await harness.runTest(effect);
        });

        it("should fail validation for missing capabilities", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                yield* service.validateModel("dalle-3", ModelCapability);
            });

            await harness.expectError(effect, "ModelValidationError");
        });

        it("should fail validation for non-existent model", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                yield* service.validateModel("invalid-model", ModelCapability);
            });

            await harness.expectError(effect, "ModelValidationError");
        });
    });
});
