/**
 * @file Implements the EmbeddingService for generating vector embeddings from text.
 * @module services/ai/producers/embedding/service
 */
import ModelService, { ModelServiceApi } from "@/services/ai/model/service.js";
import * as Effect from "effect/Effect";
import type { Span } from "effect/Tracer";
import { EmbeddingInputError, EmbeddingModelError, EmbeddingProviderError } from "./errors.js";

/**
 * Options for embedding generation
 */
export interface EmbeddingGenerationOptions {
    /** The model ID to use */
    readonly modelId?: string;
    /** The text(s) to generate embeddings for */
    readonly input: string | string[];
    /** Tracing span for observability */
    readonly span: Span;
    /** Optional parameters for model behavior */
    readonly parameters?: {
        /** The dimensionality of the embeddings */
        dimensions?: number;
        /** Model-specific user identifier */
        user?: string;
        /** Encoding format */
        encoding?: string;
    };
}

/**
 * Result of the embedding generation
 */
export interface EmbeddingGenerationResult {
    /** The generated embeddings */
    readonly embeddings: ReadonlyArray<ReadonlyArray<number>>;
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
 * EmbeddingService interface for generating vector embeddings.
 */
import type { EmbeddingServiceApi } from "./api.js";
import ProviderService from "../../provider/service.js";

/**
 * EmbeddingService provides methods for generating vector embeddings using AI providers.
 */
export class EmbeddingService extends Effect.Service<EmbeddingServiceApi>()("EmbeddingService", {
    effect: Effect.gen(function* () {
        // Get services
        const providerService = yield* ProviderService;
        const modelService: ModelServiceApi = yield* ModelService;

        return {
            generate: (options: EmbeddingGenerationOptions) =>
                Effect.gen(function* () {
                    // Validate input
                    if (Array.isArray(options.input) && options.input.length === 0) {
                        return yield* Effect.fail(new EmbeddingInputError({
                            description: "Input array cannot be empty",
                            module: "EmbeddingService",
                            method: "generate"
                        }));
                    }

                    if (!Array.isArray(options.input) && options.input.trim() === "") {
                        return yield* Effect.fail(new EmbeddingInputError({
                            description: "Input text cannot be empty",
                            module: "EmbeddingService",
                            method: "generate"
                        }));
                    }

                    // Get model ID or fail
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                        Effect.mapError(() => new EmbeddingModelError({
                            description: "Model ID must be provided",
                            module: "EmbeddingService",
                            method: "generate"
                        }))
                    );

                    // Get provider name from model service
                    const providerName = yield* modelService.getProviderName(modelId).pipe(
                        Effect.mapError((error) => new EmbeddingProviderError({
                            description: "Failed to get provider name for model",
                            module: "EmbeddingService",
                            method: "generate",
                            cause: error
                        }))
                    );

                    // Get provider client
                    const providerClient = yield* providerService.getProviderClient(providerName).pipe(
                        Effect.mapError((error) => new EmbeddingProviderError({
                            description: "Failed to get provider client",
                            module: "EmbeddingService",
                            method: "generate",
                            cause: error,
                            providerName
                        }))
                    );

                    yield* Effect.annotateCurrentSpan("ai.provider.name", providerName);
                    yield* Effect.annotateCurrentSpan("ai.model.name", modelId);

                    // Get model from the provider
                    const model = yield* Effect.tryPromise({
                        try: async () => {
                            // Use the provider to get the embedding model
                            const models = await Effect.runPromise(
                                providerClient.getModels().pipe(
                                    Effect.provideService(ModelService, modelService)
                                )
                            );
                            const matchingModel = models.find((m: any) => m.modelId === modelId);
                            if (!matchingModel) {
                                throw new Error(`Model ${modelId} not found`);
                            }
                            return matchingModel;
                        },
                        catch: (error) => new EmbeddingModelError({
                            description: `Failed to get model ${modelId}`,
                            module: "EmbeddingService",
                            method: "generate",
                            cause: error
                        })
                    });

                    // Generate the embeddings using the provider's generateEmbeddings method
                    const resultResponse = yield* Effect.tryPromise({
                        try: async () => {
                            const inputArray: string[] = Array.isArray(options.input)
                                ? options.input
                                : [options.input];
                            return await Effect.runPromise(providerClient.generateEmbeddings(
                                inputArray,
                                {
                                    modelId: modelId,
                                    ...options.parameters
                                }
                            ));
                        },
                        catch: (error) => new EmbeddingProviderError({
                            description: "Failed to generate embeddings",
                            module: "EmbeddingService",
                            method: "generate",
                            cause: error
                        })
                    });

                    const result = resultResponse.data;

                    // Map the result to EmbeddingGenerationResult
                    return {
                        embeddings: result?.embeddings,
                        model: result?.model ?? modelId,
                        timestamp: result?.timestamp ? new Date(result.timestamp) : new Date(),
                        id: result?.id ?? "",
                        usage: result?.usage ? {
                            promptTokens: result.usage.promptTokens || 0,
                            completionTokens: result.usage.completionTokens || 0,
                            totalTokens: result.usage.totalTokens || 0
                        } : undefined
                    };
                }).pipe(
                    Effect.withSpan("EmbeddingService.generate")
                )
        };
    }),
    dependencies: [ModelService.Default, ProviderService.Default] as const
}) { }
