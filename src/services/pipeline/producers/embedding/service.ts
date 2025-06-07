/**
 * @file Embedding Service implementation for AI embedding generation
 * @module services/pipeline/producers/embedding/service
 */
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import type { GenerateEmbeddingsResult } from "@/services/ai/provider/types.js";
import { Effect, Option, Ref } from "effect";
import type { EmbeddingGenerationOptions, EmbeddingServiceApi } from "./api.js";
import { EmbeddingInputError, EmbeddingModelError } from "./errors.js";

/**
 * Embedding generation agent state
 */
export interface EmbeddingAgentState {
    readonly generationCount: number
    readonly lastGeneration: Option.Option<GenerateEmbeddingsResult>
    readonly lastUpdate: Option.Option<number>
    readonly generationHistory: ReadonlyArray<{
        readonly timestamp: number
        readonly modelId: string
        readonly textLength: number
        readonly dimensions: number
        readonly success: boolean
    }>
}



/**
 * EmbeddingService provides methods for generating embeddings using AI providers.
 * Simplified implementation without AgentRuntime dependency.
 */
class EmbeddingService extends Effect.Service<EmbeddingServiceApi>()(
    "EmbeddingService",
    {
        effect: Effect.gen(function* () {
            // Get services directly
            const modelService = yield* ModelService;
            const providerService = yield* ProviderService;

            const initialState: EmbeddingAgentState = {
                generationCount: 0,
                lastGeneration: Option.none(),
                lastUpdate: Option.none(),
                generationHistory: []
            };

            // Create internal state management
            const internalStateRef = yield* Ref.make<EmbeddingAgentState>(initialState);

            yield* Effect.log("EmbeddingService initialized");

            // Helper function to update internal state
            const updateState = (generation: {
                readonly timestamp: number
                readonly modelId: string
                readonly textLength: number
                readonly dimensions: number
                readonly success: boolean
            }) => Effect.gen(function* () {
                const currentState = yield* Ref.get(internalStateRef);

                const updatedHistory = [
                    ...currentState.generationHistory,
                    generation
                ].slice(-20); // Keep last 20 generations

                const newState: EmbeddingAgentState = {
                    generationCount: currentState.generationCount + 1,
                    lastGeneration: currentState.lastGeneration,
                    lastUpdate: Option.some(Date.now()),
                    generationHistory: updatedHistory
                };

                yield* Ref.set(internalStateRef, newState);

                yield* Effect.log("Updated embedding generation state", {
                    oldCount: currentState.generationCount,
                    newCount: newState.generationCount
                });
            });

            const service: EmbeddingServiceApi = {
                /**
                 * Generates embeddings for the given text using the specified model
                 */
                generate: (options: EmbeddingGenerationOptions) => {
                    return Effect.gen(function* () {
                        // Log start of embedding generation
                        yield* Effect.log("Starting embedding generation", {
                            modelId: options.modelId,
                            textLength: options.text.length
                        });



                        // Validate input
                        if (!options.text || options.text.trim().length === 0) {
                            yield* Effect.logError("No text provided");
                            return yield* Effect.fail(new EmbeddingInputError({
                                description: "Text is required for embedding generation",
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

                        // Get provider for the model
                        const providerName = yield* modelService.getProviderName(modelId);
                        const providerClient = yield* providerService.getProviderClient(providerName);

                        // Call the real AI provider
                        const providerResult = yield* providerClient.generateEmbeddings([options.text], {
                            modelId
                        });

                        const result: GenerateEmbeddingsResult = {
                            embeddings: providerResult.data.embeddings,
                            usage: providerResult.data.usage,
                            model: modelId,
                            dimensions: providerResult.data.embeddings[0]?.length ?? 0,
                            texts: [options.text],
                            parameters: {},
                            id: "",
                            timestamp: new Date(),
                            finishReason: "length"
                        };

                        yield* Effect.log("Embedding generation completed successfully");

                        // Update agent state with generation results
                        yield* updateState({
                            timestamp: Date.now(),
                            modelId,
                            textLength: options.text.length,
                            dimensions: providerResult.data.embeddings[0]?.length || 0,
                            success: true
                        });

                        return yield* Effect.succeed({
                            data: {
                                embeddings: result.embeddings,
                                model: result.model,
                                usage: result.usage
                            },
                            metadata: {
                                provider: providerName
                            }
                        });

                    }).pipe(
                        Effect.withSpan("EmbeddingService.generate"),
                        Effect.catchAll((error) => {
                            return Effect.gen(function* () {
                                yield* Effect.logError("Embedding generation failed", { error });

                                // Update state with failure
                                yield* updateState({
                                    timestamp: Date.now(),
                                    modelId: options.modelId || "unknown",
                                    textLength: options.text?.length || 0,
                                    dimensions: 0,
                                    success: false
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
        })
    }
) { }

export default EmbeddingService;
export { EmbeddingService };
