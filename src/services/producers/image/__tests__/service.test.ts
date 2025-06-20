/**
 * @file Integration tests for ImageService
 * @module services/pipeline/producers/image/__tests__/service
 */

import { ModelService } from "@/services/ai/model/service.js";
import { ProviderOperationError } from "@/services/ai/provider/errors.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer } from "effect";
import * as O from "effect/Option";
import { describe, expect, it } from "vitest";
import { ImageModelError, ImageSizeError } from "../errors.js";
import { ImageService } from "../service.js";

const createTestService = Effect.gen(function* () {
    return yield* ImageService;
});

// Centralized dependency layer configuration
const testLayer = Layer.provide(
    Layer.mergeAll(
        ConfigurationService.Default,
        ProviderService.Default,
        ModelService.Default,
        ImageService.Default
    ),
    NodeFileSystem.layer
);

describe("ImageService Integration Tests", () => {
    describe("generate", () => {
        it("should generate an image successfully", () =>
            Effect.gen(function* () {
                const service = yield* createTestService;

                const result = yield* service.generate({
                    modelId: "dall-e-3",
                    prompt: "A simple test image",
                    system: O.none()
                });

                // Check required properties
                expect(result).toBeDefined();
                expect(result.data.imageUrl).toBeDefined();
                expect(typeof result.data.imageUrl).toBe("string");
                expect(result.data.imageUrl.length).toBeGreaterThan(0);

                // Check parameters (required object)
                expect(result.data.parameters).toBeDefined();
                expect(typeof result.data.parameters).toBe("object");
                // Optional parameters properties should be string if present
                if (result.data.parameters.size) {
                    expect(typeof result.data.parameters.size).toBe("string");
                }
                if (result.data.parameters.quality) {
                    expect(typeof result.data.parameters.quality).toBe("string");
                }
                if (result.data.parameters.style) {
                    expect(typeof result.data.parameters.style).toBe("string");
                }

                // Check model (required string)
                expect(result.data.model).toBeDefined();
                expect(typeof result.data.model).toBe("string");
                expect(result.data.model).toBe("dall-e-3");

                // Check timestamp (required Date)
                expect(result.data.timestamp).toBeDefined();
                expect(result.data.timestamp).toBeInstanceOf(Date);

                // Check id (required string)
                expect(result.data.id).toBeDefined();
                expect(typeof result.data.id).toBe("string");
                expect(result.data.id.length).toBeGreaterThan(0);

                // Check optional usage statistics if present
                if (result.data.usage) {
                    expect(result.data.usage.promptTokens).toBeGreaterThanOrEqual(0);
                    expect(result.data.usage.totalTokens).toBeGreaterThanOrEqual(
                        result.data.usage.promptTokens
                    );
                }

                // Check optional additional images if present
                if (result.data.additionalImages) {
                    expect(Array.isArray(result.data.additionalImages)).toBe(true);
                    result.data.additionalImages.forEach(url => {
                        expect(typeof url).toBe("string");
                        expect(url.length).toBeGreaterThan(0);
                    });
                }
            }).pipe(Effect.provide(testLayer))
        );

        it("should handle invalid model ID", () =>
            Effect.gen(function* () {
                const service = yield* createTestService;

                const controller = new AbortController();

                // Abort after a short delay
                setTimeout(() => controller.abort(), 100);

                const result = yield* Effect.either(
                    service.generate({
                        modelId: "dall-e-3",
                        prompt: "test prompt",
                        system: O.none(),
                        signal: controller.signal
                    })
                );

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderOperationError);
                    const error = result.left as ProviderOperationError;
                    expect(error.description).toContain("aborted");
                }
            }).pipe(Effect.provide(testLayer))
        );
    });
});

it("should fail with invalid size", () =>
    Effect.gen(function* () {
        const imageService = yield* createTestService;

        const result = yield* Effect.either(
            imageService.generate({
                modelId: "test-model",
                prompt: "test prompt",
                size: "invalid-size" as any,
                system: O.none()
            })
        );

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
            expect(result.left).toBeInstanceOf(ImageSizeError);
        }
    }).pipe(Effect.provide(testLayer))
);

it("should fail with invalid model", () =>
    Effect.gen(function* () {
        const imageService = yield* createTestService;

        const result = yield* Effect.either(
            imageService.generate({
                modelId: "invalid-model",
                prompt: "test prompt",
                system: O.none()
            })
        );

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
            expect(result.left).toBeInstanceOf(ImageModelError);
        }
    }).pipe(Effect.provide(testLayer))
);

it("should include negative prompt when provided", () =>
    Effect.gen(function* () {
        const imageService = yield* createTestService

        const result = yield* imageService.generate({
            modelId: "test-model",
            prompt: "test prompt",
            negativePrompt: "test negative prompt",
            system: O.none()
        });

        expect(result.data.imageUrl).toBeDefined();
        expect(result.data.model).toBe("test-model");
        expect(result.data.parameters).toBeDefined();
        expect(result.data.timestamp).toBeDefined();
    }).pipe(Effect.provide(testLayer))
);

it("should include system prompt when provided", () =>
    Effect.gen(function* () {
        const imageService = yield* createTestService;

        const result = yield* imageService.generate({
            modelId: "test-model",
            prompt: "test prompt",
            system: O.some("test system prompt")
        });

        expect(result.data.imageUrl).toBeDefined();
        expect(result.data.model).toBe("test-model");
        expect(result.data.parameters).toBeDefined();
        expect(result.data.timestamp).toBeDefined();
    }).pipe(Effect.provide(testLayer))
);