/**
 * @file Image Service implementation for AI image generation
 * @module services/pipeline/producers/image/service
 */
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { GenerateImageResult } from "@/services/ai/provider/types.js";
import { EffectiveInput } from "@/types.js";
import { Chunk, Effect, Option, Ref } from "effect";
import type { ImageGenerationOptions, ImageServiceApi } from "./api.js";
import { ImageGenerationError, ImageModelError, ImageSizeError } from "./errors.js";

/**
 * Supported image sizes
 */
export const ImageSizes = {
    SMALL: "256x256",
    MEDIUM: "512x512",
    LARGE: "1024x1024",
    WIDE: "1024x768",
    PORTRAIT: "768x1024"
} as const;

export type ImageSize = typeof ImageSizes[keyof typeof ImageSizes];

/**
 * Supported image quality levels
 */
export const ImageQualities = {
    STANDARD: "standard",
    HD: "hd"
} as const;

export type ImageQuality = typeof ImageQualities[keyof typeof ImageQualities];

/**
 * Supported image styles
 */
export const ImageStyles = {
    NATURAL: "natural",
    VIVID: "vivid"
} as const;

export type ImageStyle = typeof ImageStyles[keyof typeof ImageStyles];

/**
 * Image generation agent state
 */
export interface ImageAgentState {
    readonly generationCount: number
    readonly lastGeneration: Option.Option<GenerateImageResult>
    readonly lastUpdate: Option.Option<number>
    readonly generationHistory: ReadonlyArray<{
        readonly timestamp: number
        readonly modelId: string
        readonly size: string
        readonly promptLength: number
        readonly success: boolean
        readonly imageCount: number
    }>
}



/**
 * ImageService provides methods for generating images using AI providers.
 * Simplified implementation without AgentRuntime dependency.
 */
class ImageService extends Effect.Service<ImageServiceApi>()("ImageService", {
    effect: Effect.gen(function* () {
        // Get services directly
        const modelService = yield* ModelService;
        const providerService = yield* ProviderService;

        const initialState: ImageAgentState = {
            generationCount: 0,
            lastGeneration: Option.none(),
            lastUpdate: Option.none(),
            generationHistory: []
        };

        // Create internal state management
        const internalStateRef = yield* Ref.make<ImageAgentState>(initialState);

        yield* Effect.log("ImageService initialized");

        // Helper function to update internal state
        const updateState = (generation: {
            readonly timestamp: number
            readonly modelId: string
            readonly size: string
            readonly promptLength: number
            readonly success: boolean
            readonly imageCount: number
        }) => Effect.gen(function* () {
            const currentState = yield* Ref.get(internalStateRef);

            const updatedHistory = [
                ...currentState.generationHistory,
                generation
            ].slice(-20); // Keep last 20 generations

            const newState: ImageAgentState = {
                generationCount: currentState.generationCount + 1,
                lastGeneration: currentState.lastGeneration,
                lastUpdate: Option.some(Date.now()),
                generationHistory: updatedHistory
            };

            yield* Ref.set(internalStateRef, newState);

            yield* Effect.log("Updated image generation state", {
                oldCount: currentState.generationCount,
                newCount: newState.generationCount
            });
        });

        const service: ImageServiceApi = {
            /**
             * Generates images from the given prompt using the specified model
             */
            generate: (options: ImageGenerationOptions) => {
                return Effect.gen(function* () {
                    // Log start of image generation
                    yield* Effect.log("Starting image generation", {
                        modelId: options.modelId,
                        promptLength: options.prompt.length,
                        size: options.size
                    });



                    // Validate input
                    if (!options.prompt || options.prompt.trim().length === 0) {
                        yield* Effect.logError("No prompt provided");
                        return yield* Effect.fail(new ImageGenerationError({
                            description: "Prompt is required for image generation",
                            module: "ImageService",
                            method: "generate"
                        }));
                    }

                    // Get model ID or fail
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                        Effect.mapError(() => new ImageModelError({
                            description: "Model ID must be provided",
                            module: "ImageService",
                            method: "generate"
                        }))
                    );

                    // Validate image size
                    const validSizes = ["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"];
                    if (!options.size || !validSizes.includes(options.size)) {
                        yield* Effect.logError("Invalid image size", { size: options.size });
                        return yield* Effect.fail(new ImageSizeError({
                            description: `Invalid image size: ${options.size}. Valid sizes: ${validSizes.join(", ")}`,
                            module: "ImageService",
                            method: "generate"
                        }));
                    }

                    // Get provider for the model
                    const providerName = yield* modelService.getProviderName(modelId);
                    const providerClient = yield* providerService.getProviderClient(providerName);

                    // Prepare the final prompt with system context if provided
                    const systemPrompt = Option.getOrElse(options.system, () => "");
                    const finalPrompt = systemPrompt
                        ? `${systemPrompt}\n\n${options.prompt}`
                        : options.prompt;

                    // Call the real AI provider
                    const effectiveInput = new EffectiveInput(finalPrompt, Chunk.empty());
                    const providerResult = yield* providerClient.generateImage(
                        effectiveInput,
                        {
                            modelId,
                            size: options.size,
                            quality: options.quality,
                            style: options.style,
                            n: options.n || 1,
                        }
                    );

                    // Use providerResult.data directly as the result
                    const result = providerResult.data;

                    yield* Effect.log("Image generation completed successfully");

                    // Update agent state with generation results
                    yield* updateState({
                        timestamp: Date.now(),
                        modelId,
                        size: options.size,
                        promptLength: finalPrompt.length,
                        success: true,
                        imageCount: result.additionalImages ? 1 + result.additionalImages.length : 1
                    });

                    return yield* Effect.succeed({
                        data: {
                            imageUrl: result.imageUrl,
                            additionalImages: result.additionalImages,
                            model: result.model,
                            usage: result.usage,
                            finishReason: result.finishReason,
                            parameters: result.parameters,
                            timestamp: result.timestamp,
                            id: result.id
                        },
                        metadata: {}
                    });

                }).pipe(
                    Effect.withSpan("ImageService.generate"),
                    Effect.catchAll((error) => {
                        return Effect.gen(function* () {
                            yield* Effect.logError("Image generation failed", { error });

                            // Update state with failure
                            yield* updateState({
                                timestamp: Date.now(),
                                modelId: options.modelId || "unknown",
                                size: options.size || "unknown",
                                promptLength: options.prompt?.length || 0,
                                success: false,
                                imageCount: 0
                            });

                            return yield* Effect.fail(error);
                        });
                    })
                );
            },

            /**
             * Get the current agent state for monitoring/debugging
             */
            getAgentState: () => Ref.get(internalStateRef),

            /**
             * Terminate the service (no-op since we don't have external runtime)
             */
            terminate: () => Effect.succeed(void 0)
        };

        return service;
    }),
    dependencies: [ModelService.Default, ProviderService.Default]
}) { }

export default ImageService;
export { ImageService };
