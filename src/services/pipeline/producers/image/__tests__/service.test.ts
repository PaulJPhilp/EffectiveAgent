/**
 * @file Integration tests for ImageService
 * @module services/pipeline/producers/image/__tests__/service
 */

import { ModelService } from "@/services/ai/model/service.js";
import { ProviderOperationError } from "@/services/ai/provider/errors.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
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

                expect(result).toBeDefined();
                expect(result.imageUrl).toBeDefined();
                expect(typeof result.imageUrl).toBe("string");
                expect(result.imageUrl.length).toBeGreaterThan(0);
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

        expect(result.imageUrl).toBeDefined();
        expect(result.model).toBe("test-model");
        expect(result.parameters).toBeDefined();
        expect(result.timestamp).toBeDefined();
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

        expect(result.imageUrl).toBeDefined();
        expect(result.model).toBe("test-model");
        expect(result.parameters).toBeDefined();
        expect(result.timestamp).toBeDefined();
    }).pipe(Effect.provide(testLayer))
);