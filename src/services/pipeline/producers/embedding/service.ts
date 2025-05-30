/**
 * @file Embedding Agent implementation using AgentRuntime for AI embedding generation
 * @module services/pipeline/producers/embedding/service
 */

import { AgentRuntimeService, makeAgentRuntimeId } from "@/agent-runtime/index.js";
import { AgentActivity, AgentActivityType } from "@/agent-runtime/types.js";
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
 * Embedding generation commands
 */
interface GenerateEmbeddingCommand {
    readonly type: "GENERATE_EMBEDDING"
    readonly options: EmbeddingGenerationOptions
}

interface StateUpdateCommand {
    readonly type: "UPDATE_STATE"
    readonly generation: GenerateEmbeddingsResult
    readonly modelId: string
    readonly textLength: number
    readonly success: boolean
}

type EmbeddingActivityPayload = GenerateEmbeddingCommand | StateUpdateCommand

/**
 * EmbeddingService provides methods for generating embeddings using AI providers.
 * Now implemented as an Agent using AgentRuntime for state management and activity tracking.
 */
class EmbeddingService extends Effect.Service<EmbeddingServiceApi>()(
    "EmbeddingService",
    {
        effect: Effect.gen(function* () {
            // Get services
            const agentRuntimeService = yield* AgentRuntimeService;
            const modelService = yield* ModelService;
            const providerService = yield* ProviderService;

            const agentId = makeAgentRuntimeId("embedding-service-agent");

            const initialState: EmbeddingAgentState = {
                generationCount: 0,
                lastGeneration: Option.none(),
                lastUpdate: Option.none(),
                generationHistory: []
            };

            // Create the agent runtime
            const runtime = yield* agentRuntimeService.create(agentId, initialState);

            // Create internal state management
            const internalStateRef = yield* Ref.make<EmbeddingAgentState>(initialState);

            yield* Effect.log("EmbeddingService agent initialized");

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

                // Also update the AgentRuntime state for consistency
                const stateUpdateActivity: AgentActivity = {
                    id: `embedding-update-${Date.now()}`,
                    agentRuntimeId: agentId,
                    timestamp: Date.now(),
                    type: AgentActivityType.STATE_CHANGE,
                    payload: newState,
                    metadata: {},
                    sequence: 0
                };
                yield* runtime.send(stateUpdateActivity);

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

                        // Send command activity to agent
                        const activity: AgentActivity = {
                            id: `embedding-generate-${Date.now()}`,
                            agentRuntimeId: agentId,
                            timestamp: Date.now(),
                            type: AgentActivityType.COMMAND,
                            payload: { type: "GENERATE_EMBEDDING", options } satisfies GenerateEmbeddingCommand,
                            metadata: {},
                            sequence: 0
                        };

                        yield* runtime.send(activity);

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
                            modelId,
                            ...options.parameters
                        });

                        const result: GenerateEmbeddingsResult = {
                            embeddings: providerResult.embeddings,
                            usage: providerResult.usage,
                            model: modelId,
                            provider: providerName
                        };

                        yield* Effect.log("Embedding generation completed successfully");

                        // Update agent state with generation results
                        yield* updateState({
                            timestamp: Date.now(),
                            modelId,
                            textLength: options.text.length,
                            dimensions: providerResult.embeddings[0]?.length || 0,
                            success: true
                        });

                        return result;

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
                 * Get the runtime for direct access in tests
                 */
                getRuntime: () => runtime,

                /**
                 * Terminate the agent
                 */
                terminate: () => agentRuntimeService.terminate(agentId)
            };

            return service;
        }),
        dependencies: [AgentRuntimeService.Default, ModelService.Default, ProviderService.Default]
    }
) { }

export default EmbeddingService;
export { EmbeddingService };
