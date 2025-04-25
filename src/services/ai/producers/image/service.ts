/**
 * @file Implements the ImageService for handling AI image generation.
 * @module services/ai/producers/image/service
 */

import { EffectiveInput } from '@/services/ai/input/service.js';
import { ModelService, type ModelServiceApi } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { AiError } from "@effect/ai/AiError";
import { Message } from "@effect/ai/AiInput";
import { Layer } from "effect";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type { Span } from "effect/Tracer";
import { ImageGenerationError, ImageModelError, ImageProviderError, ImageSizeError } from "./errors.js";

/**
 * Result shape expected from the underlying provider client's generateImage method
 */
export interface ProviderImageGenerationResult {
    readonly data: {
        readonly imageUrl: string;
        readonly additionalImages?: readonly string[];
        readonly parameters: {
            readonly size?: string;
            readonly quality?: string;
            readonly style?: string;
        };
    };
    readonly metadata: {
        readonly model: string;
        readonly timestamp: Date;
        readonly id: string;
        readonly usage?: {
            readonly promptTokens?: number;
            readonly totalTokens?: number;
        };
    };
}

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
 * Options for image generation
 */
export interface ImageGenerationOptions {
    /** The model ID to use */
    readonly modelId?: string;
    /** The text prompt to process */
    readonly prompt: string;
    /** Negative prompt to exclude from generation */
    readonly negativePrompt?: string;
    /** The system prompt or instructions */
    readonly system: Option.Option<string>;
    /** Image size to generate */
    readonly size?: ImageSize;
    /** Image quality level */
    readonly quality?: ImageQuality;
    /** Image style preference */
    readonly style?: ImageStyle;
    /** Number of images to generate */
    readonly n?: number;
    /** Tracing span for observability */
    readonly span: Span;
    /** Optional parameters for model behavior */
    readonly parameters?: {
        /** Temperature (0-2) */
        temperature?: number;
        /** Top-p sampling */
        topP?: number;
        /** Random seed for reproducibility */
        seed?: number;
    };
}

/**
 * Result of the image generation
 */
export interface ImageGenerationResult {
    /** The primary generated image URL */
    readonly imageUrl: string;
    /** Additional generated images if multiple were requested */
    readonly additionalImages?: string[];
    /** Generation parameters used */
    readonly parameters: {
        /** Size of the generated image */
        readonly size?: string;
        /** Quality level used */
        readonly quality?: string;
        /** Style setting used */
        readonly style?: string;
    };
    /** The model used */
    readonly model: string;
    /** The timestamp of the generation */
    readonly timestamp: Date;
    /** The ID of the response */
    readonly id: string;
    /** Optional usage statistics */
    readonly usage?: {
        promptTokens: number;
        totalTokens: number;
    };
}

/**
 * ImageService interface for handling AI image generation
 */
export interface ImageServiceApi {
    readonly generate: (options: ImageGenerationOptions) => Effect.Effect<ImageGenerationResult, AiError>;
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
                    // Get model ID or fail
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                        Effect.mapError(() => new ImageModelError("Model ID must be provided"))
                    );

                    // Get provider name from model service
                    const providerName = yield* modelService.getProviderName(modelId).pipe(
                        Effect.mapError((error) => new ImageProviderError("Failed to get provider name for model", { cause: error }))
                    );

                    // Get provider client
                    const providerClient = yield* providerService.getProviderClient(providerName).pipe(
                        Effect.mapError((error) => new ImageProviderError("Failed to get provider client", { cause: error }))
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
                    const effectiveInput = new EffectiveInput(Chunk.make(Message.fromInput(finalPrompt)));

                    // Generate the image using the provider's generateImage method
                    const result = yield* Effect.promise(
                        (): Promise<ProviderImageGenerationResult> => Effect.runPromise(providerClient.generateImage(
                            effectiveInput,
                            {
                                modelId,
                                size,
                                quality: options.quality,
                                style: options.style,
                                n: options.n || 1
                            }
                        ))
                    ).pipe(
                        Effect.mapError((error) => new ImageGenerationError("Image generation failed", { cause: error }))
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
    })
}) { }

/**
 * Default Layer for ImageService
 */
export const ImageServiceLive = Layer.effect(
    ImageService,
    ImageService
); 