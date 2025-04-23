/**
 * @file Implements the ObjectService for handling AI structured object generation.
 * @module services/ai/producers/object/service
 */

import { ModelService, type ModelServiceApi } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { AiError } from "@effect/ai/AiError";
import { JSONSchema, Layer, Schema as S } from "effect";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type { Span } from "effect/Tracer";
import { ObjectGenerationError, ObjectModelError, ObjectProviderError, ObjectSchemaError } from "./errors.js";

/**
 * Options for object generation
 */
export interface ObjectGenerationOptions<T> {
    /** The model ID to use */
    readonly modelId?: string;
    /** The text prompt to process */
    readonly prompt: string;
    /** The system prompt or instructions */
    readonly system: Option.Option<string>;
    /** Schema to validate and parse the result */
    readonly schema: S.Schema<T>;
    /** Tracing span for observability */
    readonly span: Span;
    /** Optional parameters for model behavior */
    readonly parameters?: {
        /** Maximum steps to take in generation */
        maxSteps?: number;
        /** Maximum retries on failure */
        maxRetries?: number;
        /** Temperature (0-2) */
        temperature?: number;
        /** Top-p sampling */
        topP?: number;
        /** Top-k sampling */
        topK?: number;
        /** Presence penalty */
        presencePenalty?: number;
        /** Frequency penalty */
        frequencyPenalty?: number;
        /** Random seed */
        seed?: number;
        /** Stop sequences */
        stop?: string[];
    };
}

/**
 * Result of the object generation
 */
export interface ObjectGenerationResult<T> {
    /** The generated object */
    readonly data: T;
    /** The model used */
    readonly model: string;
    /** The timestamp of the generation */
    readonly timestamp: Date;
    /** The ID of the response */
    readonly id: string;
    /** Optional usage statistics */
    readonly usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * ObjectService interface for handling AI structured object generation
 */
export interface ObjectServiceApi {
    readonly generate: <T>(options: ObjectGenerationOptions<T>) => Effect.Effect<ObjectGenerationResult<T>, AiError>;
}

/**
 * ObjectService provides methods for generating structured objects using AI providers.
 */
export class ObjectService extends Effect.Service<ObjectServiceApi>()("ObjectService", {
    effect: Effect.gen(function* () {
        // Get services
        const providerService = yield* ProviderService;
        const modelService: ModelServiceApi = yield* ModelService;

        return {
            generate: <T>(options: ObjectGenerationOptions<T>) =>
                Effect.gen(function* () {
                    // Get model ID or fail
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                        Effect.mapError(() => new ObjectModelError("Model ID must be provided"))
                    );

                    // Get provider name from model service
                    const providerName = yield* modelService.getProviderName(modelId).pipe(
                        Effect.mapError((error) => new ObjectProviderError("Failed to get provider name for model", { cause: error }))
                    );

                    // Get provider client
                    const providerClient = yield* providerService.getProviderClient(providerName).pipe(
                        Effect.mapError((error) => new ObjectProviderError("Failed to get provider client", { cause: error }))
                    );

                    // If system prompt is provided, prepend it to the prompt
                    let finalPrompt = options.prompt;
                    const systemPrompt = Option.getOrUndefined(options.system);
                    if (systemPrompt) {
                        finalPrompt = `${systemPrompt}\n\n${finalPrompt}`;
                    }

                    // Add schema details to the prompt
                    const schemaDescription = yield* Effect.try({
                        try: () => JSON.stringify(JSONSchema.make(options.schema), null, 2),
                        catch: error => new ObjectSchemaError("Failed to stringify schema", {
                            cause: error,
                            schema: options.schema
                        })
                    });

                    // Enhance prompt with schema information
                    finalPrompt = `${finalPrompt}\n\nPlease provide an object that conforms to the following schema:\n${schemaDescription}\n\nEnsure that all required properties are included and all values match the specified types.`;

                    yield* Effect.annotateCurrentSpan("ai.provider.name", providerName);
                    yield* Effect.annotateCurrentSpan("ai.model.name", modelId);

                    // Get model from the provider
                    const model = yield* Effect.tryPromise({
                        try: async () => {
                            // Use the provider to get the language model
                            const models = await Effect.runPromise(providerClient.getModels());
                            const matchingModel = models.find(m => m.modelId === modelId);
                            if (!matchingModel) {
                                throw new Error(`Model ${modelId} not found`);
                            }
                            return matchingModel;
                        },
                        catch: (error) => new ObjectModelError(`Failed to get model ${modelId}`, { cause: error })
                    });

                    // Generate the object using the provider's generateObject method
                    const result = yield* Effect.tryPromise({
                        try: async () => {
                            const result = await Effect.runPromise(providerClient.generateObject<unknown>({
                                model,
                                prompt: finalPrompt,
                                schema: options.schema,
                                ...options.parameters
                            }));
                            return result;
                        },
                        catch: (error) => new ObjectGenerationError("Object generation failed", { cause: error })
                    });

                    // Validate and parse the result with the schema
                    const parsedObject = yield* S.decode(options.schema)(result.object as any).pipe(
                        Effect.mapError(error => new ObjectSchemaError("Generated object does not match schema", {
                            cause: error,
                            schema: options.schema,
                            result: result.object,
                            validationErrors: Array.isArray(error) ? error : [error]
                        }))
                    );

                    // Map the result to ObjectGenerationResult
                    return {
                        data: parsedObject,
                        model: result.model,
                        timestamp: result.timestamp,
                        id: result.id,
                        usage: result.usage ? {
                            promptTokens: result.usage.promptTokens || 0,
                            completionTokens: result.usage.completionTokens || 0,
                            totalTokens: result.usage.totalTokens || 0
                        } : undefined
                    };
                }).pipe(
                    Effect.withSpan("ObjectService.generate")
                )
        };
    })
}) { }

/**
 * Default Layer for ObjectService
 */
export const ObjectServiceLive = Layer.effect(
    ObjectService,
    ObjectService
); 