/**
 * @file Object Service implementation for AI structured object generation
 * @module services/pipeline/producers/object/service
 */

import { generateObjectWithModel } from "@effective-agent/ai-sdk";
import { Chunk, Effect, Option, Ref, Schema as S } from "effect";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import type { EffectiveResponse } from "@/types.js";
import type { ObjectServiceApi } from "./api.js";
import { ObjectGenerationError, ObjectInputError, ObjectModelError, ObjectSchemaError } from "./errors.js";
import type { ObjectGenerationOptions } from "./types.js";

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
 * ObjectService provides methods for generating structured objects using AI providers.
 * Simplified implementation without AgentRuntime dependency.
 */
export class ObjectService extends Effect.Service<ObjectServiceApi<S.Schema<any, any>, never>>()("ObjectService", {
    effect: Effect.gen(function* () {
        // Get services directly
        const modelService = yield* ModelService;
        const providerService = yield* ProviderService;

        const initialState: ObjectAgentState = {
            generationCount: 0,
            lastGeneration: Option.none(),
            lastUpdate: Option.none(),
            generationHistory: []
        };

        // Create internal state management
        const internalStateRef = yield* Ref.make<ObjectAgentState>(initialState);

        yield* Effect.log("ObjectService initialized");

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

            yield* Effect.log("Updated object generation state", {
                oldCount: currentState.generationCount,
                newCount: newState.generationCount
            });
        });

        const service: ObjectServiceApi = {
            /**
             * Generates a structured object using AI providers based on a prompt and schema
             */
            generate: <T, S extends S.Schema<T, any>>(
                options: ObjectGenerationOptions<S>
            ): Effect.Effect<EffectiveResponse<T>, ObjectGenerationError | ObjectInputError | ObjectModelError | ObjectSchemaError> =>
                Effect.gen(function* () {
                    // Log start of object generation
                    yield* Effect.log("Starting object generation", {
                        modelId: options.modelId,
                        promptLength: options.prompt?.length ?? 0,
                        hasSchema: !!options.schema
                    });



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
                    const languageModel = yield* providerService.getAiSdkLanguageModel(providerName, modelId);

                    // Get schema name for tracking
                    const schemaName = options.schema?.ast?.annotations?.title?.toString() ?? "unknown";

                    // Call ai-sdk operation directly
                    const aiSdkResult = yield* generateObjectWithModel(languageModel, {
                        text: options.prompt,
                        messages: Chunk.empty()
                    }, options.schema, {
                        parameters: {
                            temperature: options.parameters?.temperature,
                            topP: options.parameters?.topP,
                        }
                    });

                    // Validate the result against the schema
                    const validatedObject = yield* S.decode(options.schema)(aiSdkResult.data.object).pipe(
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
                            usage: aiSdkResult.data.usage,
                            finishReason: aiSdkResult.data.finishReason
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
                                schemaName: options.schema?.ast?.annotations?.title?.toString() ?? "unknown",
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
            getRuntime: () => Effect.succeed({
                state: internalStateRef
            }),

            /**
             * Terminate the service (no-op since we don't have external runtime)
             */
            terminate: () => Effect.succeed(void 0)
        };

        return service;
    })
}) { }