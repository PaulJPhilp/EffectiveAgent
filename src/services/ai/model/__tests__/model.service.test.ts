import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { ModelMetadata } from "../model-universe.js";
import { ModelService } from "../service.js";

// Create the test harness with the ModelService implementation
const testHarness = createServiceTestHarness(ModelService.Default);

/**
 * Tests for the ModelService implementation
 * This suite verifies model validation, capability checking, and model discovery
 */
describe("ModelService", () => {
    describe("validation", () => {
        it("should validate existing model", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* service.validateModel("gpt-4");
                expect(result).toBe(true);
            });

            await testHarness.runTest(effect);
        });

        it("should validate non-existent model", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* service.validateModel("invalid-model");
                expect(result).toBe(false);
            });

            await testHarness.runTest(effect);
        });
    });

    describe("findModelsByCapability", () => {
        it("should find models with chat capability", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapability("chat");
                expect(models.length).toBeGreaterThan(0);
                models.forEach((model: ModelMetadata) => {
                    expect(model.vendorCapabilities).toContain("chat");
                });
            });

            await testHarness.runTest(effect);
        });

        it("should return empty array for non-existent capability", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapability("invalid-capability");
                expect(models).toEqual([]);
            });

            await testHarness.runTest(effect);
        });
    });

    describe("findModelsByCapabilities", () => {
        it("should find models with multiple capabilities", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapabilities(["chat", "text-generation"]);
                expect(models.length).toBeGreaterThan(0);
                models.forEach((model: ModelMetadata) => {
                    expect(model.vendorCapabilities).toContain("chat");
                    expect(model.vendorCapabilities).toContain("text-generation");
                });
            });

            await testHarness.runTest(effect);
        });

        it("should return empty array for non-existent capabilities", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapabilities(["invalid-capability"]);
                expect(models).toEqual([]);
            });

            await testHarness.runTest(effect);
        });
    });

    describe("getProviderName", () => {
        it("should get provider name for existing model", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const provider = yield* service.getProviderName("gpt-4");
                expect(provider).toBe("openai");
            });

            await testHarness.runTest(effect);
        });

        it("should return openai for non-existent model", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ModelService;
                const provider = yield* service.getProviderName("invalid-model");
                expect(provider).toBe("openai");
            });

            await testHarness.runTest(effect);
        });
    });
});
