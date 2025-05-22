/**
 * @file Implements the ImageService for handling AI image generation.
 * @module services/ai/producers/image/service
 */
import { EffectiveError } from "@/errors.js";
import { ModelServiceApi } from "@/services/ai/index.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { GenerateImageResult } from "@/services/ai/provider/types.js";
import { EffectiveMessage, EffectiveResponse } from "@/types.js";

import { TextPart } from "@/schema.js";
import { EffectiveInput } from "@/types.js";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { Span } from "effect/Tracer";
import { ImageGenerationError, ImageModelError, ImageProviderError, ImageSizeError } from "./errors.js";
import { ImageGenerationOptions } from "./types.js";

/**
 * Result shape expected from the underlying provider client's generateImage method
 */
export type ProviderImageGenerationResult = EffectiveResponse<GenerateImageResult>;

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
 * ImageService interface for handling AI image generation
 */
export interface ImageServiceApi {
    readonly generate: (options: ImageGenerationOptions) => Effect.Effect<GenerateImageResult, EffectiveError>;
}

/**
 * ImageService provides methods for generating images using AI providers.
 */
export class ImageService extends Effect.Service<ImageServiceApi>()("ImageService", {
    effect: Effect.gen(function* () {
        // Get services
        const providerService = yield* ProviderService;
        const modelService: ModelServiceApi = yield* ModelService;

        // Validate that the size is supported
        const validateSize = (size?: string): Effect.Effect<string, ImageSizeError> => {
            if (!size) {
                return Effect.succeed(ImageSizes.MEDIUM); // Default size
            }

            const supportedSizes = Object.values(ImageSizes);
            if (!supportedSizes.includes(size as ImageSize)) {
                return Effect.fail(new ImageSizeError({
                    description: `Unsupported image size: ${size}. Supported sizes are: ${supportedSizes.join(", ")}`,
                    module: "ImageService",
                    method: "validateSize",
                    requestedSize: size,
                    supportedSizes
                }));
            }

            return Effect.succeed(size);
        };

        return {
            generate: (options: ImageGenerationOptions) =>
                Effect.gen(function* () {
                    // Get model ID or fail
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                        Effect.mapError(() => new ImageModelError({
                            description: "Model ID must be provided",
                            module: "ImageService",
                            method: "generate"
                        }))
                    );

                    // Get provider name from model service
                    const providerName = yield* modelService.getProviderName(modelId).pipe(
                        Effect.mapError((error) => new ImageProviderError({
                            description: "Failed to get provider name for model",
                            module: "ImageService",
                            method: "generate",
                            cause: error
                        }))
                    );

                    // Get provider client
                    const providerClient = yield* providerService.getProviderClient(providerName).pipe(
                        Effect.mapError((error) => new ImageProviderError({
                            description: "Failed to get provider client",
                            module: "ImageService",
                            method: "generate",
                            cause: error
                        }))
                    );

                    // Validate image size
                    const size = yield* validateSize(options.size);

                    // Prepare final prompt, including system and negative prompt if provided
                    let finalPrompt = options.prompt;
                    const systemPrompt = Option.getOrUndefined(options.system);

                    if (systemPrompt) {
                        finalPrompt = `${systemPrompt}\n\n${finalPrompt}`;
                    }

                    if (options.negativePrompt) {
                        finalPrompt = `${finalPrompt}\nDO NOT INCLUDE: ${options.negativePrompt}`;
                    }

                    yield* Effect.annotateCurrentSpan("ai.provider.name", providerName);
                    yield* Effect.annotateCurrentSpan("ai.model.name", modelId);
                    yield* Effect.annotateCurrentSpan("ai.image.size", size);

                    if (options.quality) {
                        yield* Effect.annotateCurrentSpan("ai.image.quality", options.quality);
                    }

                    if (options.style) {
                        yield* Effect.annotateCurrentSpan("ai.image.style", options.style);
                    }
                    // Create EffectiveInput from the final prompt
                    const effectiveInput = new EffectiveInput(
                        finalPrompt,
                        Chunk.make(new EffectiveMessage({
                            role: "user",
                            parts: Chunk.make(new TextPart({ _tag: "Text", content: finalPrompt }))
                        }))
                    );

                    // Generate the image using the provider's generateImage method
                    const result = yield* Effect.promise(
                        (): Promise<ProviderImageGenerationResult> => Effect.runPromise(providerClient.generateImage(
                            effectiveInput,
                            {
                                modelId,
                                size,
                                quality: options.quality,
                                style: options.style,
                                n: options.n || 1,
                                signal: options.signal,
                                parameters: {
                                    maxTokens: options.parameters?.maxTokens,
                                    temperature: options.parameters?.temperature,
                                    topP: options.parameters?.topP,
                                    topK: options.parameters?.topK,
                                    presencePenalty: options.parameters?.presencePenalty,
                                    frequencyPenalty: options.parameters?.frequencyPenalty,
                                    seed: options.parameters?.seed,
                                    stop: options.parameters?.stop
                                }
                            }
                        ))
                    ).pipe(
                        Effect.mapError((error) => new ImageGenerationError({
                            description: "Image generation failed",
                            module: "ImageService",
                            method: "generate",
                            cause: error
                        }))
                    );

                    // Map the result to ImageGenerationResult
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
                        usage: result.metadata.usage ? {
                            promptTokens: result.metadata.usage.promptTokens || 0,
                            totalTokens: result.metadata.usage.totalTokens || 0
                        } : undefined
                    };
                }).pipe(
                    Effect.withSpan("ImageService.generate")
                )
        };
    }),
    dependencies: [ModelService.Default, ProviderService.Default]
}) { }