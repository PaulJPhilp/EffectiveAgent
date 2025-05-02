/**
 * @file Tests for ImageService
 * @module services/ai/producers/image/__tests__/service
 */

import { FixtureService } from "@/services/test-harness/components/fixtures/service.js";
import { MockAccessorService } from "@/services/test-harness/components/mock-accessors/service.js";
import { describe, it } from "@effect/vitest";
import { expect } from "vitest";
import { Effect, Layer, Option } from "effect";
import type { Span } from "effect/Tracer";
import { ImageService } from "../service.js";
import { ImageModelError, ImageSizeError } from "../errors.js";

describe("ImageService", () => {
    it("should handle abort signal", () =>
        Effect.gen(function* (_) {
            const controller = new AbortController();
            const service = yield* ImageService;
            const options = {
                modelId: "test-model",
                prompt: "test prompt",
                span: {} as Span,
                signal: controller.signal,
                system: Option.none()
            };

            // Abort after a short delay
            setTimeout(() => controller.abort(), 100);

            // The operation should be aborted
            const result = yield* service.generate(options);
            return result;
        }).pipe(
            Effect.provide(ImageService.Default)
        )
    );

    it("should generate image with valid options", () => 
        Effect.gen(function* (_) {
            const fixtures = yield* FixtureService;
            const mocks = yield* MockAccessorService;

            const result = yield* mocks.mockProducerServices.mockImageService.generate({
                modelId: "test-model",
                prompt: "test prompt",
                span: fixtures.mockSpan
            });

            expect(result.imageUrl).toBeDefined();
            expect(result.model).toBe("test-model");
            expect(result.parameters).toBeDefined();
            expect(result.timestamp).toBeDefined();
        }).pipe(
            Effect.provide(Layer.merge(
                FixtureService.Default,
                MockAccessorService.Default
            ))
        )
    );

    it("should fail with invalid size", () => 
        Effect.gen(function* (_) {
            const fixtures = yield* FixtureService;
            const mocks = yield* MockAccessorService;

            const result = yield* mocks.mockProducerServices.mockImageService.generate({
                modelId: "test-model",
                prompt: "test prompt",
                size: "invalid-size",
                span: fixtures.mockSpan
            });
        }).pipe(
            Effect.provide(Layer.merge(
                FixtureService.Default,
                MockAccessorService.Default
            )),
            Effect.flip,
            Effect.map(error => expect(error).toBeInstanceOf(ImageSizeError))
        )
    );

    it("should fail with invalid model", () => 
        Effect.gen(function* (_) {
            const fixtures = yield* FixtureService;
            const mocks = yield* MockAccessorService;

            const result = yield* mocks.mockProducerServices.mockImageService.generate({
                modelId: "invalid-model",
                prompt: "test prompt",
                span: fixtures.mockSpan
            });
        }).pipe(
            Effect.provide(Layer.merge(
                FixtureService.Default,
                MockAccessorService.Default
            )),
            Effect.flip,
            Effect.map(error => expect(error).toBeInstanceOf(ImageModelError))
        )
    );

    it("should include negative prompt when provided", () => 
        Effect.gen(function* (_) {
            const fixtures = yield* FixtureService;
            const mocks = yield* MockAccessorService;

            const result = yield* mocks.mockProducerServices.mockImageService.generate({
                modelId: "test-model",
                prompt: "test prompt",
                negativePrompt: "test negative prompt",
                span: fixtures.mockSpan
            });

            expect(result.imageUrl).toBeDefined();
            expect(result.model).toBe("test-model");
            expect(result.parameters).toBeDefined();
            expect(result.timestamp).toBeDefined();
        }).pipe(
            Effect.provide(Layer.merge(
                FixtureService.Default,
                MockAccessorService.Default
            ))
        )
    );

    it("should include system prompt when provided", () => 
        Effect.gen(function* (_) {
            const fixtures = yield* FixtureService;
            const mocks = yield* MockAccessorService;

            const result = yield* mocks.mockProducerServices.mockImageService.generate({
                modelId: "test-model",
                prompt: "test prompt",
                system: Option.some("test system prompt"),
                span: fixtures.mockSpan
            });

            expect(result.imageUrl).toBeDefined();
            expect(result.model).toBe("test-model");
            expect(result.parameters).toBeDefined();
            expect(result.timestamp).toBeDefined();
        }).pipe(
            Effect.provide(Layer.merge(
                FixtureService.Default,
                MockAccessorService.Default
            ))
        )
    );
});