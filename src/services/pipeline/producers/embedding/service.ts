import { ModelService } from "@/services/ai/model/service.js"
import { ProviderService } from "@/services/ai/provider/service.js"
import { Effect } from "effect"
import type { Span } from "effect/Tracer"
import type { EmbeddingGenerationOptions, EmbeddingServiceApi } from "./api.js"
import { EmbeddingInputError } from "./errors.js"
/**
 * @file Implements the EmbeddingService for generating vector embeddings from text.
 * @module services/ai/producers/embedding/service
 */

/**
 * Options for generating embeddings
 */
interface EmbeddingOptions {
    /** Model ID to use for generating embeddings */
    modelId?: string;
    /** Input text or array of texts to generate embeddings for */
    input: string | string[];
    /** Span for tracing */
    span?: Span;
}

/**
 * Result of embedding generation
 */
interface EmbeddingGenerationResult {
    /** Generated embeddings */
    embeddings: number[][];
    /** Model used for generation */
    model: string;
    /** Timestamp of generation */
    timestamp: Date;
    /** Unique identifier for this generation */
    id: string;
    /** Usage statistics if available */
    usage?: {
        promptTokens: number;
        totalTokens: number;
    };
}

/**
 * Implementation of the EmbeddingService using Effect.Service pattern.
 */
export class EmbeddingService extends Effect.Service<EmbeddingServiceApi>()(
    "EmbeddingService",
    {
        effect: Effect.gen(function* () {
            const modelService = yield* ModelService;
            const providerService = yield* ProviderService;

            return {
                generate: (options: EmbeddingGenerationOptions) => Effect.gen(function* () {
                    // Validate input
                    if (!options.text || options.text.trim() === "") {
                        return yield* Effect.fail(new EmbeddingInputError({
                            description: "Text input cannot be empty",
                            module: "EmbeddingService",
                            method: "generate"
                        }));
                    }

                    // Get provider for model
                    const providerName = yield* modelService.getProviderName(options.modelId);

                    // Get provider client
                    const providerClient = yield* providerService.getProviderClient(providerName);

                    // Generate embeddings
                    const result = yield* providerClient.generateEmbeddings([options.text], {
                        modelId: options.modelId,
                        ...options.parameters
                    });

                    return result.data;
                })
            };
        }),
        dependencies: [ModelService, ProviderService]
    }
) { }
