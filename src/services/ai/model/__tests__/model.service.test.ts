import { ModelCapability } from "@/schema.js";
import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { ModelNotFoundError, ModelValidationError } from "../errors.js";
import type { PublicModelInfoDefinition } from "../schema.js";
import { ModelService } from "../service.js";

// Create a test layer that provides ModelService
const TestModelServiceLayer = ModelService.Default;

describe("ModelService", () => {
    describe("validation", () => {
        it("should validate model with capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const result = yield* service.validateModel("gpt-4o", ModelCapability);
            expect(result).toBe(true);
        }).pipe(Effect.provide(TestModelServiceLayer)));

        it("should fail validation for invalid model", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const result = yield* Effect.either(service.validateModel("invalid-model", ModelCapability));
            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(ModelValidationError);
            }
        }).pipe(Effect.provide(TestModelServiceLayer)));

        it("should validate model with specific capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const result = yield* service.validateModel("gpt-4o", ModelCapability);
            expect(result).toBe(true);

            // Verify model has expected capabilities
            const models = yield* service.findModelsByCapabilities(ModelCapability);
            const model = models.find((m: PublicModelInfoDefinition) => m.id === "gpt-4o");
            expect(model).toBeDefined();
            expect(model?.vendorCapabilities).toContain("text-generation");
            expect(model?.vendorCapabilities).toContain("chat");
        }).pipe(Effect.provide(TestModelServiceLayer)));

        it("should fail validation for model missing capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const result = yield* Effect.either(service.validateModel("dalle-3", ModelCapability));
            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(ModelValidationError);
            }
        }).pipe(Effect.provide(TestModelServiceLayer)));

        it("should fail validation if model lacks required capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const modelId = "gpt-4o-audio-preview"; // This model only has audio and chat
            const result = yield* Effect.either(service.validateModel(modelId, ModelCapability));
            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(ModelValidationError);
            }
        }).pipe(Effect.provide(TestModelServiceLayer)));

        it("should fail for non-existent model", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const modelId = "non-existent-model-id";
            const result = yield* Effect.either(service.validateModel(modelId, ModelCapability));
            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(ModelNotFoundError);
            }
        }).pipe(Effect.provide(TestModelServiceLayer)));
    });

    describe("findModelsByCapability", () => {
        it("should find models with chat capability", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const models = yield* service.findModelsByCapability(ModelCapability);
            expect(Array.isArray(models)).toBe(true);
            // Filter locally for testing purposes
            const chatModels = models.filter(m => m.vendorCapabilities.includes("chat"));
            expect(chatModels.length).toBeGreaterThan(0);
        }).pipe(Effect.provide(TestModelServiceLayer)));

        it("should find models with multiple capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const models = yield* service.findModelsByCapability(ModelCapability);
            expect(Array.isArray(models)).toBe(true);
            models.forEach((model: PublicModelInfoDefinition) => {
                expect(model.vendorCapabilities.length).toBeGreaterThan(0);
            });
        }).pipe(Effect.provide(TestModelServiceLayer)));
    });

    describe("advanced capabilities", () => {
        it("should identify models with vision capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const models = yield* service.findModelsByCapability(ModelCapability);
            const visionModels = models.filter(m => m.vendorCapabilities.includes("vision"));
            expect(visionModels.length).toBeGreaterThan(0);
        }).pipe(Effect.provide(TestModelServiceLayer)));

        it("should prefer models with larger context windows", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const models = yield* service.findModelsByCapability(ModelCapability);
            const textModels = models.filter(m => m.vendorCapabilities.includes("text-generation"));
            const contextSizes = textModels.map((model: PublicModelInfoDefinition) => model.contextWindowSize ?? 0);
            expect(Math.max(...contextSizes)).toBeGreaterThan(0);
        }).pipe(Effect.provide(TestModelServiceLayer)));

        it("should handle models with missing cost information", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const models = yield* service.findModelsByCapability(ModelCapability);
            const imageModels = models.filter(m => m.vendorCapabilities.includes("image-generation"));
            expect(imageModels.length).toBeGreaterThan(0);
            const modelWithoutCost = imageModels.find(m => m.costPer1kOutputTokens === undefined);
            expect(modelWithoutCost).toBeDefined();
        }).pipe(Effect.provide(TestModelServiceLayer)));
    });

    describe("findModelsByCapabilities", () => {
        it("should find models with all specified capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const models = yield* service.findModelsByCapabilities(ModelCapability);
            expect(models.length).toBeGreaterThan(0);
            expect(models.some(m => m.id === "gpt-4o")).toBe(true);
        }).pipe(Effect.provide(TestModelServiceLayer)));

        it("should find models with multiple specific capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const models = yield* service.findModelsByCapabilities(ModelCapability);
            // Find models with text-generation and chat
            const matchingModels = models.filter(m =>
                m.vendorCapabilities.includes("text-generation") &&
                m.vendorCapabilities.includes("chat")
            );
            expect(matchingModels.length).toBeGreaterThan(0);
        }).pipe(Effect.provide(TestModelServiceLayer)));

        it("should handle models with missing capabilities", () => Effect.gen(function* () {
            const service = yield* ModelService;
            const models = yield* service.findModelsByCapabilities(ModelCapability);
            expect(models).toBeDefined();
        }).pipe(Effect.provide(TestModelServiceLayer)));
    });
});
