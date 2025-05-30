/**
 * @file Object Agent implementation using AgentRuntime for AI structured object generation
 * @module services/pipeline/producers/object/service
 */

import { AgentRuntimeService, makeAgentRuntimeId } from "@/agent-runtime/index.js";
import { AgentActivity, AgentActivityType } from "@/agent-runtime/types.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import type { ObjectServiceApi } from "@/services/pipeline/producers/object/api.js";
import { ObjectGenerationError, ObjectInputError, ObjectModelError, ObjectSchemaError } from "@/services/pipeline/producers/object/errors.js";
import type { ObjectGenerationOptions } from "@/services/pipeline/producers/object/types.js";
import type { EffectiveResponse } from "@/types.js";
import { Chunk, Effect, Option, Ref, Schema as S } from "effect";

/**
 * Object generation agent state
 */
export interface ObjectAgentState {
    readonly generationCount: number
    readonly lastGeneration: Option.Option<any>
    readonly lastUpdate: Option.Option<number>
    readonly generationHistory: ReadonlyArray<{
        readonly timestamp: number
        readonly modelId: string
        readonly schemaName: string
        readonly promptLength: number
        readonly objectSize: number
        readonly success: boolean
    }>
}

/**
 * Object generation commands
 */
interface GenerateObjectCommand {
    readonly type: "GENERATE_OBJECT"
    readonly options: ObjectGenerationOptions<any>
}

interface StateUpdateCommand {
    readonly type: "UPDATE_STATE"
    readonly generation: any
    readonly modelId: string
    readonly schemaName: string
    readonly promptLength: number
    readonly success: boolean
}

type ObjectActivityPayload = GenerateObjectCommand | StateUpdateCommand

/**
 * ObjectService provides methods for generating structured objects using AI providers.
 * Now implemented as an Agent using AgentRuntime for state management and activity tracking.
 */
class ObjectService extends Effect.Service<ObjectServiceApi>()("ObjectService", {
    effect: Effect.gen(function* () {
        // Get services
        const agentRuntimeService = yield* AgentRuntimeService;
        const modelService = yield* ModelService;
        const providerService = yield* ProviderService;

        const agentId = makeAgentRuntimeId("object-service-agent");

        const initialState: ObjectAgentState = {
            generationCount: 0,
            lastGeneration: Option.none(),
            lastUpdate: Option.none(),
            generationHistory: []
        };

        // Create the agent runtime
        const runtime = yield* agentRuntimeService.create(agentId, initialState);

        // Create internal state management
        const internalStateRef = yield* Ref.make<ObjectAgentState>(initialState);

        yield* Effect.log("ObjectService agent initialized");

        // Helper function to update internal state
        const updateState = (generation: {
            readonly timestamp: number
            readonly modelId: string
            readonly schemaName: string
            readonly promptLength: number
            readonly objectSize: number
            readonly success: boolean
            readonly result?: any
        }) => Effect.gen(function* () {
            const currentState = yield* Ref.get(internalStateRef);

            const updatedHistory = [
                ...currentState.generationHistory,
                generation
            ].slice(-20); // Keep last 20 generations

            const newState: ObjectAgentState = {
                generationCount: currentState.generationCount + 1,
                lastGeneration: generation.success && generation.result ? Option.some(generation.result) : currentState.lastGeneration,
                lastUpdate: Option.some(Date.now()),
                generationHistory: updatedHistory
            };

            yield* Ref.set(internalStateRef, newState);

            // Also update the AgentRuntime state for consistency
            const stateUpdateActivity: AgentActivity = {
                id: `object-update-${Date.now()}`,
                agentRuntimeId: agentId,
                timestamp: Date.now(),
                type: AgentActivityType.STATE_CHANGE,
                payload: newState,
                metadata: {},
                sequence: 0
            };
            yield* runtime.send(stateUpdateActivity);

            yield* Effect.log("Updated object generation state", {
                oldCount: currentState.generationCount,
                newCount: newState.generationCount
            });
        });

        const service: ObjectServiceApi = {
            /**
             * Generates a structured object using AI providers based on a prompt and schema
             */
            generate: <T>(
                options: ObjectGenerationOptions<any>
            ): Effect.Effect<EffectiveResponse<T>, ObjectGenerationError | ObjectInputError | ObjectModelError | ObjectSchemaError> =>
                Effect.gen(function* () {
                    // Log start of object generation
                    yield* Effect.log("Starting object generation", {
                        modelId: options.modelId,
                        promptLength: options.prompt?.length ?? 0,
                        hasSchema: !!options.schema
                    });

                    // Send command activity to agent
                    const activity: AgentActivity = {
                        id: `object-generate-${Date.now()}`,
                        agentRuntimeId: agentId,
                        timestamp: Date.now(),
                        type: AgentActivityType.COMMAND,
                        payload: { type: "GENERATE_OBJECT", options } satisfies GenerateObjectCommand,
                        metadata: {},
                        sequence: 0
                    };

                    yield* runtime.send(activity);

                    // Validate input
                    if (!options.prompt || options.prompt.trim().length === 0) {
                        yield* Effect.logError("No prompt provided");
                        return yield* Effect.fail(new ObjectInputError({
                            description: "Prompt is required for object generation",
                            module: "ObjectService",
                            method: "generate"
                        }));
                    }

                    if (!options.schema) {
                        yield* Effect.logError("No schema provided");
                        return yield* Effect.fail(new ObjectSchemaError({
                            description: "Schema is required for object generation",
                            module: "ObjectService",
                            method: "generate"
                        }));
                    }

                    // Get model ID or fail
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                        Effect.mapError(() => new ObjectModelError({
                            description: "Model ID must be provided",
                            module: "ObjectService",
                            method: "generate"
                        }))
                    );

                    // Get provider for the model
                    const providerName = yield* modelService.getProviderName(modelId);
                    const providerClient = yield* providerService.getProviderClient(providerName);

                    // Get schema name for tracking
                    const schemaName = options.schema._ast?.annotations?.title?.toString() ?? "unknown";

                    // Call the real AI provider for object generation
                    const providerResult = yield* providerClient.generateObject(
                        { text: options.prompt, messages: Chunk.empty() },
                        {
                            modelId,
                            schema: options.schema,
                            parameters: {
                                temperature: options.parameters?.temperature,
                                topP: options.parameters?.topP,
                            }
                        }
                    );

                    // Validate the result against the schema
                    const validatedObject = yield* S.decode(options.schema)(providerResult.data.object).pipe(
                        Effect.mapError(error => new ObjectSchemaError({
                            description: "Generated object does not match the provided schema",
                            module: "ObjectService",
                            method: "generate",
                            cause: error
                        }))
                    );

                    const result: EffectiveResponse<T> = {
                        data: validatedObject as T,
                        metadata: {
                            model: modelId,
                            provider: providerName,
                            schema: schemaName,
                            promptLength: options.prompt.length,
                            objectSize: JSON.stringify(validatedObject).length,
                            usage: providerResult.usage,
                            finishReason: providerResult.finishReason
                        }
                    };

                    yield* Effect.log("Object generation completed successfully");

                    // Update agent state with generation results
                    yield* updateState({
                        timestamp: Date.now(),
                        modelId,
                        schemaName,
                        promptLength: options.prompt.length,
                        objectSize: JSON.stringify(validatedObject).length,
                        success: true,
                        result: validatedObject
                    });

                    return result;

                }).pipe(
                    Effect.withSpan("ObjectService.generate"),
                    Effect.catchAll((error) => {
                        return Effect.gen(function* () {
                            yield* Effect.logError("Object generation failed", { error });

                            // Update state with failure
                            yield* updateState({
                                timestamp: Date.now(),
                                modelId: options.modelId ?? "unknown",
                                schemaName: options.schema?._ast?.annotations?.title?.toString() ?? "unknown",
                                promptLength: options.prompt?.length ?? 0,
                                objectSize: 0,
                                success: false
                            });

                            return yield* Effect.fail(error);
                        });
                    })
                ).pipe(
                    Effect.mapError((error) => {
                        // Convert any remaining Error types to expected error types
                        if (error instanceof ObjectGenerationError ||
                            error instanceof ObjectInputError ||
                            error instanceof ObjectModelError ||
                            error instanceof ObjectSchemaError) {
                            return error;
                        }
                        // Convert generic errors to ObjectGenerationError
                        return new ObjectGenerationError({
                            description: error instanceof Error ? error.message : "Unknown error during object generation",
                            module: "ObjectService",
                            method: "generate",
                            cause: error
                        });
                    })
                ) as Effect.Effect<EffectiveResponse<T>, ObjectGenerationError | ObjectInputError | ObjectModelError | ObjectSchemaError, never>,

            /**
             * Get the current agent state for monitoring/debugging
             */
            getAgentState: () => Ref.get(internalStateRef),

            /**
             * Get the runtime for direct access in tests
             */
            getRuntime: () => ({
                ...runtime,
                state: internalStateRef
            }),

            /**
             * Terminate the agent
             */
            terminate: () => agentRuntimeService.terminate(agentId)
        };

        return service;
    }),
    dependencies: [AgentRuntimeService.Default, ModelService.Default, ProviderService.Default]
}) { }

export default ObjectService;
export { ObjectService };
