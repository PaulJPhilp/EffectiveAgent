/**
 * @file Object Service implementation for AI structured object generation
 * @module services/pipeline/producers/object/service
 */
import { ModelService } from "@services/ai/model/service";
import { ProviderService } from "@services/ai/provider/service";
import { ObjectGenerationError, ObjectInputError, ObjectModelError, ObjectSchemaError } from "@services/pipeline/producers/object/errors";
import { Chunk, Effect, Option, Ref, Schema as S } from "effect";
/**
 * ObjectService provides methods for generating structured objects using AI providers.
 * Simplified implementation without AgentRuntime dependency.
 */
export class ObjectService extends Effect.Service()("ObjectService", {
    effect: Effect.gen(function* () {
        // Get services directly
        const modelService = yield* ModelService;
        const providerService = yield* ProviderService;
        const initialState = {
            generationCount: 0,
            lastGeneration: Option.none(),
            lastUpdate: Option.none(),
            generationHistory: []
        };
        // Create internal state management
        const internalStateRef = yield* Ref.make(initialState);
        yield* Effect.log("ObjectService initialized");
        // Helper function to update internal state
        const updateState = (generation) => Effect.gen(function* () {
            const currentState = yield* Ref.get(internalStateRef);
            const updatedHistory = [
                ...currentState.generationHistory,
                generation
            ].slice(-20); // Keep last 20 generations
            const newState = {
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
        const service = {
            /**
             * Generates a structured object using AI providers based on a prompt and schema
             */
            generate: (options) => Effect.gen(function* () {
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
                const modelId = yield* Effect.fromNullable(options.modelId).pipe(Effect.mapError(() => new ObjectModelError({
                    description: "Model ID must be provided",
                    module: "ObjectService",
                    method: "generate"
                })));
                // Get provider for the model
                const providerName = yield* modelService.getProviderName(modelId);
                const providerClient = yield* providerService.getProviderClient(providerName);
                // Get schema name for tracking
                const schemaName = options.schema?.ast?.annotations?.title?.toString() ?? "unknown";
                // Call the real AI provider for object generation
                const providerResult = yield* providerClient.generateObject({ text: options.prompt, messages: Chunk.empty() }, {
                    modelId,
                    schema: options.schema,
                    parameters: {
                        temperature: options.parameters?.temperature,
                        topP: options.parameters?.topP,
                    }
                });
                // Validate the result against the schema
                const validatedObject = yield* S.decode(options.schema)(providerResult.data.object).pipe(Effect.mapError(error => new ObjectSchemaError({
                    description: "Generated object does not match the provided schema",
                    module: "ObjectService",
                    method: "generate",
                    cause: error
                })));
                const result = {
                    data: validatedObject,
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
            }).pipe(Effect.withSpan("ObjectService.generate"), Effect.catchAll((error) => {
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
            })).pipe(Effect.mapError((error) => {
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
            })),
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
}) {
}
