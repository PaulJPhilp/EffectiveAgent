/**
 * @file Tests for ImageService
 * @module services/ai/producers/image/__tests__/service
 */

import { EffectiveInput } from '@/services/ai/input/service.js';
import { ModelService, type ModelServiceApi } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js";
import { Message } from "@effect/ai/AiInput";
import { describe, expect, it, vi } from "@effect/vitest";
import { Chunk, Effect, Layer, Option } from "effect";
import { ImageGenerationError, ImageModelError, ImageProviderError, ImageSizeError } from "../errors.js";
import { mockSpan } from "@/services/ai/test-utils/index.js";
import { type ImageGenerationOptions, ImageService, ImageSizes } from "../service.js";
import { ProviderClientApi, ProviderServiceApi } from '@/services/ai/provider/api.js';
import { PROVIDER_NAMES } from "@/services/ai/provider/provider-universe.js";
import { Provider, ProviderFile } from "@/services/ai/provider/schema.js";
import type { Model, ModelFile, Provider as ProviderType } from "@/services/ai/model/schema.js";
import type { LanguageModelV1 } from "@ai-sdk/provider";

// Mock provider client with minimal implementation
/**
 * Creates a mock provider client with minimal implementation.
 * @returns A mock provider client.
 */
function createMockProviderClient(): ProviderClientApi {
    return {
        generateImage: vi.fn().mockImplementation((input: EffectiveInput) => {
            // If input is an object with a 'prompt' property, record it for assertion
            (createMockProviderClient as any).lastPrompt = (input as any)?.prompt ?? input;
            return Effect.succeed({
                id: "test-image-123",
                model: "test-model",
                imageUrl: "https://example.com/test-image.jpg",
                timestamp: new Date(),
                parameters: {
                    size: "1024x1024",
                    quality: "standard",
                    style: "natural"
                }
            });
        }),
        generateText: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),
        generateObject: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),

        generateEmbeddings: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),
        generateSpeech: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),
        transcribe: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),
        getCapabilities: vi.fn().mockImplementation(() => new Set(["image-generation"])),
        getModels: vi.fn().mockImplementation(() => Effect.succeed([])),


        setVercelProvider: vi.fn().mockImplementation(() => Effect.succeed({ name: "mock-provider", provider: {}, capabilities: new Set() })),
        getProvider: vi.fn().mockImplementation(() => Effect.succeed({ name: "mock-provider", provider: {}, capabilities: new Set() }))
    };
}

/**
 * Creates a mock provider service with Effect-returning methods.
 * @returns A mock ProviderServiceApi implementation.
 */
function createMockProviderService(): ProviderServiceApi {
    const mockProvider = new Provider({
        name: PROVIDER_NAMES.includes("openai") ? "openai" : PROVIDER_NAMES[0],
        displayName: "OpenAI",
        type: "llm",
        apiKeyEnvVar: "OPENAI_API_KEY",
        baseUrl: "https://api.openai.com/v1"
        // rateLimit: undefined // only if needed by schema
    });
    const mockProviderFile = new ProviderFile({
        name: "providers",
        description: "Test providers",
        providers: [mockProvider]
    });
    return {
        load: Effect.succeed(mockProviderFile),
        getProviderClient: (_providerName: string) => Effect.succeed(createMockProviderClient())
    };
} // End createMockProviderService

/**
 * Creates a mock model service with Effect-returning methods.
 * @returns A mock ModelServiceApi implementation.
 */
/**
 * Minimal valid mock Model and ModelFile for ModelServiceApi mocks.
 */
const mockModel: Model = {
    id: "mock-model",
    name: "Mock Model",
    version: "0.1.0",
    provider: "openai" as ProviderType,
    modelName: "mock-model",
    capabilities: ["image-generation"] as any
};
const mockModelFile: ModelFile = {
    name: "mock-model-config",
    version: "0.1.0",
    models: [mockModel]
};

// --- Mock ModelService ---
function createMockModelService(): ModelServiceApi {
    return {
        load: () => Effect.succeed(mockModelFile),
        getProviderName: (_modelId: string) => Effect.succeed("openai"),
        findModelsByCapability: (_capability) => Effect.succeed([mockModel]),
        findModelsByCapabilities: (_capabilities) => Effect.succeed([mockModel]),
        getDefaultModelId: (_provider, _capability) => Effect.succeed("mock-model"),
        getModelsForProvider: (_provider) => Effect.succeed([] as LanguageModelV1[]),
        validateModel: (_modelId, _capabilities) => Effect.succeed(true)
    };
}

// Mock layers for dependencies
const mockProviderServiceLayer = Layer.succeed(ProviderService, createMockProviderService());
const mockModelServiceLayer = Layer.succeed(ModelService, createMockModelService());

// Compose layers for all dependencies
const composedLayer = Layer.merge(mockProviderServiceLayer, mockModelServiceLayer);

// Create test harness with composedLayer
const serviceHarness = createServiceTestHarness(
    ImageService,
    () => Effect.gen(function* () {
        const providerService = yield* ProviderService;
        const modelService = yield* ModelService;

        // Validate size function
        const validateSize = (size?: string) => {
            if (!size) {
                return Effect.succeed(ImageSizes.MEDIUM);
            }
            const supportedSizes = Object.values(ImageSizes);
            if (!supportedSizes.includes(size as any)) {
                return Effect.fail(new ImageSizeError({
                    description: `Invalid image size: ${size}`,
                    module: "ImageService",
                    method: "validateSize",
                    requestedSize: size,
                    supportedSizes
                }));
            }
            return Effect.succeed(size);
        };

        return {
            providerService,
            modelService,
            validateSize
        };
    })
);

// --- Test Cases ---
describe("ImageService", () => {
    it("should generate an image successfully", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ImageService;

            const result = yield* service.generate({
                modelId: "dall-e-3",
                prompt: "A mountain landscape",
                system: Option.none(),
                span: mockSpan  // Mock span for test
            });

            expect(result.imageUrl).toBe("https://example.com/test-image.jpg");
            expect(result.model).toBe("test-model");
            expect(result.parameters.size).toBe("1024x1024");

            return result;
        });

        await serviceHarness.runTest(
            effect.pipe(Effect.provide(composedLayer)),
            { layer: composedLayer }
        );
    });

    it("should fail when no model ID is provided", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ImageService;

            return yield* service.generate({
                prompt: "A mountain landscape",
                system: Option.none(),
                span: mockSpan
            });
        });

        await serviceHarness.expectError(
            effect.pipe(Effect.provide(composedLayer)),
            ImageModelError
        );
    });

    it("should fail with invalid image size", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ImageService;

            return yield* service.generate({
                modelId: "dall-e-3",
                prompt: "A mountain landscape",
                system: Option.none(),
                size: "invalid-size" as any,
                span: mockSpan
            });
        });

        await serviceHarness.expectError(effect.pipe(Effect.provide(composedLayer)), ImageSizeError);
    });

    it("should include negative prompt when provided", async () => {
        // Set up a spy on the generateImage method
        const promptSpy = vi.spyOn(createMockProviderClient(), "generateImage");

        const effect = Effect.gen(function* () {
            const service = yield* ImageService;

            return yield* service.generate({
                modelId: "dall-e-3",
                prompt: "A mountain landscape",
                negativePrompt: "blurry, distorted",
                system: Option.none(),
                span: mockSpan
            });
        });

        await serviceHarness.runTest(
            effect.pipe(Effect.provide(composedLayer)),
            { layer: composedLayer }
        );

        // Verify the negative prompt was included
        const calledInput = promptSpy.mock.calls[0]?.[0];
        const calledPrompt = (calledInput as any)?.prompt ?? calledInput;
        expect(calledPrompt).toContain("DO NOT INCLUDE: blurry, distorted");
    });

    it("should include system prompt when provided", async () => {
        // Set up a spy on the generateImage method
        const promptSpy = vi.spyOn(createMockProviderClient(), "generateImage");

        const effect = Effect.gen(function* () {
            const service = yield* ImageService;

            return yield* service.generate({
                modelId: "dall-e-3",
                prompt: "A mountain landscape",
                system: Option.some("System prompt"),
                span: mockSpan
            });
        });

        await serviceHarness.runTest(
            effect.pipe(Effect.provide(composedLayer)),
            { layer: composedLayer }
        );

        // Verify the system prompt was included
        const calledInput = promptSpy.mock.calls[0]?.[0];
        const calledPrompt = (calledInput as any)?.prompt ?? calledInput;
        expect(calledPrompt).toContain("System prompt");
    });

    it("should handle multiple images", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ImageService;

            const result = yield* service.generate({
                modelId: "dall-e-3",
                prompt: "A mountain landscape",
                system: Option.none(),
                n: 2,
                span: mockSpan
            });

            expect(result.additionalImages).toHaveLength(1);

            return result;
        });

        await serviceHarness.runTest(
            effect.pipe(Effect.provide(composedLayer)),
            { layer: composedLayer }
        );
    });
}); 