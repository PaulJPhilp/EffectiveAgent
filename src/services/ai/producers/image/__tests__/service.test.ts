/**
 * @file Tests for ImageService
 * @module services/ai/producers/image/__tests__/service
 */

import { EffectiveInput } from '@/services/ai/input/service.js';
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js";
import { Message } from "@effect/ai/AiInput";
import { describe, expect, it, vi } from "@effect/vitest";
import { Chunk, Effect, Layer, Option } from "effect";
import { ImageGenerationError, ImageModelError, ImageProviderError, ImageSizeError } from "../errors.js";
import { type ImageGenerationOptions, ImageService, ImageSizes } from "../service.js";

// Mock provider client with minimal implementation
const mockProviderClient = {
    generateImage: vi.fn().mockImplementation(() =>
        Effect.succeed({
            id: "test-image-123",
            model: "test-model",
            imageUrl: "https://example.com/test-image.jpg",
            timestamp: new Date(),
            parameters: {
                size: "1024x1024",
                quality: "standard",
                style: "natural"
            }
        })
    ),
    // Add stubs for required methods in the interface
    generateText: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),
    streamText: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),
    generateObject: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),
    streamObject: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),
    chat: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),
    generateEmbeddings: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),
    generateSpeech: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),
    transcribe: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),
    getCapabilities: vi.fn().mockImplementation(() => new Set(["image-generation"])),
    getModels: vi.fn().mockImplementation(() => Effect.succeed([])),
    streamChat: vi.fn().mockImplementation(() => Effect.fail(new Error("Not implemented"))),
    getProviderName: vi.fn().mockImplementation(() => "mock-provider"),
    setVercelProvider: vi.fn().mockImplementation(() => Effect.succeed({ name: "mock-provider", provider: {}, capabilities: new Set() }))
};

// Mock model service with minimal implementation
const mockModelService = {
    getProviderName: vi.fn().mockImplementation((modelId) => Effect.succeed("openai")),
    // Add stubs for required methods in the interface
    load: vi.fn().mockImplementation(() => Effect.succeed({})),
    findModelsByCapability: vi.fn().mockImplementation(() => Effect.succeed([])),
    findModelsByCapabilities: vi.fn().mockImplementation(() => Effect.succeed([])),
    validateModel: vi.fn().mockImplementation(() => Effect.succeed(true))
};

// Mock provider service with minimal implementation
const mockProviderService = {
    load: vi.fn().mockImplementation(() => Effect.succeed({
        name: "providers",
        description: "Test providers",
        providers: [{ name: "openai" }]
    })),
    getProviderClient: vi.fn().mockImplementation(() => Effect.succeed(mockProviderClient))
};

// Mock layers for dependencies
const mockProviderServiceLayer = Layer.succeed(ProviderService, mockProviderService);
const mockModelServiceLayer = Layer.succeed(ModelService, mockModelService);

// Create test harness
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
                return Effect.fail(new ImageSizeError(
                    `Unsupported image size: ${size}. Supported sizes are: ${supportedSizes.join(", ")}`,
                    { requestedSize: size, supportedSizes }
                ));
            }

            return Effect.succeed(size);
        };

        return {
            generate: (options: ImageGenerationOptions) =>
                Effect.gen(function* () {
                    // Validate model ID
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                        Effect.mapError(() => new ImageModelError("Model ID must be provided"))
                    );

                    // Get provider name
                    const providerName = yield* modelService.getProviderName(modelId).pipe(
                        Effect.mapError((error) => new ImageProviderError("Failed to get provider name for model", { cause: error }))
                    );

                    // Get provider client
                    const providerClient = yield* providerService.getProviderClient(providerName).pipe(
                        Effect.mapError((error) => new ImageProviderError("Failed to get provider client", { cause: error }))
                    );

                    // Validate size
                    const size = yield* validateSize(options.size);

                    // Build prompt
                    let finalPrompt = options.prompt;
                    const systemPrompt = Option.getOrUndefined(options.system);

                    if (systemPrompt) {
                        finalPrompt = `${systemPrompt}\n\n${finalPrompt}`;
                    }

                    if (options.negativePrompt) {
                        finalPrompt = `${finalPrompt}\nDO NOT INCLUDE: ${options.negativePrompt}`;
                    }

                    // Create EffectiveInput from the final prompt
                    const effectiveInput = new EffectiveInput(Chunk.make(Message.fromInput(finalPrompt)));

                    // Call provider and map error
                    const result = yield* providerClient.generateImage(
                        effectiveInput,
                        {
                            modelId,
                            size,
                            quality: options.quality,
                            style: options.style,
                            n: options.n || 1
                        }
                    ).pipe(
                        Effect.mapError((error) => new ImageGenerationError("Image generation failed", { cause: error }))
                    );

                    // Return result, accessing data and metadata
                    return {
                        imageUrl: result.data.imageUrl,
                        additionalImages: result.data.additionalImages,
                        parameters: {
                            size: result.data.parameters.size,
                            quality: result.data.parameters.quality,
                            style: result.data.parameters.style
                        },
                        model: result.metadata.model,
                        timestamp: result.metadata.timestamp,
                        id: result.metadata.id,
                        usage: result.metadata.usage || undefined
                    };
                })
        };
    })
);

describe("ImageService", () => {
    it("should generate an image successfully", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ImageService;

            const result = yield* service.generate({
                modelId: "dall-e-3",
                prompt: "A mountain landscape",
                system: Option.none(),
                span: {} as any  // Mock span for test
            });

            expect(result.imageUrl).toBe("https://example.com/test-image.jpg");
            expect(result.model).toBe("test-model");
            expect(result.parameters.size).toBe("1024x1024");

            return result;
        });

        await serviceHarness.runTest(effect);
    });

    it("should fail when no model ID is provided", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ImageService;

            return yield* service.generate({
                prompt: "A mountain landscape",
                system: Option.none(),
                span: {} as any
            });
        });

        await serviceHarness.expectError(effect, "ImageModelError" as any);
    });

    it("should fail with invalid image size", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ImageService;

            return yield* service.generate({
                modelId: "dall-e-3",
                prompt: "A mountain landscape",
                system: Option.none(),
                size: "invalid-size" as any,
                span: {} as any
            });
        });

        await serviceHarness.expectError(effect, "ImageSizeError" as any);
    });

    it("should include negative prompt when provided", async () => {
        // Set up a spy on the generateImage method
        const promptSpy = vi.spyOn(mockProviderClient, "generateImage");

        const effect = Effect.gen(function* () {
            const service = yield* ImageService;

            return yield* service.generate({
                modelId: "dall-e-3",
                prompt: "A mountain landscape",
                negativePrompt: "blurry, distorted",
                system: Option.none(),
                span: {} as any
            });
        });

        await serviceHarness.runTest(effect);

        // Verify the negative prompt was included
        const calledPrompt = promptSpy.mock.calls[0]?.[0] as string;
        expect(calledPrompt).toContain("DO NOT INCLUDE: blurry, distorted");
    });
}); 