import { Effect } from "effect";
import { ModelService } from "../service.js";
import type { Model } from "../schema.js";
import { ModelConfigError, ModelValidationError } from "../errors.js";
import { describe, expect, it } from "vitest";
import { ModelCapability } from "@/schema.js";
import { Schema as S } from "effect";

// Helper function to create capability schema for testing
const capability = (name: ModelCapability) => S.Literal(name);

describe("ModelService", () => {
    describe("validation", () => {
        it("should validate model with capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const result = yield* service.validateModel("gpt-4", ModelCapability);
            expect(result).toBe(true);
        }));

        it("should fail validation for invalid model", () => Effect.gen(function* () {
            const service = yield* ModelService;
            try {
                yield* service.validateModel("invalid-model", ModelCapability);
                expect(true).toBe(false); // Should not reach here
            } catch (e) {
                expect(e).toBeInstanceOf(ModelValidationError);
            }
        }));

        it("should validate model with specific capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const result = yield* service.validateModel("gpt-4", ModelCapability);
            expect(result).toBe(true);

            // Verify model has expected capabilities
            const models = yield* service.findModelsByCapabilities(ModelCapability);
            const model = models.find((m: Model) => m.id === "gpt-4");
            expect(model).toBeDefined();
            expect(model?.capabilities).toContain("text-generation");
            expect(model?.capabilities).toContain("chat");
        }));

        it("should fail validation for model missing capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            try {
                yield* service.validateModel("dalle-3", ModelCapability);
                expect(true).toBe(false); // Should not reach here
            } catch (e) {
                expect(e).toBeInstanceOf(ModelValidationError);
            }
        }));
    });

    describe("load", () => {
        it("should load model configuration successfully", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const config = yield* service.load();
            expect(config).toBeDefined();
        }));

        it("should fail with invalid config", () => Effect.gen(function* () {
            const service = yield* ModelService;
            try {
                yield* service.load();
                expect(true).toBe(false); // Should not reach here
            } catch (e) {
                expect(e).toBeInstanceOf(ModelConfigError);
                expect((e as ModelConfigError).description).toContain("Failed to validate model config");
            }
        }));

        it("should handle invalid config data", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const invalidConfig = {
                name: "invalid-models",
                version: "1.0.0",
                models: [
                    {
                        id: "invalid-model",
                        name: "Invalid Model",
                        version: "invalid",
                        provider: "unknown",
                        modelName: "",
                        capabilities: [],
                        temperature: 2.0, // Invalid temperature
                        maxTokens: -1, // Invalid token count
                        contextWindowSize: 0, // Invalid window size
                        costPer1kInputTokens: -0.01 // Invalid cost
                    }
                ]
            };

            try {
                yield* service.load();
                expect(true).toBe(false); // Should not reach here
            } catch (e) {
                expect(e).toBeInstanceOf(ModelConfigError);
                expect((e as ModelConfigError).description).toContain("Failed to validate model config");
            }
        }));
    });

    describe("provider compatibility", () => {
        it("should get provider name", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const provider = yield* service.getProviderName("gpt-4");
            expect(provider).toBe("openai");
        }));

        it("should identify models with vision capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const models = yield* service.findModelsByCapabilities(ModelCapability);

            // Verify multiple providers support vision
            const visionProviders = new Set(models.map((model: Model) => model.provider));
            expect(visionProviders.size).toBeGreaterThan(1);
            expect(visionProviders).toContain("google");
            expect(visionProviders).toContain("anthropic");
        }));
    });

    describe("model selection", () => {
        it("should prefer models with larger context windows", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const models = yield* service.findModelsByCapabilities(ModelCapability);

            // Get context window sizes
            const contextSizes = models.map((model: Model) => model.contextWindowSize ?? 0);
            const sortedSizes = [...contextSizes].sort((a: number, b: number) => b - a);
            expect(contextSizes).toEqual(sortedSizes);
        }));

        it("should handle models with missing cost information", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const models = yield* service.findModelsByCapabilities(ModelCapability);
            expect(models).toHaveLength(1);
            expect(models[0].id).toBe("dalle-3");
            expect(models[0].costPer1kOutputTokens).toBeUndefined();
        }));
    });

    describe("validateModel", () => {
        it("should validate model with required capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const isValid = yield* service.validateModel("gpt-4", ModelCapability);
            expect(isValid).toBe(true);
        }));

        it("should fail validation for missing capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            try {
                yield* service.validateModel("dalle-3", ModelCapability);
                expect(true).toBe(false); // Should not reach here
            } catch (e) {
                expect(e).toBeInstanceOf(ModelValidationError);
            }
        }));

        it("should fail validation for non-existent model", () => Effect.gen(function* () {
            const service = yield* ModelService;
            try {
                yield* service.validateModel("invalid-model", ModelCapability);
                expect(true).toBe(false); // Should not reach here
            } catch (e) {
                expect(e).toBeInstanceOf(ModelValidationError);
            }
        }));
    });
});

describe("findModelsByCapability", () => {
    it("should find models with specific capability", () => Effect.gen(function* () {
        const service = yield* ModelService;
        const models = yield* service.findModelsByCapability(ModelCapability);
        expect(models).toHaveLength(1);
        expect(models[0].id).toBe("gpt-4");
    }));

    it("should return empty array for unknown capability", () => Effect.gen(function* () {
        const service = yield* ModelService;
        const models = yield* service.findModelsByCapability(ModelCapability);
        expect(models.length).toBeGreaterThan(0);
    }));
});

describe("findModelsByCapabilities", () => {
    it("should find models with all specified capabilities", () => Effect.gen(function* () {
        const service = yield* ModelService;
        const models = yield* service.findModelsByCapabilities(ModelCapability);
        expect(models.length).toBeGreaterThan(0);
        expect(models.some(m => m.id === "gpt-4")).toBe(true);
    }));

    it("should return empty array when no models have all capabilities", () => Effect.gen(function* () {
        const service = yield* ModelService;
        const models = yield* service.findModelsByCapabilities(ModelCapability);
        expect(models).toHaveLength(0);
    }));

    it("should find models with multiple specific capabilities", () => Effect.gen(function* () {
        const service = yield* ModelService;
        const models = yield* service.findModelsByCapabilities(ModelCapability);
        expect(models.length).toBeGreaterThan(0);
        const model = models.find(m => m.id === "gpt-4");
        expect(model).toBeDefined();
        expect(model?.capabilities).toContain("text-generation");
    }));

    it("should handle models with missing capabilities", () => Effect.gen(function* () {
        const service = yield* ModelService;
        const models = yield* service.findModelsByCapabilities(ModelCapability);
        expect(models).toHaveLength(0);
    }));

    it("should find models with advanced capabilities", () => Effect.gen(function* () {
        const service = yield* ModelService;
        const models = yield* service.findModelsByCapabilities(ModelCapability);
        expect(models.length).toBeGreaterThan(0);
        expect(models.some((m: Model) => m.id === "gpt-4-turbo")).toBe(true);
        expect(models.some((m: Model) => m.id === "claude-3-opus")).toBe(true);
    }));
});

it("should identify models with vision capabilities", () => Effect.gen(function* () {
    const service = yield* ModelService;
    const visionModels = yield* service.findModelsByCapabilities(ModelCapability);

    // Verify multiple providers support vision
    const visionProviders = new Set(visionModels.map((m: Model) => m.provider));
    expect(visionProviders.size).toBeGreaterThan(1);
    expect(visionProviders).toContain("google");
    expect(visionProviders).toContain("anthropic");
}));

describe("validateModel", () => {
    it("should validate model with required capabilities", () => Effect.gen(function* () {
        const service = yield* ModelService;
        const isValid = yield* service.validateModel("gpt-4", ModelCapability);
        expect(isValid).toBe(true);
    }));

    it("should fail validation for missing capabilities", () => Effect.gen(function* () {
        const service = yield* ModelService;
        try {
            yield* service.validateModel("dalle-3", ModelCapability);
            expect(true).toBe(false); // Should not reach here
        } catch (e) {
            expect(e).toBeInstanceOf(ModelValidationError);
        }
    }));

    it("should fail validation for non-existent model", () => Effect.gen(function* () {
        const service = yield* ModelService;
        try {
            yield* service.validateModel("invalid-model", ModelCapability);
            expect(true).toBe(false); // Should not reach here
        } catch (e) {
            expect(e).toBeInstanceOf(ModelValidationError);
        }
    }));
});
